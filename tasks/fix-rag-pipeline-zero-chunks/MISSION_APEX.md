# MISSION APEX - Fix RAG Pipeline (Zero Chunks Bug)

**Date:** 2026-01-29  
**Priorité:** CRITIQUE 🔴  
**Agent:** APEX  
**Type:** Debugging + Correction

---

## 🚨 PROBLÈME IDENTIFIÉ

L'IA répond **"Information non disponible dans la base"** pour TOUTES les questions, alors que:
- ✅ La base Supabase contient des milliers de chunks
- ✅ Les embeddings sont générés
- ✅ Les documents sont indexés (Malta, Marshall, TVA, CYC, etc.)

**Symptôme exact:**
```
"Puisque je n'ai aucun document à disposition..."
[Aucun document fourni]
```

**Diagnostic Perplexity:**
> "Ta couche RAG / retrieval ne lui passe **plus aucun chunk** (ou lui passe une liste vide).  
> La connexion entre ton index de documents et le modèle est cassée."

---

## 🎯 OBJECTIF

**Rétablir le pipeline RAG pour que les chunks remontent correctement au LLM.**

---

## 📋 WORKFLOW APEX

### Phase 1: /analyze 🔍

**Fichiers critiques à analyser:**

1. **Route API Chat** → `yacht-legal-ai/app/api/chat/route.ts`
   - Lignes 81-96: `retrieveRelevantChunks` avec threshold 0.7
   - Vérifier si `chunks.length === 0` systématiquement

2. **RAG Pipeline** → `yacht-legal-ai/lib/rag-pipeline.ts`
   - Ligne 40-102: `retrieveRelevantChunks()`
   - Vérifier query expansion et déduplication

3. **Search Documents** → `yacht-legal-ai/lib/search-documents.ts`
   - Ligne 151-413: `searchDocuments()` (recherche vectorielle)
   - Ligne 186-197: Appel RPC `search_documents`
   - Vérifier si `data` est toujours vide

4. **Fonction SQL** → Vérifier dans Supabase si `search_documents()` existe et fonctionne
   - Possibilité: fonction supprimée ou cassée
   - Possibilité: threshold trop strict (0.7 au lieu de 0.6)

**Tests à faire:**
```bash
# 1. Vérifier les variables d'env
cat yacht-legal-ai/.env.local | grep SUPABASE

# 2. Tester une requête directe Supabase
npx tsx scripts/test-db-connection.ts

# 3. Logger le pipeline complet
npm run dev
# Faire une question test et checker les logs
```

**Hypothèses à valider:**
- ❓ Threshold trop élevé (0.7) → aucun chunk ne passe
- ❓ Fonction SQL `search_documents` cassée/manquante
- ❓ Embeddings query mal générés
- ❓ Filtres post-retrieval trop stricts (flag, doctype, etc.)
- ❓ Déduplication aggressive qui vide tout

**Livrable:** `tasks/fix-rag-pipeline-zero-chunks/01_analysis.md`

---

### Phase 2: /plan 📝

**Créer un plan détaillé:**

1. **Diagnostic précis**
   - Identifier le point exact où `rawResults` devient vide
   - Logs détaillés à chaque étape du pipeline

2. **Corrections à apporter**
   - Si threshold: baisser à 0.6 (ancien standard RAG v2)
   - Si fonction SQL: recréer/migrer
   - Si filtres: ajuster les seuils
   - Si déduplication: garder top-K avant dédupe

3. **Tests de validation**
   - Script de test E2E (5 questions types)
   - Vérifier que chunks.length >= 3 minimum
   - Vérifier que citations >= 3 dans les réponses

**Livrable:** `tasks/fix-rag-pipeline-zero-chunks/02_plan.md`

---

### Phase 3: /implement ⚙️

**Exécution contrôlée:**

1. **Ajout de logs détaillés** (temporaires pour debug)
   ```typescript
   console.log('[RAG DEBUG] Step 1: Query embedding generated')
   console.log('[RAG DEBUG] Step 2: Raw results count:', rawResults.length)
   console.log('[RAG DEBUG] Step 3: After filters:', filteredResults.length)
   ```

2. **Corrections du pipeline**
   - Appliquer les fixes identifiés dans le plan
   - Commit atomiques pour chaque fix

3. **Tests E2E**
   ```bash
   npm run test:e2e
   # Objectif: 5/5 questions PASS avec 3+ citations
   ```

4. **Cleanup**
   - Retirer les logs de debug
   - Documenter les changements

**Livrable:** `tasks/fix-rag-pipeline-zero-chunks/03_implementation_log.md`

---

## 🔧 RESSOURCES DISPONIBLES

**Agents library:**
- `agents_library/debugger.md` - Si besoin de tracer un bug complexe
- `agents_library/backend-architect.md` - Si refonte architecture RAG

**Mémoire projet:**
- `CLAUDE.md` - Historique RAG v2 (chunking 200, reranking, etc.)
- `RAPPORT_FINAL_RAG_V2_2026-01-24.md` - État baseline attendu

**Scripts existants:**
```bash
yacht-legal-ai/scripts/test-e2e-rag.ts          # Tests E2E
yacht-legal-ai/scripts/test-rag-improvements.ts  # Tests unitaires
```

---

## ✅ CRITÈRES DE SUCCÈS

1. ✅ Pipeline RAG retourne **minimum 3-5 chunks** pour toute question pertinente
2. ✅ Tests E2E: **5/5 PASS** avec 3+ citations chacun
3. ✅ Latence: **< 5s** par requête
4. ✅ Fallback internet: **0%** (sauf vraie absence de docs)
5. ✅ Logs production propres (pas de spam)

---

## 🚀 COMMANDE DE DÉMARRAGE

**Pour APEX:**

```bash
# Phase 1: Analyse
/analyze

# Phase 2: Plan
/plan

# Phase 3: Implémentation
/implement
```

**Note:** Ne PAS coder avant d'avoir les fichiers 01_analysis.md et 02_plan.md validés.

---

**Créé par:** Claude (Orchestrateur)  
**Contexte:** Session 2026-01-29 - Bug critique RAG signalé par Perplexity
