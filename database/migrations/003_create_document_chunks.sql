-- Migration 003: Create document_chunks table
-- Description: Table pour stocker les chunks de texte avec embeddings vectoriels (RAG)
-- Date: 2026-01-12

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_vector vector(768) NOT NULL,
  page_number INT,
  chunk_index INT NOT NULL,
  token_count INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Standard indexes
CREATE INDEX idx_chunk_document ON document_chunks(document_id);
CREATE INDEX idx_chunk_index ON document_chunks(chunk_index);

-- Vector index for semantic search (IVFFlat for <100ms latency)
-- Note: IVFFlat est optimal pour des collections de 10k-1M vecteurs
CREATE INDEX idx_chunk_vector ON document_chunks
USING ivfflat (chunk_vector vector_cosine_ops)
WITH (lists = 100);

-- Comments
COMMENT ON TABLE document_chunks IS 'Stores document chunks with embeddings for RAG semantic search';
COMMENT ON COLUMN document_chunks.chunk_vector IS 'Chunk embedding (768 dims) for pgvector similarity search';
COMMENT ON COLUMN document_chunks.chunk_index IS 'Position of chunk in original document (for ordering)';
COMMENT ON COLUMN document_chunks.token_count IS 'Number of tokens in chunk (for chunking strategy validation)';
COMMENT ON INDEX idx_chunk_vector IS 'IVFFlat index for fast cosine similarity search (<100ms target)';
