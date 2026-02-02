-- Migration 006: Create search_documents function
-- Description: Fonction SQL optimisée pour la recherche vectorielle sémantique (RAG)
-- Date: 2026-01-12

-- Optimized vector search function for RAG pipeline
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_category varchar DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_name varchar,
  category varchar,
  chunk_text text,
  similarity float,
  page_number int,
  chunk_index int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id AS chunk_id,
    d.id AS document_id,
    d.name AS document_name,
    d.category,
    dc.chunk_text,
    1 - (dc.chunk_vector <=> query_embedding) AS similarity,
    dc.page_number,
    dc.chunk_index
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE
    -- Cosine similarity threshold (0.7 = 70% similarity)
    (1 - (dc.chunk_vector <=> query_embedding)) > match_threshold
    -- Optional category filter
    AND (filter_category IS NULL OR d.category = filter_category)
    -- Only public documents (RLS policy)
    AND d.is_public = TRUE
  ORDER BY dc.chunk_vector <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Comments
COMMENT ON FUNCTION search_documents IS 'Semantic search using pgvector cosine similarity. Returns top-K most relevant chunks.';

-- Performance notes:
-- - Cosine similarity operator: <=> (cosine distance)
-- - Threshold 0.7 = 70% similarity minimum
-- - IVFFlat index used automatically for vector search
-- - Target latency: <100ms for typical queries
