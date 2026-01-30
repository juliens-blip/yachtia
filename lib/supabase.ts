/**
 * Supabase Client Configuration
 *
 * Provides both admin and client-side Supabase instances:
 * - supabaseAdmin: For server-side operations with full access (service role)
 * - supabaseClient: For client-side operations with RLS policies (anon key)
 */

import { createClient } from '@supabase/supabase-js'

// Lazy initialization for environment variables (supports scripts with dotenv)
function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    console.warn('⚠️  NEXT_PUBLIC_SUPABASE_URL not set')
  }
  return url || ''
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set')
  }
  return key || ''
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    console.warn('⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY not set')
  }
  return key || ''
}

/**
 * Admin client with service role key (server-side only)
 * Bypasses RLS policies - use with caution
 */
export const supabaseAdmin = createClient(
  getSupabaseUrl(),
  getServiceRoleKey(),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Client-side Supabase instance with anon key
 * Respects RLS policies
 */
export const supabaseClient = createClient(
  getSupabaseUrl(),
  getAnonKey()
)

// Type definitions for database tables
export type Document = {
  id: string
  name: string
  category: 'MYBA' | 'AML' | 'MLC' | 'PAVILION' | 'INSURANCE' | 'CREW' | 'REGISTRATION' | 'ENVIRONMENTAL' | 'CORPORATE' | 'CHARTER'
  source_url?: string
  file_path: string
  uploaded_by?: string
  uploaded_at: string
  content_vector?: number[]
  metadata: Record<string, unknown>
  is_public: boolean
  created_at: string
  updated_at: string
}

export type DocumentChunk = {
  id: string
  document_id: string
  chunk_text: string
  chunk_vector: number[]
  page_number?: number
  chunk_index: number
  token_count?: number
  created_at: string
}

export type Conversation = {
  id: string
  user_id?: string
  title?: string
  started_at: string
  last_message_at: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
  document_ids: string[]
  created_at: string
}

export type AuditLog = {
  id: string
  action: 'upload' | 'view' | 'search' | 'delete' | 'chat' | 'download' | 'consent'
  user_id?: string
  document_id?: string
  conversation_id?: string
  ip_address?: string
  user_agent?: string
  timestamp: string
  metadata: Record<string, unknown>
}
