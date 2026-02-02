-- ÉTAPE 1: Vérifier les catégories existantes dans votre base
-- Copiez ce SQL dans Supabase SQL Editor et exécutez-le

SELECT DISTINCT category, COUNT(*) as count 
FROM documents 
GROUP BY category 
ORDER BY category;
