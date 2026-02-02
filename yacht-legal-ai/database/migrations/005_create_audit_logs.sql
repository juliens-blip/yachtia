-- Migration 005: Create audit_logs table (RGPD Compliance)
-- Description: Table pour les logs d'audit conformité RGPD (rétention 2 ans)
-- Date: 2026-01-12

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL CHECK (action IN (
    'upload', 'view', 'search', 'delete', 'chat', 'download', 'consent'
  )),
  user_id UUID,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent VARCHAR(500),
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for RGPD compliance queries
CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);

-- Auto-delete old logs after 2 years (RGPD retention policy)
CREATE OR REPLACE FUNCTION delete_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE audit_logs IS 'RGPD compliance audit trail (2 years retention)';
COMMENT ON COLUMN audit_logs.action IS 'Action type: upload, view, search, delete, chat, download, consent';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context (query text, response time, chunks used, etc.)';
COMMENT ON FUNCTION delete_old_audit_logs IS 'Auto-delete logs older than 2 years (RGPD compliance). Execute manually or via cron job.';

-- Note: Pour exécuter la fonction de nettoyage automatique:
-- Option 1: Via cron job externe qui appelle: SELECT delete_old_audit_logs();
-- Option 2: Via Supabase Edge Function scheduled (si disponible)
