-- ═══════════════════════════════════════════════════════════════
-- DIAGNOSTIC: Vérifier la fonction search_documents actuelle
-- ═══════════════════════════════════════════════════════════════

-- 1. Voir toutes les fonctions search_documents existantes
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    p.prosrc as source_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'search_documents'
AND n.nspname = 'public';

-- 2. Vérifier les colonnes retournées par la fonction
SELECT * FROM search_documents(
    array_fill(0.0, ARRAY[768])::vector(768),
    0.01,
    1,
    NULL
) LIMIT 0;

-- 3. Afficher la définition complète de la fonction
\df+ search_documents
