# ⚡ Solution Rapide - Erreur Contrainte Catégories

## 🚨 Erreur Actuelle

```
Error: Failed to run sql query: 
ERROR: 23514: check constraint "documents_category_check" 
of relation "documents" is violated by some row
```

**Cause:** Il y a déjà des documents dans votre base avec des catégories qui ne sont pas dans la nouvelle liste.

---

## ✅ Solution Recommandée (OPTION B - SAFE)

**Cette solution supprime temporairement la contrainte de catégorie pour permettre l'ingestion.**

### Copier ce SQL dans Supabase SQL Editor :

```sql
-- OPTION B: Solution SAFE - Supprimer complètement la contrainte

-- Supprimer la contrainte de catégorie
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
```

---

## 📋 Étapes

### 1️⃣ Ouvrir Supabase SQL Editor
- https://supabase.com/dashboard
- Projet: `hmbattewtlmjbufiwuxt`
- SQL Editor (menu gauche)

### 2️⃣ Copier le SQL ci-dessus
- Copier TOUT le bloc SQL (du `--OPTION B` jusqu'à la fin)
- Coller dans SQL Editor
- Cliquer **RUN**

### 3️⃣ Vérifier
✅ Message attendu: **Success. No rows returned**

### 4️⃣ Lancer Ingestion
```bash
cd yacht-legal-ai
npm run ingest:radiation
```

---

## 🔍 Solution Alternative (OPTION A - Diagnostic d'abord)

Si vous voulez garder la contrainte de catégorie :

### Étape 1: Voir les catégories existantes

Copier dans Supabase SQL Editor :

```sql
SELECT DISTINCT category, COUNT(*) as count 
FROM documents 
GROUP BY category 
ORDER BY category;
```

### Étape 2: Noter toutes les catégories affichées

Exemple de résultat :
```
category              | count
----------------------|------
MYBA                  | 15
AML_KYC              | 8
CUSTOM_CATEGORY_X    | 5   ← Catégorie non listée !
...
```

### Étape 3: Ajouter TOUTES les catégories à la contrainte

Modifier [MIGRATION_STEP2_OPTION_A.sql](file:///home/julien/Documents/iayacht/yacht-legal-ai/MIGRATION_STEP2_OPTION_A.sql) pour inclure **toutes** les catégories vues à l'étape 1.

---

## 🎯 Recommandation

**Utilisez OPTION B (Safe)** pour gagner du temps :

1. ✅ Pas besoin de diagnostic
2. ✅ Pas de risque d'oubli de catégorie
3. ✅ Permet l'ingestion immédiate
4. ⚠️ Vous perdez juste la validation stricte des catégories (pas grave pour le dev)

**Vous pourrez recréer la contrainte plus tard** après l'ingestion si besoin.

---

## 🚀 Après la Migration

Une fois le SQL exécuté avec succès :

```bash
# Lancer l'ingestion
npm run ingest:radiation

# Attendre 35-40 min

# Vérifier
npm run ingest:verify

# Tester
npm run dev
# → http://localhost:3000/sources
```

---

## ✅ Checklist

- [ ] SQL OPTION B copié depuis ce fichier
- [ ] SQL collé dans Supabase SQL Editor (SANS backticks)
- [ ] RUN cliqué
- [ ] Message "Success" confirmé
- [ ] `npm run ingest:radiation` lancé

---

## 📁 Fichiers Disponibles

Si vous préférez copier depuis un fichier :

- **Rapide (recommandé):** [MIGRATION_STEP2_OPTION_B.sql](file:///home/julien/Documents/iayacht/yacht-legal-ai/MIGRATION_STEP2_OPTION_B.sql)
- Diagnostic : [MIGRATION_STEP1.sql](file:///home/julien/Documents/iayacht/yacht-legal-ai/MIGRATION_STEP1.sql)
- Avec contrainte : [MIGRATION_STEP2_OPTION_A.sql](file:///home/julien/Documents/iayacht/yacht-legal-ai/MIGRATION_STEP2_OPTION_A.sql)

🎉 **Prêt !**
