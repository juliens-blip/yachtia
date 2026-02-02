# 🤖 MISSION CODEX - Amélioration Pipeline RAG

**Agent:** CODEX (Backend/Data specialist)  
**Modèle recommandé:** sonnet  
**Priorité:** HIGH  
**Durée estimée:** 2h

---

## 📋 CONTEXTE

Le système Yacht Legal AI utilise Gemini pour analyser des PDFs juridiques via RAG.  
**Problème:** Gemini ne récupère pas assez de chunks pertinents et fallback trop vite sur internet.

**Repo:** `/home/julien/Documents/iayacht/yacht-legal-ai`

---

## 🎯 OBJECTIFS

Améliorer le pipeline RAG pour:
1. Récupérer plus de chunks pertinents (5 → 10)
2. Ajouter métadonnées contextuelles aux chunks
3. Implémenter re-ranking sémantique

---

## ✅ TODO 1: Améliorer le Chunking PDF

**Fichier cible:** `lib/chunker.ts`

**Modifications requises:**

1. **Augmenter overlap:**
   - Actuellement: 100 tokens
   - Nouveau: 200 tokens
   - Permet meilleure continuité entre chunks

2. **Ajouter métadonnées:**
   ```typescript
   interface ChunkMetadata {
     section?: string;      // Ex: "Article 5.2"
     headers?: string[];    // Titres de sections parentes
     page: number;
     chunk_index: number;
   }
   ```

3. **Préserver structures:**
   - Détecter et ne pas couper: listes, tables, paragraphes juridiques
   - Exemple: Si un paragraphe fait 450 tokens, le garder intact plutôt que le couper

**Test de validation:**
```typescript
const chunks = await processPDF(testPDF);
assert(chunks[0].overlap === 200);
assert(chunks[0].metadata?.page !== undefined);
```

---

## ✅ TODO 2: Optimiser search_documents (SQL)

**Nouveau fichier:** `MIGRATION_IMPROVE_SEARCH.sql`

**Modifications fonction Supabase:**

```sql
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.6,  -- ← CHANGÉ de 0.7
  match_count int DEFAULT 10,         -- ← CHANGÉ de 5
  filter_category varchar DEFAULT NULL,
  use_reranking boolean DEFAULT TRUE  -- ← NOUVEAU paramètre
)
RETURNS TABLE (
  -- ... colonnes identiques à l'actuel
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
```

**Raisons des changements:**
- `match_threshold 0.6`: capture plus de candidats (moins strict)
- `match_count 10`: fournit plus de chunks au re-ranker
- `use_reranking`: flag pour activer re-ranking côté application

---

## ✅ TODO 3: Implémenter Re-ranking

**Nouveau fichier:** `lib/reranker.ts`

**Objectif:** Re-classer les chunks récupérés en combinant similarité vectorielle + sémantique textuelle.

```typescript
/**
 * Re-rank chunks using hybrid scoring
 * @param query - User question
 * @param chunks - Chunks from vector search
 * @param topK - Number of top chunks to return
 */
export async function rerankChunks(
  query: string,
  chunks: Array<{
    chunk_text: string;
    similarity: number;
    metadata?: Record<string, any>;
  }>,
  topK: number = 5
): Promise<Array<{
  chunk_text: string;
  score: number;
  metadata?: Record<string, any>;
}>> {
  // 1. Calculer similarité sémantique avec la question
  const semanticScores = await Promise.all(
    chunks.map(chunk => computeSemanticSimilarity(query, chunk.chunk_text))
  );
  
  // 2. Combiner scores (50% vector + 50% semantic)
  const hybridScores = chunks.map((chunk, i) => ({
    ...chunk,
    score: (chunk.similarity * 0.5) + (semanticScores[i] * 0.5)
  }));
  
  // 3. Trier et retourner top K
  return hybridScores
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Compute semantic similarity (simple keyword overlap for MVP)
 * TODO: Use Gemini embeddings for better results
 */
function computeSemanticSimilarity(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const textWords = text.toLowerCase().split(/\s+/);
  
  const overlap = queryWords.filter(word => textWords.includes(word)).length;
  return overlap / queryWords.length;
}
```

**Intégration dans `lib/rag-pipeline.ts`:**

```typescript
import { rerankChunks } from './reranker';

export async function retrieveRelevantChunks(question: string) {
  // 1. Vector search (récupère 10 candidats)
  const candidates = await searchDocuments(embedding, 0.6, 10);
  
  // 2. Re-rank pour top 5
  const reranked = await rerankChunks(question, candidates, 5);
  
  return reranked;
}
```

---

## 🧪 TESTS À CRÉER

**Fichier:** `scripts/test-rag-improvements.ts`

```typescript
#!/usr/bin/env tsx

import { processPDF } from '../lib/chunker';
import { searchDocuments } from '../lib/supabase';
import { rerankChunks } from '../lib/reranker';
import { generateEmbedding } from '../lib/gemini';

async function testSuite() {
  console.log('🧪 Test 1: Chunking avec overlap 200');
  const chunks = await processPDF('./test-docs/sample.pdf');
  assert(chunks[0].overlap === 200, 'Overlap devrait être 200');
  assert(chunks[0].metadata?.page !== undefined, 'Métadonnées page manquantes');
  console.log('✅ Test 1 passé\n');
  
  console.log('🧪 Test 2: search_documents retourne 10 résultats');
  const embedding = await generateEmbedding('test query');
  const results = await searchDocuments(embedding, 0.6, 10);
  assert(results.length <= 10, `Devrait retourner max 10, reçu ${results.length}`);
  console.log('✅ Test 2 passé\n');
  
  console.log('🧪 Test 3: Re-ranking améliore pertinence');
  const beforeScore = avgScore(results);
  const reranked = await rerankChunks('test query', results, 5);
  const afterScore = avgScore(reranked);
  assert(afterScore >= beforeScore * 1.1, 'Re-ranking devrait améliorer de 10%+');
  console.log(`✅ Test 3 passé (amélioration: ${((afterScore/beforeScore - 1) * 100).toFixed(1)}%)\n`);
  
  console.log('🎉 Tous les tests passés !');
}

testSuite().catch(console.error);
```

**Script npm:** Ajouter dans `package.json`:
```json
{
  "scripts": {
    "test:rag": "tsx scripts/test-rag-improvements.ts"
  }
}
```

---

## 📊 CRITÈRES DE SUCCÈS

| Critère | Attendu | Vérification |
|---------|---------|--------------|
| Overlap chunks | 200 tokens | Test unitaire |
| Métadonnées présentes | ✅ | Test unitaire |
| search_documents threshold | 0.6 | SQL migration |
| search_documents count | 10 | SQL migration |
| Re-ranker implémenté | ✅ | Code review |
| Tests passent | 3/3 ✅ | `npm run test:rag` |

---

## 📝 LIVRABLE

À la fin de la mission, fournir:

1. **Liste fichiers modifiés:**
   - `lib/chunker.ts` (diff montrant changements)
   - `lib/rag-pipeline.ts` (intégration re-ranking)
   - `MIGRATION_IMPROVE_SEARCH.sql` (nouveau fichier)

2. **Nouveau fichier créé:**
   - `lib/reranker.ts` (module complet)
   - `scripts/test-rag-improvements.ts` (suite de tests)

3. **Résultats tests:**
   ```
   🧪 Test 1: Chunking avec overlap 200 ✅
   🧪 Test 2: search_documents retourne 10 résultats ✅
   🧪 Test 3: Re-ranking améliore pertinence ✅
   
   🎉 Tous les tests passés !
   ```

4. **Metrics:**
   - Chunks récupérés: 5 → 10 (×2)
   - Amélioration pertinence re-ranking: +X%
   - Overlap chunks: 100 → 200 tokens

---

## ⚠️ CONTRAINTES

- **Ne PAS** casser la compatibilité SQL existante
- **Ne PAS** modifier le schema de la table `document_chunks`
- **Garder** les noms de colonnes identiques dans `search_documents`
- **Tester** avant de livrer

---

**CODEX, c'est parti ! Attends confirmation de l'orchestrateur avant de commencer.**
