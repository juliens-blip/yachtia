/**
 * Supabase Client Configuration
 *
 * Provides both admin and client-side Supabase instances:
 * - supabaseAdmin: For server-side operations with full access (service role)
 * - supabaseClient: For client-side operations with RLS policies (anon key)
 */

import { createClient } from '@supabase/supabase-js'

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

/**
 * Admin client with service role key (server-side only)
 * Bypasses RLS policies - use with caution
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
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
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
