-- Script de vérification: Les migrations sont-elles déjà appliquées ?
-- Exécuter ceci dans Supabase SQL Editor pour vérifier l'état de la DB

-- 1. Vérifier si pgvector est activé
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 2. Vérifier si les tables existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('documents', 'document_chunks', 'conversations', 'audit_logs')
ORDER BY table_name;

-- 3. Vérifier les index existants
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('documents', 'document_chunks', 'conversations', 'audit_logs')
ORDER BY tablename, indexname;

-- 4. Vérifier les fonctions (search_similar_chunks)
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'search_similar_chunks';

-- 5. Vérifier les politiques RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
