/**
 * Agent Authentication Middleware
 * 
 * Validates API keys for external agents/MCP servers
 * Handles rate limiting and usage tracking
 */

import { createHash, randomBytes as cryptoRandomBytes } from 'crypto'
import { supabaseAdmin } from './supabase'

export interface AgentCredential {
  id: string
  agentName: string
  allowedEndpoints: string[]
  maxRequestsPerDay: number
  totalRequests: number
  isActive: boolean
}

export interface AuthResult {
  success: boolean
  credential?: AgentCredential
  error?: string
}

/**
 * Hash API key with SHA-256
 */
function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

/**
 * Validate API key and return credential info
 */
export async function validateApiKey(apiKey: string): Promise<AuthResult> {
  try {
    // Basic format validation
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 32) {
      return { success: false, error: 'Invalid API key format' }
    }

    // Hash the provided key
    const keyHash = hashApiKey(apiKey)

    // Look up credential
    const { data, error } = await supabaseAdmin
      .from('agent_credentials')
      .select('*')
      .eq('api_key_hash', keyHash)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return { success: false, error: 'Invalid or inactive API key' }
    }

    // Check if revoked
    if (data.revoked_at) {
      return { success: false, error: 'API key has been revoked' }
    }

    return {
      success: true,
      credential: {
        id: data.id,
        agentName: data.agent_name,
        allowedEndpoints: data.allowed_endpoints || [],
        maxRequestsPerDay: data.max_requests_per_day || 1000,
        totalRequests: data.total_requests || 0,
        isActive: data.is_active
      }
    }
  } catch (error) {
    console.error('API key validation error:', error)
    return { success: false, error: 'Authentication failed' }
  }
}

/**
 * Check if endpoint is allowed for this credential
 */
export function isEndpointAllowed(credential: AgentCredential, endpoint: string): boolean {
  return credential.allowedEndpoints.includes(endpoint) || 
         credential.allowedEndpoints.includes('*')
}

export interface RateLimitResult {
  allowed: boolean
  error?: boolean
  remaining?: number
}

/**
 * Check daily rate limit
 * Returns { allowed, error, remaining } instead of boolean
 * to distinguish between "rate limited" and "infrastructure error"
 */
export async function checkRateLimit(credentialId: string, maxRequestsPerDay: number): Promise<RateLimitResult> {
  try {
    // Count requests in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { count, error } = await supabaseAdmin
      .from('agent_api_usage')
      .select('id', { count: 'exact', head: true })
      .eq('credential_id', credentialId)
      .gte('created_at', oneDayAgo)

    if (error) {
      console.error('Rate limit check error:', error)
      // Return error flag - don't pretend it's a rate limit violation
      return { allowed: false, error: true }
    }

    const currentCount = count || 0
    return {
      allowed: currentCount < maxRequestsPerDay,
      remaining: Math.max(0, maxRequestsPerDay - currentCount)
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    return { allowed: false, error: true }
  }
}

/**
 * Log API usage
 */
export async function logAgentUsage(params: {
  credentialId: string
  endpoint: string
  method: string
  query?: string
  responseTimeMs: number
  statusCode: number
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  try {
    await supabaseAdmin
      .from('agent_api_usage')
      .insert({
        credential_id: params.credentialId,
        endpoint: params.endpoint,
        method: params.method,
        query: params.query,
        response_time_ms: params.responseTimeMs,
        status_code: params.statusCode,
        ip_address: params.ipAddress,
        user_agent: params.userAgent
      })
  } catch (error) {
    console.error('Failed to log agent usage:', error)
  }
}

/**
 * Generate new API key (for admin use)
 * Uses crypto.randomBytes for cryptographically secure generation (P2 security fix)
 */
export function generateApiKey(prefix: string = 'sk_live'): string {
  // Use crypto.randomBytes instead of Math.random for security
  const secureRandomHex = cryptoRandomBytes(16).toString('hex')

  return `${prefix}_${secureRandomHex}`
}

/**
 * Create new agent credential (for admin use)
 */
export async function createAgentCredential(params: {
  agentName: string
  agentDescription?: string
  allowedEndpoints?: string[]
  maxRequestsPerDay?: number
  createdBy?: string
}): Promise<{ apiKey: string; credentialId: string } | null> {
  try {
    // Generate API key
    const apiKey = generateApiKey()
    const apiKeyHash = hashApiKey(apiKey)
    const apiKeyPrefix = apiKey.substring(0, 15)

    // Insert credential
    const { data, error } = await supabaseAdmin
      .from('agent_credentials')
      .insert({
        api_key_hash: apiKeyHash,
        api_key_prefix: apiKeyPrefix,
        agent_name: params.agentName,
        agent_description: params.agentDescription,
        allowed_endpoints: params.allowedEndpoints || ['/api/agents/query', '/api/agents/search'],
        max_requests_per_day: params.maxRequestsPerDay || 1000,
        created_by: params.createdBy
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error('Failed to create credential:', error)
      return null
    }

    return {
      apiKey, // Return plain key ONCE (never stored)
      credentialId: data.id
    }
  } catch (error) {
    console.error('Create credential error:', error)
    return null
  }
}

/**
 * Revoke API key (for admin use)
 */
export async function revokeApiKey(credentialId: string, reason?: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('agent_credentials')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_reason: reason
      })
      .eq('id', credentialId)

    return !error
  } catch (error) {
    console.error('Revoke API key error:', error)
    return false
  }
}
