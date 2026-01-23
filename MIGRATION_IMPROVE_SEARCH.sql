-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Amélioration du pipeline RAG
-- - Threshold: 0.7 → 0.6 (plus de résultats candidats)
-- - Match count: 5 → 10 (plus de chunks pour re-ranking)
-- - Ajout paramètre use_reranking
-- ═══════════════════════════════════════════════════════════════

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS search_documents(vector, float, int, varchar) CASCADE;
DROP FUNCTION IF EXISTS search_documents(vector(768), float, int, varchar) CASCADE;

-- Recréer avec les nouveaux paramètres optimisés
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.6,  -- CHANGÉ: 0.7 → 0.6
  match_count int DEFAULT 10,         -- CHANGÉ: 5 → 10
  filter_category varchar DEFAULT NULL,
  use_reranking boolean DEFAULT TRUE  -- NOUVEAU: flag pour re-ranking côté app
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_name varchar,
  category varchar,
  chunk_text text,
  similarity float,
  page_number int,
  chunk_index int,
  source_url varchar
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
    dc.chunk_index,
    d.source_url
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE
    (1 - (dc.chunk_vector <=> query_embedding)) > match_threshold
    AND (filter_category IS NULL OR d.category = filter_category)
    AND d.is_public = TRUE
  ORDER BY dc.chunk_vector <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_documents IS 'Semantic search optimized for RAG pipeline - v2 with lower threshold and higher match count for re-ranking';

-- Vérifier la fonction
SELECT 
    proname,
    pg_get_function_result(oid) as return_type,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'search_documents';
