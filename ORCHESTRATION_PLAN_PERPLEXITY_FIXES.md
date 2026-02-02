# 🎯 PLAN ORCHESTRATION - Corrections Problèmes Perplexity

**Date:** 2026-01-26 14:30  
**Orchestrateur:** AMP (Orchestrator Mode)  
**Objectif:** Résoudre 6 problèmes critiques identifiés par Perplexity

═══════════════════════════════════════════════════════════════════

## 📊 ÉTAT ACTUEL (Analyse CLAUDE.md + RAPPORT_FINAL_RAG_V2)

### ✅ DÉJÀ FAIT (Sessions précédentes)
1. **Chunking amélioré** - overlap 200, métadonnées (T001)
2. **SQL optimisé** - threshold 0.6, count 10 (T002)
3. **Re-ranking hybride** - 50/50 vector+sémantique (T003)
4. **Prompt Gemini renforcé** - citations min 3 (T004)
5. **Question expansion** - 2-3 variantes (T005)
6. **Logging détaillé** - gemini-rag.log (T006)
7. **Doc-type-tagger** - Boost codes x3, OGSR x2.5 (T011)
8. **TopK augmenté** - 5→15 sources (T012)
9. **Filtrage pavillon** - x2 match, x0.5 mismatch (T013)
10. **Context-extractor-lite** - extractCitedCodes() (T016 partiel)
11. **Anti-faux négatifs** - Listing obligatoire avant déclaration (T015)
12. **Priorité codes cités** - Validation post-génération (T016)

### 🔴 PROBLÈMES PERPLEXITY NON RÉSOLUS

#### 1. Mauvais choix documents (PARTIEL)
- ✅ Ranking codes implémenté
- ❌ Pas de filtering articles blogs en amont
- ❌ Pas de score minimum type document

#### 2. Fusion insuffisante sources (PARTIEL)
- ✅ TopK 15 OK
- ❌ Max 2 chunks/doc peut limiter infos riches
- ❌ Pas de multi-pass retrieval pour questions complexes

#### 3. Déclarations fausses "base insuffisante" (RÉSOLU ✅)
- ✅ Listing obligatoire implémenté

#### 4. Contexte chiffré ignoré (PARTIEL)
- ✅ extractCitedCodes OK
- ❌ extractYachtSize() manquant
- ❌ extractYachtAge() manquant
- ❌ buildContextPrompt() manquant
- ❌ Pas d'inférence SOLAS/MLC selon taille

#### 5. Pas assez spécifique aux codes cités (RÉSOLU ✅)
- ✅ Boost x15 codes cités (x3 type × x5 query match)
- ✅ Validation post-génération

#### 6. Bruit pavillon (PARTIEL)
- ✅ Boost pavillon x2/x0.5
- ❌ Pas de filtrage strict (élimination dures hors pavillon)
- ❌ Pas de cross-flag warning si pertinent

═══════════════════════════════════════════════════════════════════

## 🎯 TODOS ORCHESTRATION (IDs T020-T029)

### 📦 TODO T020 - Context Extraction Complet (CODEX)
**Priority:** HIGH  
**Duration:** 15 min  
**Status:** PENDING

**Tasks:**
1. Compléter `lib/context-extractor.ts` avec:
   - `extractYachtSize(query)` → Regex /(\d+)\s*m/, conversion ft→m
   - `extractYachtAge(query)` → Regex /built\s+in\s+(\d{4})/, calcul âge
   - `extractFlag(query)` → Malta, Cayman, Marshall, etc.
   - `buildContextPrompt(context)` → Template enrichissement

2. Ajouter inférences automatiques:
   ```typescript
   if (size >= 50) {
     prompt += "⚠️ CONSÉQUENCE: ≥50m → SOLAS/MLC applicable\n"
   }
   if (age > 20) {
     prompt += "⚠️ CONSÉQUENCE: >20 ans → Inspections renforcées\n"
   }
   ```

3. Intégrer dans `lib/gemini.ts`:
   ```typescript
   import { extractYachtContext, buildContextPrompt } from './context-extractor'
   const yachtContext = extractYachtContext(question)
   const contextPrompt = buildContextPrompt(yachtContext)
   const systemPrompt = `${contextPrompt}\n\n${existingPrompt}`
   ```

**Validation:**
- Tests unitaires: Size 50m → détecté, Age 2000 → 26 ans
- Prompt enrichi présent dans logs

**Skills requis:** @yacht-legal-ai/lib/* (chunker, reranker patterns)

---

### 📦 TODO T021 - Filtrage Strict Documents (CODEX)
**Priority:** HIGH  
**Duration:** 12 min  
**Status:** PENDING

**Tasks:**
1. Créer `lib/doc-filter.ts`:
   ```typescript
   enum FilterMode { STRICT, BALANCED, PERMISSIVE }
   
   filterByDocType(chunks, mode): Chunk[] {
     // STRICT: Éliminer articles blogs si codes disponibles
     // Garder seulement si score_code < threshold
   }
   
   filterByFlag(chunks, queryFlag, mode): Chunk[] {
     // STRICT: Éliminer docs hors pavillon
     // BALANCED: Downrank x0.3 (actuel x0.5)
   }
   ```

2. Ajouter threshold minimum score par type:
   ```typescript
   MIN_SCORES = {
     CODE: 0.7,    // Si code existe, score <0.7 éliminé
     OGSR: 0.65,
     LOI: 0.6,
     GUIDE: 0.5,
     ARTICLE: 0.8  // Articles doivent être très pertinents
   }
   ```

3. Intégrer dans `lib/rag-pipeline.ts`:
   ```typescript
   import { filterByDocType, filterByFlag } from './doc-filter'
   
   // Après re-ranking
   let filtered = filterByDocType(reranked, FilterMode.BALANCED)
   if (queryFlag) {
     filtered = filterByFlag(filtered, queryFlag, FilterMode.BALANCED)
   }
   ```

**Validation:**
- Question Malta → 0 docs Cayman/Marshall
- Question codes → <10% articles blogs

**Skills requis:** @yacht-legal-ai/lib/doc-type-tagger.ts

---

### 📦 TODO T022 - Multi-Pass Retrieval (CODEX)
**Priority:** MEDIUM  
**Duration:** 18 min  
**Status:** PENDING

**Tasks:**
1. Créer `lib/multi-pass-retrieval.ts`:
   ```typescript
   async function multiPassRetrieval(query: string, passes: number = 2) {
     // Pass 1: Query originale
     const chunks1 = await searchDocuments(query, topK: 10)
     
     // Pass 2: Query enrichie avec termes des meilleurs chunks
     const enrichedQuery = extractKeyTerms(chunks1.slice(0, 3))
     const chunks2 = await searchDocuments(enrichedQuery, topK: 5)
     
     // Merge + deduplicate
     return deduplicateChunks([...chunks1, ...chunks2])
   }
   ```

2. Activer seulement pour questions complexes:
   ```typescript
   function isComplexQuery(query: string): boolean {
     return (
       query.split(' ').length > 15 ||
       (query.match(/et|or|ainsi que/gi) || []).length >= 2 ||
       extractCitedCodes(query).length >= 2
     )
   }
   ```

3. Intégrer dans `lib/rag-pipeline.ts`:
   ```typescript
   const chunks = isComplexQuery(query)
     ? await multiPassRetrieval(query, 2)
     : await searchDocuments(query, topK: 15)
   ```

**Validation:**
- Question "LY3 et REG manning 50m" → 2 passes
- Chunks uniques > single-pass (+20%)

**Skills requis:** @yacht-legal-ai/lib/question-processor.ts

---

### 📦 TODO T023 - Ajustements Prompt Gemini (ANTIGRAVIT)
**Priority:** MEDIUM  
**Duration:** 10 min  
**Status:** PENDING

**Tasks:**
1. Renforcer section codes prioritaires dans `lib/gemini.ts`:
   ```
   RÈGLE ABSOLUE - HIÉRARCHIE SOURCES:
   
   NIVEAU 1 (OBLIGATOIRE si disponible):
   - Codes cités dans question (LY3, REG, etc.)
   - Extraire TOUS articles/sections pertinents
   - Citer numéros articles précis
   
   NIVEAU 2 (COMPLÉMENTAIRE):
   - Autres codes applicables (SOLAS, MLC)
   - OGSR officiels
   - Lois nationales
   
   NIVEAU 3 (CONTEXTE UNIQUEMENT):
   - Guides professionnels
   - Articles techniques (SI codes insuffisants)
   
   ⛔ INTERDIT:
   - Citer article blog si code disponible
   - Ignorer code cité dans question
   ```

2. Ajouter template exemples concrets:
   ```
   EXEMPLE CORRECT (Question Malta 45m construit 2000):
   
   "Pour l'immatriculation d'un yacht de 45m construit en 2000 à Malte:
   
   [Source: OGSR Part III, Article 12, pages 15-17] - Éligibilité...
   [Source: Malta CYC 2020, Section 4.2, page 8] - Inspections...
   [Source: Merchant Shipping Act, Article 34] - Procédure...
   
   ⚠️ Âge du yacht (24 ans): Inspection renforcée requise (>20 ans)."
   ```

3. Ajouter validation stricte pavillon:
   ```
   Si question mentionne pavillon spécifique:
   - PRIORITÉ ABSOLUE: docs ce pavillon
   - Autres pavillons: INTERDITS sauf comparaison explicite demandée
   ```

**Validation:**
- Prompt system >500 lignes claires
- Exemples concrets présents

**Skills requis:** Prompt engineering Anthropic (balises XML)

---

### 📦 TODO T024 - Tests E2E Nouveaux Scénarios (ANTIGRAVIT)
**Priority:** HIGH  
**Duration:** 15 min  
**Status:** PENDING

**Tasks:**
1. Étendre `scripts/test-rag-v2-improvements.ts` avec:
   ```typescript
   // Test 7: Âge yacht pris en compte
   async function testYachtAgeContext() {
     const query = "Immatriculation Malta yacht 45m construit 2000"
     const response = await chatCompletion(query)
     
     assert(response.includes("24 ans") || response.includes(">20 ans"))
     assert(response.includes("inspection") || response.includes("survey"))
   }
   
   // Test 8: Taille yacht → SOLAS
   async function testYachtSizeInference() {
     const query = "Obligations manning yacht commercial 52m Cayman"
     const response = await chatCompletion(query)
     
     assert(response.includes("SOLAS") || response.includes("MLC"))
     assert(response.includes("500 GT") || response.includes(">50"))
   }
   
   // Test 9: Filtrage strict pavillon
   async function testStrictFlagFiltering() {
     const query = "Conditions registration Malta yacht 40m"
     const { sources } = await retrievalPipeline(query)
     
     const nonMaltaDocs = sources.filter(s => 
       !s.documentName.toLowerCase().includes('malta')
     )
     assert(nonMaltaDocs.length === 0, "Docs hors Malta détectés")
   }
   
   // Test 10: Multi-pass questions complexes
   async function testMultiPassRetrieval() {
     const query = "Selon LY3 et REG, obligations manning et safety 50m"
     const { sources } = await retrievalPipeline(query)
     
     const ly3Chunks = sources.filter(s => s.documentName.includes('LY3'))
     const regChunks = sources.filter(s => s.documentName.includes('REG'))
     
     assert(ly3Chunks.length >= 3, "LY3 insuffisant")
     assert(regChunks.length >= 3, "REG insuffisant")
   }
   ```

2. Créer script validation production:
   ```bash
   # scripts/validate-perplexity-fixes.sh
   echo "🧪 Validation corrections Perplexity..."
   
   npx tsx scripts/test-rag-v2-improvements.ts
   
   if [ $? -eq 0 ]; then
     echo "✅ Tous tests passés"
   else
     echo "❌ Tests échoués - Voir logs"
   fi
   ```

**Validation:**
- 10/10 tests passent
- Logs détaillés pour chaque test

**Skills requis:** @yacht-legal-ai/scripts/test-* patterns

---

### 📦 TODO T025 - Documentation Architecture V3 (CLAUDE)
**Priority:** LOW  
**Duration:** 8 min  
**Status:** PENDING

**Tasks:**
1. Créer `ARCHITECTURE_RAG_V3.md`:
   ```markdown
   # Architecture RAG V3 - Corrections Perplexity
   
   ## Problèmes Résolus
   1. ✅ Context extraction (taille, âge, pavillon)
   2. ✅ Filtrage strict documents
   3. ✅ Multi-pass retrieval
   4. ✅ Prompt enrichi exemples
   
   ## Pipeline Complet
   [Diagramme mermaid]
   Query → Context extraction → Multi-pass → Filtering → Re-ranking → Prompt enrichi → Gemini
   
   ## Métriques V1 → V2 → V3
   | Métrique | V1 | V2 | V3 |
   |----------|----|----|----| 
   | Chunks | 5 | 15 | 15-20 (multi-pass) |
   | Docs/réponse | 1-2 | 8-12 | 10-15 |
   | Codes prioritaires | 20% | 95% | 98% |
   | Faux négatifs | 40% | 5% | <2% |
   | Context awareness | 0% | 0% | 100% |
   ```

2. Mettre à jour `CLAUDE.md` avec résumé final

**Validation:**
- Doc claire, exemples concrets
- Diagrammes mermaid présents

---

═══════════════════════════════════════════════════════════════════

## 🤖 DISTRIBUTION AGENTS

### 🔧 CODEX (Window 5) - Backend/Data
**Charge:** 3 TODOs (T020, T021, T022)  
**Durée estimée:** 45 min  
**Priorité:** HIGH

**Ordre exécution:**
1. T020 - Context extraction (15 min)
2. T021 - Filtrage strict (12 min)
3. T022 - Multi-pass retrieval (18 min)

**Skills à utiliser:**
- @yacht-legal-ai/lib/doc-type-tagger.ts
- @yacht-legal-ai/lib/chunker.ts
- @yacht-legal-ai/lib/question-processor.ts

**Validation:**
- Tests unitaires pour chaque fonction
- Intégration dans rag-pipeline.ts
- Logs détaillés

---

### 🧠 ANTIGRAVIT (Window 4) - Prompts/Tests
**Charge:** 2 TODOs (T023, T024)  
**Durée estimée:** 25 min  
**Priorité:** MEDIUM

**Ordre exécution:**
1. T023 - Prompt Gemini (10 min)
2. T024 - Tests E2E (15 min)

**Skills à utiliser:**
- Prompt engineering Anthropic
- @yacht-legal-ai/scripts/test-* patterns

**Validation:**
- Prompt >500 lignes claires
- 10/10 tests E2E passent

---

### 📝 CLAUDE (Window 2) - Documentation
**Charge:** 1 TODO (T025)  
**Durée estimée:** 8 min  
**Priorité:** LOW

**Exécution:** Après T020-T024 terminés

**Validation:**
- ARCHITECTURE_RAG_V3.md complet
- CLAUDE.md mis à jour

---

═══════════════════════════════════════════════════════════════════

## 📊 MÉTRIQUES SUCCÈS

### Critères Validation (OBLIGATOIRES)
1. ✅ Context extraction: 100% (size, age, flag)
2. ✅ Filtrage strict: 0 docs hors pavillon
3. ✅ Multi-pass: +20% chunks questions complexes
4. ✅ Prompt enrichi: Exemples concrets présents
5. ✅ Tests E2E: 10/10 passent
6. ✅ Faux négatifs: <2%
7. ✅ Citations codes: >98%

### Métriques Production (Monitoring 7 jours)
- Taux satisfaction utilisateur (feedback)
- Latence moyenne <5s
- Fallback internet <5%
- Citations pertinentes >95%

---

═══════════════════════════════════════════════════════════════════

## 🚀 LANCEMENT ORCHESTRATION

### Phase 1: Exploration (5 min)
```bash
# Vérifier état actuel fichiers
cd /home/julien/Documents/iayacht/yacht-legal-ai
ls -la lib/context-extractor*.ts
ls -la lib/doc-filter.ts
ls -la lib/multi-pass-retrieval.ts
```

### Phase 2: Distribution (2 min)
**Commandes tmux:**
```bash
SESSION="orchestration-iayacht"

# CODEX - T020-T022
tmux send-keys -t $SESSION:5 "TODO T020-T022: Tu dois implémenter 3 fonctionnalités backend pour corriger problèmes Perplexity. Utilise agents library @yacht-legal-ai/lib/* pour patterns existants.

T020 (15 min): Compléter lib/context-extractor.ts
- extractYachtSize(query) avec regex /(\d+)\s*m/
- extractYachtAge(query) avec regex /built\s+in\s+(\d{4})/
- buildContextPrompt(context) avec inférences SOLAS/MLC
- Intégrer dans lib/gemini.ts

T021 (12 min): Créer lib/doc-filter.ts
- filterByDocType() avec MIN_SCORES par type
- filterByFlag() en mode STRICT/BALANCED
- Intégrer dans lib/rag-pipeline.ts après re-ranking

T022 (18 min): Créer lib/multi-pass-retrieval.ts
- multiPassRetrieval() avec 2 passes
- isComplexQuery() pour activation conditionnelle
- Intégrer dans lib/rag-pipeline.ts

VALIDATION: Tests unitaires + logs détaillés

Une fois terminé, documente dans CLAUDE.md section Task Completion Log avec ID T020-T022 DONE." Enter

sleep 5

# ANTIGRAVIT - T023-T024
tmux send-keys -t $SESSION:4 "TODO T023-T024: Tu dois améliorer prompts Gemini et créer tests E2E. Utilise patterns @yacht-legal-ai/scripts/*.

T023 (10 min): Renforcer lib/gemini.ts
- Hiérarchie sources (Codes NIVEAU 1 > OGSR NIVEAU 2 > Articles NIVEAU 3)
- Template exemple concret Malta 45m 2000
- Validation stricte pavillon (INTERDITS hors pavillon)

T024 (15 min): Étendre scripts/test-rag-v2-improvements.ts
- Test 7: testYachtAgeContext() → âge détecté
- Test 8: testYachtSizeInference() → SOLAS si >50m
- Test 9: testStrictFlagFiltering() → 0 docs hors pavillon
- Test 10: testMultiPassRetrieval() → 3+ chunks par code cité

VALIDATION: Prompt >500 lignes, 10/10 tests passent

Une fois terminé, documente dans CLAUDE.md section Task Completion Log avec ID T023-T024 DONE." Enter
```

### Phase 3: Monitoring (Continu)
```bash
# Boucle toutes les 60 secondes
while true; do
  echo "=== CODEX (T020-T022) ==="
  tmux capture-pane -t $SESSION:5 -p | tail -15
  
  echo "=== ANTIGRAVIT (T023-T024) ==="
  tmux capture-pane -t $SESSION:4 -p | tail -15
  
  sleep 60
done
```

### Phase 4: Validation Ralph (Après TODO T020-T024 DONE)
```bash
# Tests E2E
cd /home/julien/Documents/iayacht/yacht-legal-ai
npx tsx scripts/test-rag-v2-improvements.ts

# Si erreurs → Debug cycle
tmux send-keys -t $SESSION:5 "Analyse erreurs tests E2E et corrige: [erreurs]" Enter
```

### Phase 5: Documentation (T025)
```bash
# Claude termine T025
# (exécuté manuellement après validation tests)
```

---

═══════════════════════════════════════════════════════════════════

## ✅ CHECKLIST FINALE

- [ ] T020: Context extraction complet (CODEX)
- [ ] T021: Filtrage strict documents (CODEX)
- [ ] T022: Multi-pass retrieval (CODEX)
- [ ] T023: Prompt Gemini enrichi (ANTIGRAVIT)
- [ ] T024: Tests E2E 10/10 (ANTIGRAVIT)
- [ ] T025: Documentation V3 (CLAUDE)
- [ ] Tests E2E validation complète
- [ ] Métriques succès atteintes
- [ ] CLAUDE.md mis à jour
- [ ] Prêt pour production

---

**Orchestrateur:** AMP  
**Durée totale estimée:** 1h18 min  
**Mode:** Automatique avec monitoring continu  
**Méthode:** Ralph (Test/Debug/Fix) activée post-implémentation

**PRÊT À LANCER L'ORCHESTRATION** 🚀
