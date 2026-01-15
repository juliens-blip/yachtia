-- OPTION B: Solution SAFE - Supprimer complètement la contrainte
-- (Utiliser si vous avez des catégories inconnues ou pour être sûr)

-- Supprimer la contrainte de catégorie (on pourra la recréer plus tard si besoin)
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check;

-- Migration 013: Fonction search_documents avec source_url
DROP FUNCTION IF EXISTS search_documents(vector, float, int, varchar);

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
  chunk_index int,
  source_url text
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

COMMENT ON FUNCTION search_documents IS 'Semantic search with source URLs';
