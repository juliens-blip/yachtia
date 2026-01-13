-- Migration 007: Configure Row Level Security (RLS)
-- Description: Politiques RLS pour sécurité des données
-- Date: 2026-01-12

-- Enable RLS on all tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DOCUMENTS POLICIES
-- ============================================================================

-- Public read access for public documents
DROP POLICY IF EXISTS "Public documents are viewable by everyone" ON documents;
CREATE POLICY "Public documents are viewable by everyone"
ON documents FOR SELECT
USING (is_public = TRUE);

-- Authenticated users can insert documents
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON documents;
CREATE POLICY "Authenticated users can upload documents"
ON documents FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own documents
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
CREATE POLICY "Users can update own documents"
ON documents FOR UPDATE
USING (uploaded_by = auth.uid());

-- Users can delete their own documents
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
CREATE POLICY "Users can delete own documents"
ON documents FOR DELETE
USING (uploaded_by = auth.uid());

-- ============================================================================
-- DOCUMENT_CHUNKS POLICIES
-- ============================================================================

-- Public read access for chunks of public documents
DROP POLICY IF EXISTS "Public document chunks are viewable by everyone" ON document_chunks;
CREATE POLICY "Public document chunks are viewable by everyone"
ON document_chunks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_chunks.document_id
    AND documents.is_public = TRUE
  )
);

-- Service role can insert chunks (called from API)
DROP POLICY IF EXISTS "Service role can insert chunks" ON document_chunks;
CREATE POLICY "Service role can insert chunks"
ON document_chunks FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- CONVERSATIONS POLICIES
-- ============================================================================

-- Users can view their own conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

-- Users can create conversations
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (true);

-- Users can update their own conversations
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations"
ON conversations FOR UPDATE
USING (user_id = auth.uid() OR user_id IS NULL);

-- ============================================================================
-- AUDIT_LOGS POLICIES
-- ============================================================================

-- Audit logs: internal access only (no public policy)
-- Only accessible via service role key
-- Users cannot read/write audit logs directly

-- Admin/service role can read all audit logs
-- (no policy needed, service role bypasses RLS)

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Public documents are viewable by everyone" ON documents
IS 'Allow public read access to documents marked as public (is_public=true)';

COMMENT ON POLICY "Public document chunks are viewable by everyone" ON document_chunks
IS 'Allow public read access to chunks of public documents (for RAG search)';

COMMENT ON POLICY "Users can view own conversations" ON conversations
IS 'Users can only view their own conversations. NULL user_id = anonymous session.';

-- Note: Les audit_logs n'ont pas de policy publique car ils sont strictement internes (service role only)
-- Cela garantit que les utilisateurs ne peuvent pas modifier ou supprimer leurs propres logs (conformité RGPD)
