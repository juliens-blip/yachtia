# Phase 1: Analyse du Bug RAG - Zero Chunks

**Date:** 2026-01-29 14:30  
**Agent:** APEX  
**Statut:** ✅ ANALYSE TERMINÉE

---

## 🔍 DIAGNOSTIC

### Symptôme
Le pipeline RAG retourne **0 chunks** au LLM, entraînant des réponses type "Information non disponible".

### Points de Passage Identifiés

#### 1. Route API Chat (`app/api/chat/route.ts`)
**Lignes 81-96:** Multi-pass retrieval avec threshold **0.7**
```typescript
const allChunkResults = await Promise.all([
  retrieveRelevantChunks(expanded.original, category, 5, 0.7),  // ⚠️ Threshold strict
  ...expanded.variants.map(v => retrieveRelevantChunks(v, category, 3, 0.7))
])
```

**Problème potentiel #1:** Threshold 0.7 est trop strict, alors que le baseline RAG v2 utilisait **0.6**.

#### 2. RAG Pipeline (`lib/rag-pipeline.ts`)
**Lignes 40-102:** Fonction `retrieveRelevantChunks`
- Appelle `searchDocuments` avec `similarityThreshold` (défaut: 0.6)
- Multi-pass avec variants (jusqu'à 3)
- Re-ranking avec `rerankChunks`
- Déduplication par `chunk_id`

**Observation:** La fonction utilise bien 0.6 par défaut, mais la route API force 0.7.

#### 3. Search Documents (`lib/search-documents.ts`)
**Lignes 151-413:** Fonction principale de recherche vectorielle

**Mécanisme de fallback en cascade:**
1. Recherche initiale (threshold passé, ex: 0.7)
2. Si 0 résultats → Retry avec `threshold - 0.3` (0.4) sans filtre catégorie
3. Si 0 résultats → Recherche keywords avec threshold 0.2
4. Si 0 résultats → Final fallback threshold 0.15

**Problème potentiel #2:** Le fallback devrait toujours retourner des chunks, sauf si:
- La fonction SQL `search_documents` est cassée
- Les embeddings ne sont pas générés
- La base est vide (hypothèse écartée)

#### 4. Fonction SQL `search_documents`
**Non vérifiée dans cette analyse** - Besoin de tester directement via Supabase.

---

## 🧪 HYPOTHÈSES CLASSÉES PAR PROBABILITÉ

### ⚠️ HAUTE PROBABILITÉ

**H1: Threshold API trop strict (0.7 vs 0.6 baseline)**
- Impact: Bloque le premier pass
- Les fallbacks compensent normalement, mais...
- Combiné avec d'autres filtres → peut vider les résultats

**H2: Déduplication trop agressive**
- Ligne 88-90 de `chat/route.ts`: déduplication sur `allChunks`
- Si les variants retournent les mêmes chunks avec IDs différents → perte
- Slice à 8 après déduplication peut donner 0 si collision

**H3: Query expansion génère des variants non pertinents**
- `lib/question-processor.ts` génère jusqu'à 5 variants
- Si aucun variant ne matche → 0 chunks
- Exemple: "Malta registration" → variant "OGSR Malta registration eligibility..." peut échouer

### 🟡 PROBABILITÉ MOYENNE

**H4: Fonction SQL cassée ou paramètres incorrects**
- Ligne 174-192: Appel RPC `search_documents`
- Besoin de tester directement la fonction SQL
- Possibilité: migration manquante ou fonction supprimée

**H5: Filtres post-retrieval trop stricts**
- Lignes 361-368 de `search-documents.ts`: filtres flag et doc-type
- Mode `docFilterMode` peut éliminer tous les chunks
- Flag extraction peut mal fonctionner

### 🟢 FAIBLE PROBABILITÉ

**H6: Embeddings query mal générés**
- Peu probable car la fonction `generateEmbedding` est stable
- Les fallbacks multiples compenseraient

**H7: Base de données vide**
- Hypothèse écartée (user confirme docs présents)

---

## 🎯 POINTS DE DIAGNOSTIC PRIORITAIRES

### Test 1: Vérifier fonction SQL directement
```bash
cd yacht-legal-ai
npx tsx scripts/test-db-direct.ts
```

### Test 2: Logger le pipeline complet
Ajouter logs détaillés dans `search-documents.ts`:
```typescript
console.log('[RAG DEBUG] Step 1: Query embedding generated')
console.log('[RAG DEBUG] Step 2: Raw SQL results:', rawResults.length)
console.log('[RAG DEBUG] Step 3: After filters:', filteredResults.length)
console.log('[RAG DEBUG] Step 4: After reranking:', rerankedChunks.length)
```

### Test 3: Vérifier threshold dans route API
Changer temporairement ligne 82-83:
```typescript
retrieveRelevantChunks(expanded.original, category, 5, 0.6), // Au lieu de 0.7
```

### Test 4: Désactiver déduplication temporairement
Commenter ligne 88-90 pour voir si chunks existent avant dédupe.

---

## 📊 TRACES SYSTÈME

**Variables d'environnement:** ✅ OK
- SUPABASE_URL: Présent
- SUPABASE_ANON_KEY: Présent
- SERVICE_ROLE_KEY: Présent

**Scripts de test disponibles:**
- `test-e2e-rag.ts` ✅
- `test-db-direct.ts` ✅
- `test-metadata-search.ts` ✅

---

## 🚀 PLAN D'ACTION RECOMMANDÉ

1. **Diagnostic immédiat:** Tester fonction SQL directement
2. **Fix rapide:** Baisser threshold API de 0.7 → 0.6
3. **Debug profond:** Ajouter logs temporaires dans pipeline
4. **Validation:** Lancer test E2E après chaque fix

---

**Prochaine étape:** Phase 2 - Création du plan de correction détaillé
