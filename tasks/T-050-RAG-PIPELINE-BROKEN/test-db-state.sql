-- 🔬 T-050: Test Database State
-- Vérifie l'état de la base Supabase pour diagnostiquer le bug RAG

-- 1. COMPTAGE GÉNÉRAL
SELECT 'Documents count' as metric, COUNT(*) as value FROM documents
UNION ALL
SELECT 'Chunks count', COUNT(*) FROM document_chunks
UNION ALL
SELECT 'Chunks with NULL vector', COUNT(*) FROM document_chunks WHERE chunk_vector IS NULL
UNION ALL
SELECT 'Chunks with valid vector', COUNT(*) FROM document_chunks WHERE chunk_vector IS NOT NULL;

-- 2. VÉRIFIER DIMENSIONS VECTORS
SELECT 
  'Vector dimensions' as check,
  vector_dims(chunk_vector) as dimension,
  COUNT(*) as count
FROM document_chunks 
WHERE chunk_vector IS NOT NULL
GROUP BY vector_dims(chunk_vector);

-- 3. ÉCHANTILLON DOCUMENTS
SELECT 
  d.name,
  d.category,
  COUNT(dc.chunk_id) as chunks_count,
  SUM(CASE WHEN dc.chunk_vector IS NULL THEN 1 ELSE 0 END) as chunks_without_vector
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
GROUP BY d.id, d.name, d.category
ORDER BY chunks_count DESC
LIMIT 10;

-- 4. VÉRIFIER FONCTION search_documents
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name = 'search_documents';

-- 5. TEST FONCTION (avec embedding factice)
-- NOTE: À exécuter manuellement avec un vrai embedding
-- SELECT * FROM search_documents(
--   '[0.1, 0.2, ...]'::vector(768),
--   0.1,  -- threshold très bas
--   5,
--   NULL  -- pas de filtre catégorie
-- );
