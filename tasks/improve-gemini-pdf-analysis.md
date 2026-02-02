# 🎯 Task: Améliorer l'Analyse PDF par Gemini

**Orchestrateur:** Claude  
**Date:** 2026-01-22  
**Objectif:** Améliorer la capacité de Gemini à parser et analyser les PDFs avant de recourir à des données internet

## 📋 Contexte
Gemini répond parfois avec des données internet sans avoir correctement analysé les documents PDF disponibles dans la base RAG. Il faut améliorer:
1. La lecture/parsing des PDFs
2. L'analyse sémantique des questions
3. Le recrutement des chunks pertinents
4. La profondeur d'analyse avant fallback internet

---

## 🤖 Distribution des Tâches

### **CODEX** - Amélioration du Pipeline RAG
**Priorité:** HIGH  
**Durée estimée:** 2h

#### TODO CODEX
1. **Améliorer la fonction de chunking PDF** (`lib/pdf-processor.ts`)
   - ✅ Augmenter overlap entre chunks (actuellement 100 → 200 tokens)
   - ✅ Ajouter métadonnées contextuelles (section, headers)
   - ✅ Détecter et préserver structures (listes, tables)

2. **Optimiser la fonction search_documents** (Supabase)
   - ✅ Abaisser match_threshold (0.7 → 0.6 pour plus de résultats)
   - ✅ Augmenter match_count (5 → 10 chunks)
   - ✅ Ajouter re-ranking sémantique post-search

3. **Tests de validation**
   - ✅ Créer script test avec 5 questions types
   - ✅ Vérifier nombre de chunks récupérés
   - ✅ Mesurer pertinence moyenne

**Fichiers à modifier:**
- `yacht-legal-ai/lib/pdf-processor.ts`
- `yacht-legal-ai/MIGRATION_FIX_TYPE.sql` (search_documents function)
- `yacht-legal-ai/lib/rag-pipeline.ts`

**Validation:**
```bash
npm run test:rag
```

---

### **ANTIGRAVIT** - Amélioration du Prompt Gemini
**Priorité:** HIGH  
**Durée estimée:** 1.5h

#### TODO ANTIGRAVIT
1. **Modifier le system prompt** (`lib/gemini.ts`)
   - ✅ Ajouter instruction: "Analyser PROFONDÉMENT tous les chunks fournis"
   - ✅ Forcer citation des sources PDF avant internet
   - ✅ Demander justification si "pas de réponse dans docs"

2. **Ajouter étape de pre-processing de la question**
   - ✅ Extraire keywords juridiques de la question
   - ✅ Reformuler en 2-3 variantes sémantiques
   - ✅ Chercher avec chaque variante

3. **Implémenter logging détaillé**
   - ✅ Logger les chunks envoyés à Gemini
   - ✅ Logger la réponse + sources citées
   - ✅ Détecter fallback internet vs RAG

**Fichiers à modifier:**
- `yacht-legal-ai/lib/gemini.ts`
- `yacht-legal-ai/app/api/chat/route.ts`

**Validation:**
```bash
npm run dev
# Tester avec question type: "Quelles sont les obligations du vendeur dans un contrat de vente de yacht?"
```

---

## 🧪 Tests Type Ralph (Agent)

### Phase 1: Tests Unitaires (CODEX)
```bash
# Test chunking amélioré
node scripts/test-chunking.js

# Test search_documents avec nouveaux paramètres
psql -f test-search-function.sql

# Test re-ranking
npm run test:rerank
```

**Critères de succès:**
- ✅ Chunks avec 200 tokens overlap
- ✅ Métadonnées présentes (section, page)
- ✅ search_documents retourne 10+ résultats si disponibles
- ✅ Re-ranking améliore pertinence de 20%+

---

### Phase 2: Tests d'Intégration (ANTIGRAVIT)
```bash
# Test du nouveau prompt
curl -X POST localhost:3000/api/chat \
  -d '{"message":"Quelles sont les obligations du vendeur?"}' \
  | jq '.sources'

# Vérifier logging
tail -f logs/gemini-rag.log
```

**Critères de succès:**
- ✅ Gemini cite 3+ chunks PDF dans réponse
- ✅ Pas de fallback internet si chunks pertinents
- ✅ Logs montrent analyse détaillée

---

### Phase 3: Tests End-to-End (ORCHESTRATEUR Claude)
```bash
# 5 questions test
npm run test:e2e-rag
```

**Questions types:**
1. "Quelles sont les obligations du vendeur dans un contrat de vente?"
2. "Comment fonctionne la garantie des vices cachés?"
3. "Quelle est la procédure pour un litige maritime?"
4. "Quels documents sont nécessaires pour l'immatriculation?"
5. "Quelles sont les responsabilités du capitaine?"

**Critères de succès:**
- ✅ 4/5 questions répondues avec sources PDF uniquement
- ✅ Latence < 3s par réponse
- ✅ Chunks pertinents = 80%+ de la réponse

---

## 📊 Métriques de Succès

| Métrique | Avant | Objectif | Status |
|----------|-------|----------|--------|
| Chunks récupérés | 5 | 10 | ⏳ |
| Pertinence chunks | ~60% | 80%+ | ⏳ |
| Citations PDF | ~40% | 80%+ | ⏳ |
| Fallback internet | ~60% | <20% | ⏳ |
| Latence moyenne | 2-3s | <3s | ⏳ |

---

## 🔄 Workflow d'Orchestration

1. **CODEX START** (parallel execution)
   - Attendre completion des 3 TODOs
   - Soumettre rapport de test

2. **ANTIGRAVIT START** (parallel execution)
   - Attendre completion des 3 TODOs
   - Soumettre rapport de test

3. **CLAUDE REVIEW** (sequential)
   - Analyser rapports CODEX + ANTIGRAVIT
   - Lancer tests Phase 3
   - Valider métriques

4. **ITERATION SI BESOIN**
   - Si métriques < objectif → nouvelle itération
   - Ajuster prompts/paramètres

---

## 📝 Notes pour LLMs

**CODEX:** Focus sur performance et qualité des chunks. Ne pas casser la compatibilité SQL existante.

**ANTIGRAVIT:** Le prompt doit rester conversationnel. Pas de "robot lawyer" vibes.

**CLAUDE:** Tu valides et orchestres. Si conflit entre CODEX/ANTIGRAVIT, tu décides.

---

## ✅ Checklist Finale

- [ ] CODEX: 3 TODOs complétés + tests passés
- [ ] ANTIGRAVIT: 3 TODOs complétés + tests passés
- [ ] CLAUDE: Tests E2E passés (4/5 questions)
- [ ] Métriques objectifs atteints
- [ ] Documentation mise à jour
- [ ] Commit + push changes
