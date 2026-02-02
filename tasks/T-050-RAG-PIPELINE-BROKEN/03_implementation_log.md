# 🔴 T-050 - IMPLEMENTATION: Résolution Bug RAG Pipeline

**Date:** 2026-01-29 09:45  
**Executor:** Claude (APEX Workflow - Autonome)  
**Status:** 🔄 EN COURS

---

## 📊 DIAGNOSTIC FINAL

### Cause Racine Identifiée ✅

**Problème:** Incompatibilité modèles embeddings
- ❌ DB contient embeddings générés avec **ANCIEN MODÈLE** (ou dimension différente)
- ✅ API génère embeddings avec **gemini-embedding-001 (768D)**
- 📊 Similarité max mesurée: **0.075** (threshold=0.1 → 0 résultats)

**Preuve:**
```
Test avec embedding existant (chunk's own vector):
  → Similarity: 1.000000 ✅ (parfait)

Test avec embedding Gemini API (query réelle):
  → Similarity max: 0.075643 ❌ (incompatible)
  → Résultats avec threshold=0.1: 0
  → Résultats avec threshold=0.0: 3 (mais similarity < 0.1)
```

**Conclusion:** Les vecteurs DB et API sont issus de **modèles incompatibles**.

---

## 🔧 SOLUTIONS POSSIBLES

### Option A: Ré-ingestion Complète (RECOMMANDÉE)
**Effort:** ~30-60 min (automatisé)  
**Impact:** Résout définitivement le problème

**Actions:**
1. ✅ Sauvegarder état DB actuel (optionnel)
2. ✅ Vider tables `document_chunks` et `documents`
3. ✅ Re-exécuter script ingestion avec modèle actuel
4. ✅ Valider similarités > 0.1

**Commande:**
```bash
cd yacht-legal-ai
npm run ingest:all  # Ré-ingère tous les documents
```

**Risques:**
- Temps d'exécution: ~30-60 min (249 docs)
- Rate limit Gemini API (géré par script avec batching)

---

### Option B: Fix Temporaire - Baisser Threshold (NON RECOMMANDÉE)
**Effort:** 2 min  
**Impact:** Dégrade qualité réponses

**Change threshold de 0.6 → 0.05**

**Pourquoi NON recommandé:**
- Similarités < 0.1 = chunks quasi-aléatoires
- IA va citer des sources non pertinentes
- Pas une vraie solution

---

## 🚀 PLAN D'IMPLÉMENTATION (Option A)

### Phase 1: Validation Concept (10 min) ✅

**Test:** Ré-ingérer UN document pour prouver que ça marche

```typescript
// Script test: scripts/test-reingest-one-doc.ts
import { generateEmbedding } from '../lib/gemini'
import { chunkText } from '../lib/chunker'
import { supabaseAdmin } from '../lib/supabase'

const testDoc = {
  name: 'TEST_REINGESTION_MYBA',
  content: 'MYBA Charter Agreement obligations seller buyer...',
  category: 'TEST'
}

// 1. Chunk
const chunks = chunkText(testDoc.content)

// 2. Generate embeddings
const embeddings = await Promise.all(chunks.map(c => generateEmbedding(c.text)))

// 3. Insert
const { data: doc } = await supabaseAdmin.from('documents').insert({
  name: testDoc.name,
  category: testDoc.category,
  is_public: true
}).select().single()

await supabaseAdmin.from('document_chunks').insert(
  chunks.map((c, i) => ({
    document_id: doc.id,
    chunk_text: c.text,
    chunk_vector: embeddings[i],
    chunk_index: i
  }))
)

// 4. Test search
const query = "MYBA charter agreement"
const qEmbedding = await generateEmbedding(query)
const { data: results } = await supabaseAdmin.rpc('search_documents', {
  query_embedding: qEmbedding,
  match_threshold: 0.1,
  match_count: 5,
  filter_category: null
})

console.log('Results:', results?.length)
console.log('Top similarity:', results?.[0]?.similarity)
// Expected: similarity > 0.3
```

**Critère succès:** `results.length > 0` ET `similarity > 0.3`

---

### Phase 2: Cleanup DB (5 min)

**ATTENTION:** Backup d'abord si nécessaire (optionnel car DB dev)

```sql
-- Vider chunks
TRUNCATE TABLE document_chunks CASCADE;

-- Vider documents
TRUNCATE TABLE documents CASCADE;

-- Vérifier
SELECT COUNT(*) FROM documents;  -- devrait être 0
SELECT COUNT(*) FROM document_chunks;  -- devrait être 0
```

---

### Phase 3: Ré-ingestion Complète (30-60 min)

**Script:** `scripts/ingest-reference-docs.ts` (déjà existant)

**Vérifier config:**
- ✅ Utilise `generateEmbedding()` de lib/gemini.ts
- ✅ Batch size: 10 (rate limiting)
- ✅ Retry logic: 3 tentatives

**Exécution:**
```bash
cd yacht-legal-ai
export $(cat .env.local | grep -v '^#' | xargs)
npm run ingest:all
```

**Monitoring:**
- Logs: observer `✅ Batch X embeddings generated`
- Errors: si rate limit → attendre et retry (auto)
- Progress: ~30-60 min pour 249 docs

---

### Phase 4: Validation E2E (5 min)

**Test 1: RPC direct**
```bash
npx tsx scripts/debug-rag-pipeline.ts
```

**Expected:**
```
✅ RPC retourne 10 résultats
✅ searchDocuments() retourne 10 chunks
✅ retrieveRelevantChunks() retourne 10 chunks
```

**Test 2: API /chat**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the obligations of the seller in a yacht sale contract?"}'
```

**Expected:**
- Réponse contient citations `[Source: ...]`
- Pas de "Information non disponible"
- Logs: `[RAG] Chunks retrieved: { total: >0 }`

---

### Phase 5: Documentation (5 min)

**Fichiers à mettre à jour:**
1. ✅ `CLAUDE.md` - Ajouter T-050 dans Task Completion Log
2. ✅ `tasks/T-050-RAG-PIPELINE-BROKEN/` - Compléter avec résolution
3. ✅ `README.md` - Note sur compatibilité embeddings
4. ✅ `MIGRATION_EMBEDDING_MODEL.md` - Doc pour éviter régression

---

## ⏱️ TIMELINE

| Phase | Durée estimée | Status |
|-------|---------------|--------|
| 1. Validation concept | 10 min | ⏳ TODO |
| 2. Cleanup DB | 5 min | ⏳ TODO |
| 3. Ré-ingestion | 30-60 min | ⏳ TODO |
| 4. Validation E2E | 5 min | ⏳ TODO |
| 5. Documentation | 5 min | ⏳ TODO |
| **TOTAL** | **55-85 min** | **0% done** |

**Deadline:** 2026-01-29 11:00 (2h)  
**Temps restant:** ~1h15  
**Status:** ✅ Dans les temps

---

## 🚨 RISQUES & MITIGATIONS

### Risque 1: Rate Limit Gemini API
**Probabilité:** Moyenne  
**Impact:** +30 min délai  
**Mitigation:**
- Script gère batch=10 avec delays 2s
- Retry logic automatique
- Si échec: baisser batch_size à 5

### Risque 2: Échec ingestion partiel
**Probabilité:** Faible  
**Impact:** Docs manquants  
**Mitigation:**
- Logs détaillés par document
- Vérifier count après: `SELECT COUNT(*) FROM documents`
- Re-run pour docs échoués uniquement

### Risque 3: Mauvaise qualité embeddings après re-ingestion
**Probabilité:** Très faible  
**Impact:** Similarités toujours basses  
**Mitigation:**
- Test validation (Phase 1) prouve le concept AVANT cleanup
- Fallback: restore backup DB (si créé)

---

## 📋 CHECKLIST PRÉ-EXÉCUTION

Avant de lancer Phase 2 (cleanup):

- [ ] Test validation (Phase 1) réussi
- [ ] Similarité test > 0.3 confirmée
- [ ] .env.local contient GEMINI_API_KEY valide
- [ ] Utilisateur informé (absent 2h → autonomie)
- [ ] Backup DB optionnel créé (si souhaité)

---

**Status:** ✅ Phase 1 VALIDÉE - Nouveau modèle fonctionne!  
**Résultat validation:** Similarity 0.9085 avec nouveau doc (vs 0.075 avec anciens)  
**Next:** Phase 2 - Cleanup DB puis ré-ingestion complète

## 🎯 VALIDATION PHASE 1 - RÉSULTATS

**Date:** 2026-01-29 10:05  
**Test:** Ré-ingestion 1 document avec nouveau modèle

**Résultats:**
- ✅ Embeddings 768D générés avec gemini-embedding-001
- ✅ Insertion DB réussie
- ✅ Search réussi: Similarity **0.9085** (excellent!)
- ⚠️  Queries sur AUTRES sujets → 0 résultats (normal: anciens docs incompatibles)

**Conclusion:** 
Le nouveau modèle embedding fonctionne **PARFAITEMENT**.  
Prêt pour ré-ingestion complète.
