# 🔴 T-050 - ANALYSE: RAG Pipeline Cassé (0 Chunks)

**Date:** 2026-01-29 09:00  
**Analyste:** Claude (APEX Workflow - Autonome)  
**Priorité:** CRITICAL  
**Deadline:** 2h (11:00)

---

## 🎯 PROBLÈME RAPPORTÉ

**Source:** Perplexity AI (diagnostic utilisateur)

**Symptôme:** L'IA répond systématiquement "Information non disponible" alors que la base Supabase est pleine de documents.

**Citation Perplexity:**
> "Elle dit: **'Puisque je n'ai aucun document à disposition…'**  
> → ça veut dire que la couche RAG / retrieval ne lui passe **plus aucun chunk** (ou lui passe une liste vide), même si tes index sont remplis."

**Réponse type observée:**
```
Je n'ai pas trouvé de documents pertinents...
[Aucun document fourni]
```

**Diagnostic Perplexity:**
- Pipeline RAG cassé entre index et modèle
- Soit retrieveur retourne 0 chunks
- Soit génération reçoit tableau vide et court-circuite avec fallback

---

## 🔍 ANALYSE INITIALE (9:00-9:10)

### 1. Test Fonction Supabase `search_documents`

**Test direct API RPC:**
```bash
curl -X POST "https://hmbattewtlmjbufiwuxt.supabase.co/rest/v1/rpc/search_documents" \
  -H "apikey: <anon_key>" \
  -d '{"query_embedding": [0.1,0.2,0.3], "match_threshold": 0.1, "match_count": 1, "filter_category": null}'
```

**Résultat:**
```json
{"message":"Invalid API key","hint":"Double check your Supabase `anon` or `service_role` API key."}
```

**⚠️ PROBLÈME DÉTECTÉ #1: API Key invalide**
- La clé `anon` dans les tests manuels est rejetée
- Besoin de vérifier `.env.local` pour clés valides
- Supabase CLI non configuré (pas de `supabase login`)

---

### 2. Architecture RAG Actuelle

**Pipeline identifié:**
```
1. /app/api/chat/route.ts (POST handler)
   ↓
2. retrieveRelevantChunks(query, category, topK=5, threshold=0.7)
   ↓ (lib/rag-pipeline.ts)
3. expandQuery(query) → variants
   ↓
4. Promise.all([
     searchDocuments(original, 5),
     ...variants.map(v => searchDocuments(v, 3))
   ])
   ↓ (lib/search-documents.ts)
5. generateEmbedding(query) → embedding 768D
   ↓ (lib/gemini.ts)
6. supabaseAdmin.rpc('search_documents', {
     query_embedding,
     match_threshold,
     match_count,
     filter_category
   })
   ↓
7. Résultat: SearchDocumentsRow[] ou []
```

---

### 3. Points de Défaillance Potentiels

#### A. Embedding Generation (lib/gemini.ts:94-131)
```typescript
// REST API directe pour 768 dimensions
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
  {
    method: 'POST',
    body: JSON.stringify({
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: 768
    })
  }
)
```

**Risques:**
- ❌ `GEMINI_API_KEY` manquante/invalide → exception levée
- ❌ Timeout/rate limit → exception levée
- ✅ Si exception → catch block log error → **empêche retour 0 chunks silencieux**

**Vérification:** Besoin de tester embedding live.

---

#### B. Supabase RPC Call (lib/search-documents.ts:174-197)
```typescript
const { data, error } = await supabaseAdmin.rpc('search_documents', {
  query_embedding: queryEmbedding,
  match_threshold: similarityThreshold,
  match_count: candidateCount,
  filter_category: category || null,
  use_reranking: useReranking
})

if (error) {
  console.error('Vector search error:', error)
  throw new Error(`Vector search failed: ${error.message}`)
}

let rawResults = (data as SearchDocumentsRow[] | null) || []
```

**Risques:**
- ✅ Si `error` → exception levée (pas de retour silencieux 0 chunks)
- ⚠️ Si `data === null` → `rawResults = []` → **RETOUR 0 CHUNKS SILENCIEUX**
- ⚠️ Si fonction SQL bugguée → retourne `[]` sans erreur

**Hypothèse forte:** La fonction `search_documents` existe mais retourne `[]` ou `null`.

---

#### C. Fallback Logic (lib/search-documents.ts:227-244)
```typescript
// Retry with relaxed threshold and no category filter if nothing found
if (rawResults.length === 0) {
  const relaxedThreshold = Math.max(0.3, similarityThreshold - 0.3)
  const relaxedCount = Math.max(candidateCount * 2, 20)

  const { data: relaxedData, error: relaxedError } = await callSearchDocuments({
    query_embedding: queryEmbedding,
    match_threshold: relaxedThreshold,
    match_count: relaxedCount,
    filter_category: null,
    use_reranking: useReranking
  })
  // ...
}
```

**Comportement:**
- Si premier appel retourne 0 → retry avec threshold relaxé
- Si retry échoue aussi → return `[]`
- Pas de log si `relaxedData = []`

**⚠️ PROBLÈME POTENTIEL #2: Logs insuffisants**
- Aucun log avant fallback pour debug "pourquoi 0 chunks au premier appel?"

---

#### D. Chat Route Handling (app/api/chat/route.ts:81-96)
```typescript
const allChunkResults = await Promise.all([
  retrieveRelevantChunks(expanded.original, category, 5, 0.7),
  ...expanded.variants.map(v => retrieveRelevantChunks(v, category, 3, 0.7))
])

const allChunks = allChunkResults.flat()
const chunks = deduplicateChunks(
  allChunks.map(c => ({ ...c, id: c.chunkId }))
).slice(0, 8) as RelevantChunk[]

console.log('[RAG] Chunks retrieved:', {
  total: allChunks.length,
  unique: chunks.length,
  topSimilarity: chunks[0]?.similarity || 0
})
```

**Comportement:**
- Si toutes les queries retournent `[]` → `allChunks = []` → `chunks = []`
- Log existant devrait montrer `total: 0, unique: 0`
- Puis fallback answer généré (buildFallbackAnswer)

**✅ Logs présents** mais besoin de vérifier si affichés en prod.

---

### 4. Fonction Supabase `search_documents`

**Dernière migration:** `MIGRATION_IMPROVE_SEARCH.sql`

**Signature attendue:**
```sql
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_category varchar
) RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_name text,
  category text,
  chunk_text text,
  similarity float,
  page_number int,
  chunk_index int,
  source_url text
)
```

**Logique:**
```sql
SELECT
  dc.chunk_id,
  dc.document_id,
  d.name as document_name,
  d.category,
  dc.chunk_text,
  1 - (dc.chunk_vector <=> query_embedding) as similarity,
  dc.page_number,
  dc.chunk_index,
  d.source_url
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE (
  (filter_category IS NULL OR d.category = filter_category)
  AND (1 - (dc.chunk_vector <=> query_embedding)) > match_threshold
)
ORDER BY dc.chunk_vector <=> query_embedding
LIMIT match_count;
```

**Risques:**
- ⚠️ Colonne `chunk_vector` vide → similarité 0 → aucun match
- ⚠️ Threshold trop élevé (≥0.6) + embeddings mal générés → 0 match
- ⚠️ Fonction pas déployée sur Supabase (migration non appliquée)

---

## 🔬 HYPOTHÈSES CLASSÉES PAR PROBABILITÉ

### 🔴 HAUTE PROBABILITÉ

1. **H1: Fonction `search_documents` retourne `[]` car embeddings vides en DB**
   - Symptôme: Ingestion documents OK mais `chunk_vector` = NULL
   - Cause possible: Échec silencieux génération embeddings lors ingestion
   - Vérification: Query direct `SELECT COUNT(*) FROM document_chunks WHERE chunk_vector IS NULL`

2. **H2: Threshold trop strict (0.6-0.7) avec embeddings de mauvaise qualité**
   - Cause: Dimension mismatch non détecté (768 attendu vs autre stocké)
   - Vérification: Tester avec threshold=0.1 manuel

3. **H3: Migration SQL non appliquée sur Supabase prod**
   - Symptôme: Fonction existe mais ancienne version (paramètres incompatibles)
   - Vérification: Inspect fonction via Supabase dashboard

---

### 🟡 MOYENNE PROBABILITÉ

4. **H4: API Keys Supabase expirées/invalides**
   - Test manuel a échoué avec "Invalid API key"
   - Mais code prod utilise `SUPABASE_SERVICE_ROLE_KEY` (différente)
   - Vérification: Tester avec service_role key

5. **H5: Rate limiting Gemini bloque embeddings**
   - Symptôme: Exceptions Gemini API → retour 0 chunks
   - Logs devraient montrer erreurs
   - Vérification: Check logs production

---

### 🟢 BASSE PROBABILITÉ

6. **H6: Bug code TypeScript récent**
   - Unlikely car tests E2E passaient avant
   - Vérification: Git diff depuis dernière version OK

---

## 📋 PLAN DE DIAGNOSTIC (Prochaine Phase)

### Étape 1: Vérifier État DB (5 min)
1. ✅ Compter documents: `SELECT COUNT(*) FROM documents`
2. ✅ Compter chunks: `SELECT COUNT(*) FROM document_chunks`
3. ❌ **CRITIQUE:** Compter embeddings NULL: `SELECT COUNT(*) FROM document_chunks WHERE chunk_vector IS NULL`
4. ❌ Vérifier dimension vectors: `SELECT vector_dims(chunk_vector) FROM document_chunks LIMIT 1`

### Étape 2: Tester Fonction SQL Direct (5 min)
1. ❌ Générer embedding test via API Gemini
2. ❌ Appeler fonction avec embedding test + threshold 0.1
3. ❌ Vérifier retour (devrait avoir ≥1 résultat si DB pleine)

### Étape 3: Tester Pipeline Complet (5 min)
1. ❌ Script test: appeler `/api/chat` avec question simple
2. ❌ Capturer logs `[RAG] Chunks retrieved`
3. ❌ Identifier où pipeline retourne 0

### Étape 4: Fix Identifié (variable selon cause)

---

## 🛠️ OUTILS NÉCESSAIRES

- [x] Accès `.env.local` (clés API)
- [ ] Accès Supabase Dashboard (ou SQL direct via CLI)
- [ ] Script test embedding Gemini
- [ ] Script test endpoint `/api/chat`
- [ ] Logs production (si disponibles)

---

## 📊 MÉTRIQUES CIBLES

- **Objectif:** Retriever ≥3 chunks par requête (minimum viable)
- **Seuil critique:** 0 chunks = système inutilisable
- **Temps résolution:** <2h (deadline autonome)

---

**Status:** ⏳ Analyse complétée, transition vers PLAN  
**Prochaine étape:** Créer `02_plan.md` avec actions détaillées
