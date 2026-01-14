-- Migration: Agent Credentials Table
-- Purpose: Store API keys for external agents/MCP servers
-- Created: 2026-01-14

-- Create agent_credentials table
CREATE TABLE IF NOT EXISTS agent_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- API Key (hashed for security)
  api_key_hash TEXT NOT NULL UNIQUE,
  api_key_prefix TEXT NOT NULL, -- First 8 chars for identification (e.g., "sk_live_")
  
  -- Agent metadata
  agent_name TEXT NOT NULL,
  agent_description TEXT,
  
  -- Permissions
  allowed_endpoints TEXT[] DEFAULT ARRAY['/api/agents/query', '/api/agents/search']::TEXT[],
  max_requests_per_day INTEGER DEFAULT 1000,
  
  -- Usage tracking
  total_requests INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT
);

-- Create indexes
CREATE INDEX idx_agent_credentials_api_key_hash ON agent_credentials(api_key_hash);
CREATE INDEX idx_agent_credentials_active ON agent_credentials(is_active) WHERE is_active = true;
CREATE INDEX idx_agent_credentials_created_at ON agent_credentials(created_at DESC);

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS agent_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key
  credential_id UUID REFERENCES agent_credentials(id) ON DELETE CASCADE,
  
  -- Request details
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  
  -- Request metadata
  query TEXT,
  response_time_ms INTEGER,
  status_code INTEGER,
  
  -- Rate limiting
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for usage tracking
CREATE INDEX idx_agent_api_usage_credential_id ON agent_api_usage(credential_id);
CREATE INDEX idx_agent_api_usage_created_at ON agent_api_usage(created_at DESC);
CREATE INDEX idx_agent_api_usage_endpoint ON agent_api_usage(endpoint);

-- Create function to update total_requests counter
CREATE OR REPLACE FUNCTION increment_agent_requests()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agent_credentials
  SET 
    total_requests = total_requests + 1,
    last_used_at = NEW.created_at
  WHERE id = NEW.credential_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_increment_agent_requests
  AFTER INSERT ON agent_api_usage
  FOR EACH ROW
  EXECUTE FUNCTION increment_agent_requests();

-- Add RLS (Row Level Security) policies
ALTER TABLE agent_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_api_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access
CREATE POLICY "Service role can manage agent credentials"
  ON agent_credentials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage agent usage"
  ON agent_api_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE agent_credentials IS 'API keys for external agents/MCP servers';
COMMENT ON TABLE agent_api_usage IS 'Usage tracking for agent API calls';
COMMENT ON COLUMN agent_credentials.api_key_hash IS 'SHA-256 hash of the API key';
COMMENT ON COLUMN agent_credentials.api_key_prefix IS 'First 8 characters for identification';
COMMENT ON COLUMN agent_credentials.allowed_endpoints IS 'List of permitted API endpoints';
COMMENT ON COLUMN agent_credentials.max_requests_per_day IS 'Daily rate limit';
