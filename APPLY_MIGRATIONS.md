# ⚡ Appliquer les Migrations SQL - URGENT

## 🚨 Action Requise MAINTENANT

L'ingestion a démarré mais **échoue** car les nouvelles catégories ne sont pas dans la base.

**Il faut appliquer 2 migrations dans Supabase Dashboard :**

---

## Migration 013 + 014 - À Copier-Coller

### 🔧 Étape 1: Ouvrir Supabase SQL Editor

1. Aller sur **https://supabase.com/dashboard**
2. Sélectionner projet: `hmbattewtlmjbufiwuxt`
3. Cliquer **SQL Editor** (menu gauche)

### 📝 Étape 2: Exécuter ces 2 SQL (dans l'ordre)

**Copier-coller TOUT le bloc ci-dessous :**

```sql
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
```

### ✅ Étape 3: Cliquer RUN

Vérifier message: ✅ **Success. No rows returned**

---

## 🚀 Ensuite: Relancer l'Ingestion

Une fois les migrations appliquées :

```bash
cd yacht-legal-ai
npm run ingest:radiation
```

**Durée :** 30-40 minutes  
**Résultat :** 49 sources ingérées (quelques URLs 404/403 seront skip automatiquement)

---

## ⚠️ URLs Problématiques Détectées

Ces URLs seront automatiquement skip (404/403) :

1. ❌ `https://www.un.org/depts/los/convention_agreements/texts/unclos/unclos_e.pdf` (403 Forbidden)
2. ❌ `https://www.transport.gov.mt/maritime/small-ships/small-ship-registration/voluntary-termination-of-registration-of-a-small-ship-` (404)

**Total ingérables :** ~47/49 sources

---

## 📊 État Actuel

**Sources ingérées jusqu'à présent :**
- ✅ COLREG 2018 (75 chunks)
- ✅ Paris MoU (1 chunk)
- ✅ Malta Closure Registry (1 chunk)
- ✅ Malta CYC 2020 PDF (384 chunks) - **EN COURS**
- ⏳ Reste ~44 sources à ingérer

**Prochaines étapes après migration :**
1. Relancer `npm run ingest:radiation`
2. Attendre 30-40 min
3. Vérifier avec `npm run ingest:verify`
4. Tester chat

---

## ✅ Checklist

- [ ] Migrations 013 + 014 appliquées dans Supabase
- [ ] Message "Success" confirmé
- [ ] `npm run ingest:radiation` relancé
- [ ] Ingestion terminée avec ~47/49 succès
- [ ] `npm run ingest:verify` confirme les nouvelles catégories
- [ ] Test chat avec question sur radiation Malta

---

🚨 **URGENT:** Appliquer les migrations MAINTENANT pour que l'ingestion puisse continuer !
