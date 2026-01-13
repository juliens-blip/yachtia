/**
 * Audit Logging (RGPD Compliance)
 *
 * All user actions are logged for RGPD compliance:
 * - 2 years retention period
 * - Secure storage (service role only)
 * - No user modification allowed
 */

import { supabaseAdmin } from './supabase'

export type AuditAction =
  | 'upload'
  | 'view'
  | 'search'
  | 'delete'
  | 'chat'
  | 'download'
  | 'consent'

export type AuditLogParams = {
  action: AuditAction
  userId?: string
  documentId?: string
  conversationId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

/**
 * Log an action to audit_logs table
 *
 * @param params - Audit log parameters
 * @returns true if logged successfully
 */
export async function logAudit(params: AuditLogParams): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: params.action,
        user_id: params.userId || null,
        document_id: params.documentId || null,
        conversation_id: params.conversationId || null,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
        metadata: params.metadata || {}
      })

    if (error) {
      console.error('Audit log error:', error)
      // Don't throw - logging failure shouldn't break main flow
      return false
    }

    return true
  } catch (error) {
    console.error('Audit log exception:', error)
    return false
  }
}

/**
 * Log chat interaction
 */
export async function logChatAudit(params: {
  userId?: string
  conversationId?: string
  query: string
  chunksUsed: number
  responseTime: number
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  await logAudit({
    action: 'chat',
    userId: params.userId,
    conversationId: params.conversationId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: {
      query_length: params.query.length,
      chunks_used: params.chunksUsed,
      response_time_ms: params.responseTime
    }
  })
}

/**
 * Log document upload
 */
export async function logUploadAudit(params: {
  userId?: string
  documentId: string
  filename: string
  category: string
  fileSize: number
  pagesCount: number
  chunksCount: number
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  await logAudit({
    action: 'upload',
    userId: params.userId,
    documentId: params.documentId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: {
      filename: params.filename,
      category: params.category,
      file_size_bytes: params.fileSize,
      pages_count: params.pagesCount,
      chunks_count: params.chunksCount
    }
  })
}

/**
 * Log document deletion (RGPD right to be forgotten)
 */
export async function logDeleteAudit(params: {
  userId: string
  documentIds: string[]
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  await logAudit({
    action: 'delete',
    userId: params.userId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: {
      documents_deleted: params.documentIds.length,
      document_ids: params.documentIds,
      reason: 'user_requested_deletion'
    }
  })
}

/**
 * Log RGPD consent
 */
export async function logConsentAudit(params: {
  userId?: string
  consentType: 'cookies' | 'data_processing' | 'analytics'
  accepted: boolean
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  await logAudit({
    action: 'consent',
    userId: params.userId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: {
      consent_type: params.consentType,
      accepted: params.accepted,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Log search requests
 */
export async function logSearchAudit(params: {
  userId?: string
  query: string
  category?: string
  resultsCount: number
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  await logAudit({
    action: 'search',
    userId: params.userId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    metadata: {
      query_length: params.query.length,
      category: params.category || null,
      results_count: params.resultsCount
    }
  })
}

/**
 * Log document download
 */
export async function logDownloadAudit(params: {
  userId?: string
  documentId: string
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  await logAudit({
    action: 'download',
    userId: params.userId,
    documentId: params.documentId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent
  })
}

/**
 * Get audit logs for user (RGPD data export)
 *
 * @param userId - User ID
 * @param limit - Max number of logs to return
 * @returns Array of audit logs
 */
export async function getUserAuditLogs(userId: string, limit: number = 100) {
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching audit logs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception fetching audit logs:', error)
    return []
  }
}

/**
 * Delete old audit logs (2+ years)
 * Should be called periodically via cron job
 *
 * @returns Number of logs deleted
 */
export async function cleanOldAuditLogs(): Promise<number> {
  try {
    const { error } = await supabaseAdmin
      .rpc('delete_old_audit_logs')

    if (error) {
      console.error('Error cleaning audit logs:', error)
      return 0
    }

    // Note: RPC function doesn't return count
    // Would need to modify SQL function to return affected rows
    return -1 // Unknown count
  } catch (error) {
    console.error('Exception cleaning audit logs:', error)
    return 0
  }
}
