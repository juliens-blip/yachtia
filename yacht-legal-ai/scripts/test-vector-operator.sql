-- 🔬 T-050: Test Opérateur Pgvector <=>
-- Basé sur recommandations Oracle

-- A. Vérifier extension pgvector
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'vector';

-- B. Type colonne chunk_vector
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='document_chunks'
  AND column_name='chunk_vector';

-- C. Dimensions vectors
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE chunk_vector IS NULL) AS null_vecs,
  MIN(vector_dims(chunk_vector)) AS min_dims,
  MAX(vector_dims(chunk_vector)) AS max_dims
FROM document_chunks;

-- D. Test opérateur <=> avec embedding existant (doit retourner similarité ≈ 1)
WITH q AS (
  SELECT chunk_vector AS query_embedding
  FROM document_chunks
  WHERE chunk_vector IS NOT NULL
  LIMIT 1
)
SELECT
  dc.id,
  (dc.chunk_vector <=> q.query_embedding) AS distance,
  1 - (dc.chunk_vector <=> q.query_embedding) AS similarity
FROM document_chunks dc, q
ORDER BY dc.chunk_vector <=> q.query_embedding
LIMIT 10;

-- E. Distribution similarité (max devrait être ≈ 1)
WITH q AS (
  SELECT chunk_vector AS query_embedding
  FROM document_chunks
  WHERE chunk_vector IS NOT NULL
  LIMIT 1
),
s AS (
  SELECT 1 - (dc.chunk_vector <=> q.query_embedding) AS sim
  FROM document_chunks dc, q
)
SELECT
  MAX(sim) AS max_sim,
  MIN(sim) AS min_sim,
  AVG(sim) AS avg_sim
FROM s;

-- F. Test fonction search_documents avec embedding existant
WITH q AS (
  SELECT chunk_vector AS query_embedding
  FROM document_chunks
  WHERE chunk_vector IS NOT NULL
  LIMIT 1
)
SELECT *
FROM search_documents(
  (SELECT query_embedding FROM q),
  0.1,  -- threshold bas
  10,
  NULL,
  TRUE
);

-- G. Vérifier RLS policies
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('documents','document_chunks')
ORDER BY tablename, policyname;
