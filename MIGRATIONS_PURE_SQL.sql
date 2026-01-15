-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration 014: Add new flag categories
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Add new categories to documents table check constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check;

ALTER TABLE documents ADD CONSTRAINT documents_category_check 
CHECK (category IN (
  -- Existing categories
  'MYBA',
  'YET',
  'AML_KYC',
  'MLC_2006',
  'MANNING_STCW',
  'PAVILLONS',
  'DROIT_SOCIAL',
  'IA_RGPD',
  'DROIT_MER_INTERNATIONAL',
  'PAVILLON_MARSHALL',
  'PAVILLON_MALTA',
  'PAVILLON_CAYMAN_REG',
  'GUIDES_PAVILLONS',
  -- New categories (2026-01-15)
  'PAVILLON_FRANCE',
  'PAVILLON_BVI',
  'PAVILLON_IOM',
  'PAVILLON_MADERE'
));

COMMENT ON CONSTRAINT documents_category_check ON documents IS 
'Valid document categories including flag registries (France, Malta, Cayman, Marshall, BVI, IoM, Madère) and international maritime law';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration 013: Add source_url to search_documents function
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Drop existing function
DROP FUNCTION IF EXISTS search_documents(vector, float, int, varchar);

-- Recreate with source_url
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

COMMENT ON FUNCTION search_documents IS 'Semantic search with source URLs. Returns top-K chunks with document source URLs for citation.';
