# Task T040: Fixer Mode Dégradé + Améliorer Choix Docs Gemini

**Status:** 🆕 NEW  
**Priority:** CRITICAL  
**Assigned:** APEX + Implementation Agents  
**Created:** 2026-01-30 12:30  
**Deadline:** 2026-01-30 18:00

---

## 🎯 Objectif

Résoudre les 4 problèmes critiques de l'IA détectés par Perplexity:

1. **Mode simplifié/service surchargé** - L'IA retombe trop souvent en fallback dégradé
2. **Mauvais choix de docs** - Prend blogs au lieu de lois/codes officiels
3. **Pas de combinaison multi-sources** - N'utilise qu'1-2 docs au lieu de 5-8
4. **Base insuffisante** - Déclare trop vite qu'elle n'a pas l'info alors qu'elle existe

---

## 📊 Situation Actuelle (Test Perplexity)

**Question:** "Comment transférer un yacht de RMI vers Malte?"

**Résultat actuel:**
- ✅ Retrieval OK: CYC 2020 + CYC 2025 récupérés
- ❌ Réponse en mode dégradé: "⚠️ Réponse générée en mode simplifié"
- ❌ Ne répond pas aux 3 sous-questions (RMI→Malte, adaptations techniques, TVA)
- ❌ Recrache juste quelques lignes du CYC sans synthèse

**Docs attendus:**
- RMI: MI-100, MI-103, MI-107 (dés-immatriculation)
- Malta: OGSR, Registration Process, Merchant Shipping Act
- Technique: CYC 2020/2025
- TVA: VAT Smartbook, IYC, Yacht Welfare, BTM, Yacht Hunter

---

## 🔍 Root Causes Identifiées

### 1. Mode Fallback Trop Fréquent

**Fichier:** `app/api/chat/route.ts` (lignes 108-199)

```typescript
// Triggers fallback on:
// - Rate limit Gemini (429)
// - Timeout (> 5s)
// - Empty chunks (< 1)
// - Errors non-gérés

const buildFallbackAnswer = (reason: string) => {
  fallbackUsed = true
  return `⚠️ Réponse générée en mode simplifié (service temporairement surchargé).\n\n${chunks[0]?.chunk_content.slice(0, 500)}...`
}
```

**Problèmes:**
- Timeout 5s trop court pour questions complexes
- Rate limit non géré (queue insuffisante)
- Pas de retry intelligent avec backoff
- Fallback = snippet au lieu de synthèse minimale

### 2. Prompt Gemini Pas Assez Strict

**Fichier:** `lib/gemini.ts` (lignes 250-350)

**Prompt actuel:**
```
Analyse profondément les documents fournis. Cite au minimum 3 sources PDF.
```

**Manque:**
- ❌ Priorité explicite: lois/codes > blogs/articles
- ❌ Obligation de combiner 5+ sources si disponibles
- ❌ Interdiction de déclarer "base insuffisante" sans avoir testé tous les chunks
- ❌ Structuration stricte des réponses multi-aspects

### 3. Retrieval Non-Optimisé pour Multi-Aspect

**Fichier:** `lib/rag-pipeline.ts`

**Actuel:**
- Retrieve 8 chunks max (ligne 90: `slice(0, 8)`)
- Question expansion 2-3 variantes (basique)
- Pas de détection multi-aspect (RMI→Malte = 4 aspects)

**Devrait:**
- Détecter question multi-aspect → retrieve 15-20 chunks
- Query decomposition: "RMI exit" + "Malta entry" + "CYC compliance" + "VAT transfer"
- Re-ranking par catégorie (25% RMI, 25% Malta, 25% Technique, 25% Fiscal)

### 4. Metadata Search Insuffisant

**Fichier:** `lib/search-documents.ts`

**Actuel:**
- Threshold 0.6 (trop strict)
- Pas de boost catégorie (loi/code vs blog)
- Fallback keyword threshold 0.2 (trop laxiste)

**Devrait:**
- Threshold dynamique par type doc (0.5 pour lois, 0.65 pour blogs)
- Boost score +0.2 si category='Official Law' ou 'Maritime Code'
- Metadata enrichment: flag "authoritative_source"

---

## 🎯 Plan d'Implémentation

### Phase 1: Fix Mode Dégradé (APEX)
**Agent:** APEX  
**Time:** 30min

**Actions:**
1. Augmenter timeout Gemini: 5s → 10s (questions complexes)
2. Retry logic intelligent: 3 attempts, backoff exponentiel (1s, 2s, 4s)
3. Queue Gemini: concurrency 1 → 2 (allow 2 parallel calls)
4. Fallback amélioré: si rate limit, synthèse minimale des chunks au lieu de snippet

**Fichiers modifiés:**
- `app/api/chat/route.ts` (retry logic)
- `lib/gemini.ts` (timeout, queue, fallback response)

**Tests:**
```bash
# Après modifs, tester 5 questions en parallèle
npm run test:stress -- --concurrent 5
```

---

### Phase 2: Prompt Strict Multi-Sources (ANTIGRAVIT)
**Agent:** ANTIGRAVIT  
**Time:** 45min

**Actions:**
1. Renforcer prompt Gemini avec règles explicites:
   - PRIORITÉ: Lois/Codes officiels > Blogs/Articles
   - OBLIGATION: Utiliser 5+ sources si 5+ chunks fournis
   - INTERDICTION: Déclarer "base insuffisante" sans avoir analysé TOUS chunks
   - FORMAT: Questions multi-aspect → sections 1/2/3/4 obligatoires

2. Exemples few-shot dans prompt:
   ```
   BAD: "Le CYC 2020 indique que..." [1 seule source]
   GOOD: "Selon CYC 2020 (section 4.2) + Malta OGSR (article 15) + RMI MI-103..."
   ```

3. Validation post-génération:
   - Si réponse < 200 mots ET chunks > 5 → REJECT, re-générer
   - Si citations < 3 ET chunks >= 3 → REJECT, re-générer

**Fichiers modifiés:**
- `lib/gemini.ts` (system prompt lines 250-280)
- `lib/response-validator.ts` (add multi-source check)

**Tests:**
```bash
# Vérifier citations multi-sources
npm run test:multi-aspect
```

---

### Phase 3: Retrieval Multi-Aspect (CODEX)
**Agent:** CODEX  
**Time:** 60min

**Actions:**
1. Détection multi-aspect dans `question-processor.ts`:
   ```typescript
   function detectMultiAspect(query: string): string[] {
     const patterns = [
       /transfert.*vers/i,         // géographique
       /procédure.*documents/i,    // administratif
       /TVA.*fiscal/i,             // fiscal
       /technique.*compliance/i    // technique
     ]
     return patterns.filter(p => p.test(query)).map(toAspect)
   }
   ```

2. Query decomposition si multi-aspect détecté:
   ```typescript
   // Question: "Transfert RMI→Malte?"
   // Decompose en:
   aspects = [
     "RMI exit procedure deregistration",
     "Malta registration entry requirements",
     "CYC compliance technical modifications",
     "VAT implications yacht transfer"
   ]
   ```

3. Retrieve par aspect (5 chunks × 4 aspects = 20 chunks):
   ```typescript
   const chunksByAspect = await Promise.all(
     aspects.map(a => retrieveRelevantChunks(a, undefined, 5, 0.55))
   )
   const merged = deduplicateAndBalance(chunksByAspect, maxTotal=15)
   ```

**Fichiers modifiés:**
- `lib/question-processor.ts` (add detectMultiAspect, decomposeQuery)
- `app/api/chat/route.ts` (integrate multi-aspect retrieval)
- `lib/rag-pipeline.ts` (add deduplicateAndBalance)

**Tests:**
```bash
# Test RMI→Malta question
npm run test:multi-aspect -- --query "transfert yacht RMI Malte"
```

---

### Phase 4: Boost Official Docs (CODEX)
**Agent:** CODEX  
**Time:** 30min

**Actions:**
1. Metadata boost dans `search-documents.ts`:
   ```typescript
   function boostOfficialDocs(results: SearchRow[]): SearchRow[] {
     return results.map(r => {
       let boost = 0
       if (r.category === 'Official Law') boost += 0.2
       if (r.category === 'Maritime Code') boost += 0.15
       if (r.document_name.match(/MI-\d+|CYC \d+|OGSR|Merchant Shipping Act/i)) boost += 0.1
       return { ...r, similarity: Math.min(1.0, r.similarity + boost) }
     })
   }
   ```

2. Threshold dynamique:
   ```typescript
   const thresholdByType = {
     'Official Law': 0.50,
     'Maritime Code': 0.50,
     'Blog': 0.70,
     'Article': 0.68
   }
   ```

**Fichiers modifiés:**
- `lib/search-documents.ts` (add boostOfficialDocs, dynamic thresholds)

**Tests:**
```bash
# Vérifier que RMI MI-103 apparaît avant blogs
npm run test:doc-priority
```

---

## 🧪 Tests de Validation

### Test 1: Question Multi-Aspect (RMI→Malta)
```bash
npm run test:multi-aspect
```

**Expected:**
- ✅ 10+ chunks récupérés
- ✅ Categories: RMI (25%) + Malta (25%) + Technique (25%) + Fiscal (25%)
- ✅ Réponse structurée en 4 sections
- ✅ 5+ citations (MI-103, OGSR, CYC 2020, VAT Smartbook, etc.)
- ✅ Latence < 8s (timeout 10s OK)
- ✅ Pas de fallback

### Test 2: Stress Test (5 Questions Parallèles)
```bash
npm run test:stress -- --concurrent 5
```

**Expected:**
- ✅ 5/5 réponses complètes (pas de fallback)
- ✅ Queue Gemini gère bien (concurrency 2)
- ✅ Latence max < 12s

### Test 3: Priority Official Docs
```bash
npm run test:doc-priority
```

**Expected:**
- ✅ Top 5 chunks = lois/codes (pas de blogs)
- ✅ MI-103 similarity > 0.75 (boost applied)
- ✅ Blog similarity < 0.65 (threshold strict)

---

## 📦 Deliverables

1. **Code modifié:**
   - `app/api/chat/route.ts` (retry + timeout)
   - `lib/gemini.ts` (queue + prompt strict)
   - `lib/question-processor.ts` (multi-aspect detection)
   - `lib/search-documents.ts` (boost official docs)
   - `lib/response-validator.ts` (multi-source check)

2. **Tests:**
   - `test-scripts/test-multi-aspect.ts`
   - `test-scripts/test-stress.ts`
   - `test-scripts/test-doc-priority.ts`

3. **Documentation:**
   - `RAPPORT_T040_GEMINI_FIXES.md`

---

## 🚀 Execution

**Orchestration:** APEX coordonne les 3 agents (APEX + ANTIGRAVIT + CODEX)

**Workflow:**
1. APEX: Fix mode dégradé (30min) → Test stress
2. ANTIGRAVIT: Prompt strict (45min) || CODEX: Boost docs (30min) → Tests parallèles
3. CODEX: Multi-aspect retrieval (60min) → Test RMI→Malta
4. APEX: Validation finale E2E (15min)

**Total time:** ~2h30

**Success Criteria:**
- ✅ Test RMI→Malta: 4 sections, 5+ citations, 0% fallback
- ✅ Stress test: 5/5 OK, latence < 12s
- ✅ Doc priority: Top 5 = official sources

---

## 📝 Notes

- Perplexity détecte que le retrieval fonctionne (CYC 2020/2025 OK), donc focus sur génération + fallback
- Question RMI→Malta = cas parfait pour tester multi-aspect + official docs
- Si timeout 10s encore insuffisant après tests, envisager 15s pour questions ultra-complexes
