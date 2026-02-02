# 📝 Migration - Affichage Sources avec Liens

## Résumé

✅ **Gemini récapitule maintenant les sources utilisées avec liens en bas du chat**  
✅ **PDFs téléchargés automatiquement** - pas besoin de les télécharger manuellement

## 🔧 Changements Effectués

### 1️⃣ Base de Données - Migration SQL

**Fichier:** [database/migrations/013_add_source_url_to_search.sql](file:///home/julien/Documents/iayacht/yacht-legal-ai/database/migrations/013_add_source_url_to_search.sql)

La fonction `search_documents()` retourne maintenant le champ `source_url` pour chaque chunk.

**À exécuter dans Supabase SQL Editor :**

```sql
-- Migration 013: Add source_url to search_documents function

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

### 2️⃣ Backend - Gemini API

**Fichier:** [lib/gemini.ts](file:///home/julien/Documents/iayacht/yacht-legal-ai/lib/gemini.ts)

- ✅ Nouveau type `SourceReference` avec `name`, `category`, `url`
- ✅ `generateAnswer()` retourne maintenant `{ answer, sources, groundingMetadata }`
- ✅ Extraction automatique des sources uniques depuis les métadonnées

### 3️⃣ Backend - RAG Pipeline

**Fichier:** [lib/rag-pipeline.ts](file:///home/julien/Documents/iayacht/yacht-legal-ai/lib/rag-pipeline.ts)

- ✅ `RelevantChunk` inclut maintenant `sourceUrl?: string`
- ✅ `SearchDocumentsRow` inclut `source_url?: string`

### 4️⃣ API Chat Route

**Fichier:** [app/api/chat/route.ts](file:///home/julien/Documents/iayacht/yacht-legal-ai/app/api/chat/route.ts)

- ✅ Passage des `contextMetadata` à `generateAnswer()`
- ✅ Retour des sources Gemini formatées avec URLs

### 5️⃣ Frontend - Affichage Sources

**Fichier:** [components/MarkdownRenderer.tsx](file:///home/julien/Documents/iayacht/yacht-legal-ai/components/MarkdownRenderer.tsx)

Le composant affiche déjà les sources en bas du message avec:
- 📚 Section "Sources (X)" avec badge "Recherche web activée" si applicable
- 🔗 Liens cliquables vers les URLs sources
- 🏷️ Badge catégorie
- 📊 Pourcentage de pertinence

## 📦 Instructions d'Application

### Étape 1: Appliquer la migration SQL

```bash
# Option A: Via Supabase Dashboard
# 1. Aller sur https://supabase.com/dashboard
# 2. Ouvrir SQL Editor
# 3. Copier-coller le contenu de database/migrations/013_add_source_url_to_search.sql
# 4. Exécuter

# Option B: Via script (si configuré)
cd yacht-legal-ai
npm run db:migrate
```

### Étape 2: Vérifier que les documents ont bien `source_url`

```sql
-- Vérifier dans Supabase SQL Editor
SELECT name, category, source_url 
FROM documents 
WHERE source_url IS NOT NULL 
LIMIT 10;
```

Si `source_url` est vide pour certains docs:

```sql
-- Mettre à jour les docs existants avec file_url comme fallback
UPDATE documents 
SET source_url = file_url 
WHERE source_url IS NULL AND file_url IS NOT NULL;
```

### Étape 3: Redémarrer l'application

```bash
npm run dev
```

### Étape 4: Tester

1. Poser une question dans le chat
2. Vérifier que la réponse affiche les sources en bas
3. Cliquer sur un lien source pour vérifier qu'il fonctionne

## 📊 Exemple de Réponse

**Question :** 
> Quels sont les documents requis pour un deletion certificate à Malta ?

**Réponse avec sources :**

> D'après le [Document: Malta - Closure of Registry (PAVILLON_MALTA)], les documents requis sont:
> 
> 1. Application for Closure of Registry
> 2. Certificate of Registry original
> 3. Proof of ownership
> 4. Clearance from Customs
> 5. No Outstanding Fees Certificate
> 
> [Document: Malta - Termination registration small ships ≤24m (PAVILLON_MALTA)] précise...
>
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ⚖️ DISCLAIMER LÉGAL:
> Les informations fournies sont à titre informatif...
>
> ---
>
> **📚 Sources (2)**
>
> **[1] Malta - Closure of Registry (procédure)**  
> 🏷️ PAVILLON_MALTA • Pertinence: 95%  
> 🔗 https://www.transport.gov.mt/maritime/ship-and-yacht-registry/ship-registration/closure-of-registry-130
>
> **[2] Malta - Termination registration small ships (≤24m)**  
> 🏷️ PAVILLON_MALTA • Pertinence: 95%  
> 🔗 https://www.transport.gov.mt/maritime/small-ships/small-ship-registration/voluntary-termination-of-registration-of-a-small-ship-

## ✅ Checklist Post-Migration

- [ ] Migration SQL 013 appliquée dans Supabase
- [ ] Fonction `search_documents()` retourne `source_url`
- [ ] Documents ont `source_url` renseigné (query de vérification)
- [ ] Application redémarrée
- [ ] Test chat: question posée
- [ ] Sources affichées en bas du message
- [ ] Liens sources cliquables et fonctionnels

## 🎯 Téléchargement Automatique PDFs

**Question:** *Faut-il télécharger les PDFs manuellement ?*

**Réponse:** **NON ❌**

Les PDFs sont téléchargés **automatiquement** par les scripts d'ingestion :

```typescript
// lib/web-scraper.ts
export async function downloadPDF(url: string): Promise<Buffer> {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// lib/pdf-parser.ts
export async function extractTextFromPDF(buffer: Buffer): Promise<PDFParseResult> {
  const data = await pdfParse(buffer)
  return {
    text: data.text,
    pages: data.numpages,
    metadata: { ... }
  }
}
```

**Process d'ingestion :**
1. ✅ Script lit l'URL du PDF
2. ✅ Télécharge automatiquement via `fetch()`
3. ✅ Extrait le texte avec `pdf-parse`
4. ✅ Génère les embeddings
5. ✅ Stocke dans Supabase

**Commandes d'ingestion :**

```bash
# Ingérer toutes les nouvelles sources radiation/pavillons
npm run ingest:radiation

# Ingérer une catégorie spécifique
npm run ingest:category -- PAVILLON_MALTA

# Vérifier l'ingestion
npm run ingest:verify
```

## 🚀 Résultat Final

L'utilisateur voit maintenant:

✅ Réponse Gemini avec **citations précises** dans le texte  
✅ Section **📚 Sources (X)** en bas du message  
✅ **Liens cliquables** vers les documents sources  
✅ **Badge catégorie** + **% de pertinence**  
✅ **Aucune intervention manuelle** pour télécharger les PDFs

🎉 **Prêt pour production !**
