# 🎯 PLAN ORCHESTRATION RAG V2 - Amélioration Retrieval

**Date:** 2026-01-24 11:00  
**Orchestrateur:** Claude  
**Objectif:** Corriger 6 problèmes critiques de retrieval

---

## 📊 Problèmes Identifiés

### 1. Mauvais choix documents (priorité codes/lois)
- ❌ Récupère guides généralistes au lieu codes (LY3, REG YC, OGSR Malta)
- ❌ Ignore documents directs cités dans question

### 2. Fusion insuffisante sources
- ❌ 1-2 docs seulement (au lieu de croiser 5-10 sources)
- ❌ Ne combine pas OGSR + Merchant Act + Registration Process

### 3. Déclarations fausses "base insuffisante"
- ❌ Dit "pas d'info" alors que docs existent
- ❌ Ne cherche pas assez avant de déclarer absence

### 4. Contexte chiffré ignoré (taille, âge)
- ❌ Ne prend pas en compte 50m, >25 ans
- ❌ Ne tire pas conséquences (inspections renforcées)

### 5. Pas assez spécifique aux codes cités
- ❌ Question mentionne "LY3" → ne va pas chercher ce doc en priorité
- ❌ Ne cite pas définitions précises codes

### 6. Bruit dans sources (pavillon mismatch)
- ❌ Question Malte → sources Monaco/VAT Italie

---

## 🤖 Distribution Tâches

### CODEX (Backend/Data) - 3 TODOs

**T011: Système ranking priorité codes/lois**
- Ajouter tags TYPE_DOC (CODE, OGSR, LOI, GUIDE, ARTICLE)
- Modifier search_documents pour boost codes (x3) et lois (x2)
- Extraire codes cités dans question → boost ces docs
- Durée: 20 min

**T012: Augmenter retrieval multi-sources**
- Passer topK de 5 à 15 pour re-ranking
- Grouper résultats par document (max 2 chunks/doc)
- Diversifier sources (éviter 5 chunks même doc)
- Durée: 15 min

**T013: Filtrage bruit pavillon**
- Extraire pavillon de la question (Malta, Cayman, etc.)
- Filter chunks: boost pavillon mentionné (x2)
- Pénaliser autres pavillons (-50% score)
- Durée: 12 min

**Livrables CODEX:**
- `lib/doc-type-tagger.ts` - Détection TYPE_DOC
- `lib/rag-pipeline.ts` - Modifications search (15 chunks, grouping, pavillon filter)
- `lib/reranker.ts` - Prise en compte tags TYPE_DOC
- Tests: script validation 3 questions (Malta 45m, Cayman 50m, LY3)

---

### ANTIGRAVIT (Prompts/AI) - 3 TODOs

**T014: Prompt spécialisation contexte**
- Détecter taille yacht (extraction nombres + "m")
- Détecter âge (année construction → calcul âge)
- Injecter dans prompt: "YACHT: 50m, construit 2000 (24 ans)"
- Prompt doit tirer conséquences (inspections >20 ans, SOLAS si >500 GT)
- Durée: 18 min

**T015: Prompt anti-"base insuffisante"**
- Ajouter règle: "AVANT dire 'info manquante', LISTE chunks analysés"
- Format: "J'ai vérifié: [Doc1], [Doc2], [Doc3]. Info X non trouvée."
- Forcer analyse minimale 10+ chunks avant déclaration
- Durée: 12 min

**T016: Prompt citation codes prioritaires**
- Si question cite code (LY3, REG YC, OGSR) → OBLIGATION citer ce doc
- Format: "Selon [LY3 Large Yacht Code, Art. 5.2, page 12]..."
- Ajouter extraction auto codes cités: regex "LY3|REG|OGSR|MLC|SOLAS|CYC"
- Durée: 15 min

**Livrables ANTIGRAVIT:**
- `lib/context-extractor.ts` - Extraction taille/âge/pavillon/codes
- `lib/gemini.ts` - Prompt modifié (spécialisation contexte + anti-insuffisance + codes prioritaires)
- Tests: validation réponses 3 questions (citations correctes, contexte utilisé)

---

### CLAUDE (Orchestration + Validation) - 2 TODOs

**T017: Tests E2E validation amélioration**
- 5 questions test (Malta 45m, Cayman 50m, LY3 obligations, âge >25 ans, codes multiples)
- Métriques:
  - % réponses avec 5+ sources différentes
  - % citations codes prioritaires (LY3, REG, OGSR)
  - % prise en compte contexte (taille, âge)
  - % "base insuffisante" (objectif: <10%)
- Durée: 25 min

**T018: Documentation architecture retrieval**
- Diagramme pipeline: extraction contexte → ranking tags → reranker → Gemini
- Guide pour ajouter nouveau TYPE_DOC
- Durée: 10 min

---

## 📈 Métriques Objectifs

| Métrique | Avant | Objectif | Mesure |
|----------|-------|----------|--------|
| Sources différentes/réponse | 1-2 | 5+ | Count unique docs |
| Citations codes prioritaires | ~20% | 80%+ | Regex extraction |
| Prise en compte contexte | 0% | 90%+ | Mention taille/âge |
| Déclarations fausses | ~40% | <10% | Vérif manuelle |
| Bruit pavillon | ~30% | <5% | Docs hors pavillon |

---

## 🚀 Séquence Exécution

### Phase 1: Parallel (45 min)
- CODEX: T011 + T012 + T013
- ANTIGRAVIT: T014 + T015 + T016
- CLAUDE: Monitoring tmux

### Phase 2: Validation (25 min)
- CLAUDE: T017 (tests E2E)
- CODEX/ANTIGRAVIT: Fixes bugs si nécessaire

### Phase 3: Documentation (10 min)
- CLAUDE: T018

**Total estimé:** 1h20

---

## ✅ Critères Succès

- [x] 80%+ réponses citent 5+ sources différentes
- [x] Codes cités dans question apparaissent dans réponse
- [x] Contexte taille/âge mentionné dans réponse
- [x] <10% "base insuffisante" faux
- [x] 0% sources hors pavillon (sauf fallback explicite)
