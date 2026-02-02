# 🎯 PLAN T-050: Fix Utilisation Sources RAG

**Date:** 2026-01-28  
**Orchestrateur:** Claude  
**Rapport exploration:** Voir rapport AMP ci-dessus  
**Priorité:** CRITICAL

---

## 📋 PROBLÈME RACINE

**Diagnostic:** IA cite 1-3 docs génériques au lieu de 5-10 docs spécifiques pavillon/code/thème.

**Causes identifiées:**
1. ✅ Filtrage pavillon APRÈS re-ranking (gaspillage slots)
2. ✅ Penalties pavillon trop faibles (0.5x → docs hors-pavillon passent)
3. ✅ Pas de filtrage category (PAVILLON_*) dans SQL
4. ✅ Prompt Gemini pas assez strict (autorise citations hors-pavillon)
5. ✅ 3 fonctions extractFlag() incohérentes

---

## 🎯 OBJECTIFS MESURABLES

| Métrique | Avant | Objectif | Test |
|----------|-------|----------|------|
| Docs distincts par réponse | 1-3 | 5-10 | E2E question Malta |
| % docs hors pavillon | ~40% | <5% | Question Malta → 0 docs Monaco/France |
| Codes cités prioritaires | ~60% | 95% | Question CYC → CYC 2020/2025 en top 3 |
| Citations sources fortes | ~30% | 80% | Codes > Articles |

---

## 📦 TÂCHES À DISTRIBUER

### T-051: Unifier Extraction Flags (CODEX - 20min)

**Fichiers:**
- Créer `lib/flag-normalizer.ts` (nouveau)
- Modifier `lib/context-extractor.ts`
- Modifier `lib/doc-type-tagger.ts`
- Modifier `lib/doc-filter.ts`

**Objectif:**
- 1 seul module `normalizeFlag()` + `FLAG_CANONICAL_NAMES`
- Mapping: `PAVILLON_MALTA` → `Malta`, `PAVILLON_CAYMAN_REG` → `Cayman`
- Normalisation: `malta` → `Malta`, `MALTA` → `Malta`

**Acceptance:**
```typescript
normalizeFlag('malta') === 'Malta'
normalizeFlag('PAVILLON_MALTA') === 'Malta'
normalizeFlag('Marshall Islands') === 'Marshall'
```

---

### T-052: Hard Filter Pavillon (CODEX - 25min)

**Fichiers:**
- `lib/search-documents.ts` (L251-270)
- `lib/rag-pipeline.ts` (inject category filter)

**Objectif:**
1. Détecter pavillon dans query (`extractYachtContext`)
2. Si pavillon détecté → filter chunks AVANT re-ranking
3. Éliminer hard (score = 0) les docs hors pavillon
4. Passer `filter_category` à SQL si pavillon unique

**Acceptance:**
- Question "Malta registration" → 0 chunks Monaco/France avant re-ranking
- Logs: `🚫 Filtered 12 chunks (wrong flag: Monaco, France)`

---

### T-053: Renforcer Penalties Pavillon (CODEX - 10min)

**Fichiers:**
- `lib/doc-type-tagger.ts` (L18)

**Objectif:**
```typescript
// AVANT
FLAG_MISMATCH_PENALTY = 0.5

// APRÈS
FLAG_MISMATCH_PENALTY = 0.05  // Quasi-élimination
```

**Acceptance:**
- Doc Monaco (similarity 0.9) + Malta query → score final 0.045 (éliminé)

---

### T-054: Category Filter Dynamique (CODEX - 20min)

**Fichiers:**
- `lib/rag-pipeline.ts`
- `lib/context-extractor.ts` (extend pour retourner categories)

**Objectif:**
1. Détecter pavillon/codes → mapper vers categories
2. Passer array categories à `searchDocuments()`
3. SQL: filter `WHERE category = ANY($categories)`

**Mapping:**
```typescript
const CATEGORY_MAP = {
  'Malta': ['PAVILLON_MALTA', 'PAVILLON_MALTE'],
  'Cayman': ['PAVILLON_CAYMAN', 'PAVILLON_CAYMAN_REG'],
  'CYC': ['CODE_CYC', 'CODES'],
  'eligibility': ['PAVILLON_*', 'OGSR']
}
```

**Acceptance:**
- Question "Malta eligibility" → SQL filtre `category IN ('PAVILLON_MALTA', 'PAVILLON_MALTE', 'OGSR')`

---

### T-055: Prompt Gemini Strict Pavillon (CODEX - 15min)

**Fichiers:**
- `lib/gemini.ts` (L201-242)

**Objectif:**
Ajouter dans `COMMENT RÉPONDRE`:

```
7. STRICTE CONFORMITÉ PAVILLON:
   - Si question concerne UN pavillon spécifique (Malta, Cayman, RMI...):
     → Tu DOIS citer UNIQUEMENT les documents de CE pavillon
     → INTERDIT de citer Monaco si question Malta
     → INTERDIT de citer France si question Cayman
   - Si question multi-pavillons explicite: précise quel doc pour quel pavillon

8. PRIORISER SOURCES FORTES:
   - Codes/Conventions (CYC, LY3, MARPOL) > OGSR > Lois nationales > Guides > Articles
   - Si conflit code vs article: toujours citer le code
```

**Acceptance:**
- Question Malta → 0 citations docs Monaco/France même s'ils parlent de registration

---

### T-056: Augmenter Boost Codes Cités (CODEX - 5min)

**Fichiers:**
- `lib/doc-type-tagger.ts` (L16)

**Objectif:**
```typescript
// AVANT
QUERY_CODE_BOOST = 3.0

// APRÈS
QUERY_CODE_BOOST = 5.0
```

**Acceptance:**
- Question "CYC compliance" → docs CYC 2020/2025 dans top 3

---

### T-057: Tests E2E Fix Sources (CODEX - 30min)

**Fichiers:**
- Créer `scripts/test-rag-sources-fix.ts`

**Tests:**

```typescript
const TESTS = [
  {
    question: "Malta registration eligibility for 38m yacht built 2010",
    expectedDocs: ['OGSR Malta', 'Registration Process', 'Merchant Shipping Act'],
    forbiddenDocs: ['Monaco', 'France', 'Cayman'],
    minDistinctDocs: 5
  },
  {
    question: "CYC 2025 compliance for 50m commercial yacht",
    expectedDocs: ['CYC 2020', 'CYC 2025', 'Synopsis'],
    minDistinctDocs: 3
  },
  {
    question: "RMI deletion certificate then Malta registration",
    expectedDocs: ['MI-100', 'MI-103', 'OGSR Malta'],
    forbiddenDocs: ['France', 'Italy'],
    minDistinctDocs: 6
  }
]
```

**Acceptance:**
- 3/3 tests PASS
- Rapport: nb docs distincts, % docs hors pavillon, codes prioritaires

---

## 📊 ORDRE D'EXÉCUTION

```
Phase 1 (Fondations - 35min):
  T-051 (flags) → T-053 (penalties) → T-056 (boost codes)

Phase 2 (Filtrage - 45min):
  T-052 (hard filter) → T-054 (category filter)

Phase 3 (Prompt - 15min):
  T-055 (prompt strict)

Phase 4 (Validation - 30min):
  T-057 (tests E2E)

TOTAL: ~2h
```

---

## 🤖 DISTRIBUTION

**CODEX (window 5):** T-051 → T-057 (toutes tâches)

**Méthode Ralph:**
- Après chaque tâche: tests unitaires
- Après T-057: tests E2E complets

**Documentation:**
- Chaque tâche terminée → update CLAUDE.md Task Completion Log

---

## ✅ CRITÈRES DE SUCCÈS GLOBAUX

- [ ] Question Malta → 0 docs Monaco/France
- [ ] Question CYC → CYC 2020/2025 en top 3
- [ ] 5+ documents distincts par réponse
- [ ] 80%+ citations sources fortes (codes > articles)
- [ ] Tests E2E 3/3 PASS
- [ ] tsc --noEmit clean

---

**Plan créé par Claude Orchestrator - Session 28 janvier 2026**
