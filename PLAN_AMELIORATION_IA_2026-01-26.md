# 🎯 PLAN AMÉLIORATION IA - 2026-01-26

## 📋 Contexte
**Date:** 2026-01-26
**Objectif:** Résoudre les 6 problèmes critiques d'IA identifiés
**Orchestration:** Claude (orchestrateur) → CODEX (exécution)
**Projet:** /home/julien/Documents/iayacht/yacht-legal-ai

---

## 🐛 Problèmes Identifiés

### 1. Mauvais choix de documents (retrieval)
- ❌ Récupère guides généralistes au lieu de codes/lois cités
- ❌ Ignore documents OGSR Malta, Merchant Shipping Act, LY3, REG Yacht Code
- ❌ Ne priorise pas les docs officiels réglementaires

### 2. Fusion insuffisante de sources
- ❌ Se limite à 1-2 documents
- ❌ Ne combine pas OGSR + Merchant Shipping Act + Registration Process
- ❌ Réponses superficielles vs techniques détaillées

### 3. Fausses déclarations "base insuffisante"
- ❌ Affirme ne pas avoir l'info alors qu'elle est dans les docs
- ❌ Exemple: "pas d'info sur inspections Malta" alors que Registration Process les détaille

### 4. Pas de contexte chiffré (50m, année 2000)
- ❌ Ne tire aucune conséquence de l'âge du yacht (>20/25 ans)
- ❌ Ne tient pas compte de la taille (50m = >500 GT = MLC/SOLAS)

### 5. Pas assez spécifique aux codes cités
- ❌ Question mentionne "LY3 et REG Yacht Code" mais ne les priorise pas
- ❌ Ne cite pas les définitions précises des codes

### 6. Bruit dans les sources
- ❌ Question Malte → sources Monaco et VAT Italie apparaissent
- ❌ Sélection finale non filtrée par pavillon/thème

---

## 🚀 PLAN D'ACTION

### 🎯 Phase 1: Améliorer le Retrieval (Priorisation Documents)
**Objectif:** Prioriser codes/lois cités dans la question

#### TODO T-RAG-001 (CODEX) - Document Scoring avec Priorité Codes/Lois
```yaml
Description: Implémenter système de scoring qui booste les documents officiels
Fichier: lib/document-scorer.ts (NOUVEAU)
Actions:
  - Créer fonction scoreDocument(docName, category, query)
  - Si query contient "LY3" → boost docs avec "LY3" dans titre (x3)
  - Si query contient "REG Yacht Code" → boost docs REG (x3)
  - Si query contient pavillon (Malta, Cayman, etc.) → boost docs ce pavillon (x2.5)
  - Catégories officielles (PAVILLON_*) → score de base x2
  - Articles généraux/blogs → score de base x0.5
  - Retourner multiplicateur de score
Intégration: Appliquer dans search-documents.ts après similarity
Tests: 
  - Query "LY3" → docs LY3 en top 3
  - Query "Malta registration" → docs PAVILLON_MALTA prioritaires
Output: Mettre status dans CLAUDE.md quand terminé
```

#### TODO T-RAG-002 (CODEX) - Filtrage Bruit (Pavillon/Thème)
```yaml
Description: Filtrer documents non pertinents par pavillon et thème
Fichier: lib/document-filter-enhanced.ts (NOUVEAU)
Actions:
  - Détection pavillon dans query (Malta, Cayman, IoM, Marshall, etc.)
  - Si pavillon détecté → filtrer SEULEMENT docs de ce pavillon + docs génériques
  - Détection thème (registration, VAT, crew, safety, etc.)
  - Si thème détecté → exclure docs d'autres thèmes
  - Exemple: query "Malta registration" → exclure VAT Italie, Monaco
Intégration: Appliquer AVANT similarity search dans search-documents.ts
Tests:
  - Query "Malta deletion certificate" → 0 docs Monaco
  - Query "Cayman crew requirements" → 0 docs VAT
Output: Mettre status dans CLAUDE.md quand terminé
```

---

### 🎯 Phase 2: Fusion Multi-Sources
**Objectif:** Combiner 5-8 documents au lieu de 1-2

#### TODO T-RAG-003 (CODEX) - Augmenter topK et Diversifier Sources
```yaml
Description: Passer de topK=10 à topK=20 et forcer diversité docs
Fichier: lib/search-documents.ts (MODIFIER)
Actions:
  - Changer topK par défaut de 10 à 20
  - Après retrieval initial, regrouper par documentId
  - Si >80% chunks viennent du même doc → re-query avec ce doc exclu
  - Forcer minimum 3 docs différents dans top 10 résultats
  - Implémenter "diversity penalty": si doc déjà représenté, réduire score chunks suivants (-0.1)
Intégration: Modifier retrieveRelevantChunks() dans rag-pipeline.ts
Tests:
  - Vérifier top 10 contient ≥3 docs différents
  - Vérifier top 20 contient ≥5 docs différents
Output: Mettre status dans CLAUDE.md quand terminé
```

#### TODO T-RAG-004 (CODEX) - Query Expansion pour Multi-Sources
```yaml
Description: Générer 2-3 variantes de query pour récupérer sources complémentaires
Fichier: lib/question-processor.ts (MODIFIER)
Actions:
  - Pour query type "conditions registration Malta", générer:
    * Query 1: "Malta registration eligibility requirements"
    * Query 2: "Malta ship registry documents process"
    * Query 3: "OGSR Malta vessel registration criteria"
  - Récupérer top 7 chunks par query (total 21)
  - Dé-dupliquer par chunkId
  - Re-rank les 21 chunks avec reranker.ts
  - Retourner top 15 final
Intégration: Modifier retrieveRelevantChunks() pour mode multi-query
Tests:
  - Vérifier 3 queries générées par expansion
  - Vérifier résultats de sources variées
Output: Mettre status dans CLAUDE.md quand terminé
```

---

### 🎯 Phase 3: Context-Aware Retrieval
**Objectif:** Tenir compte du contexte (taille yacht, âge, pavillon)

#### TODO T-RAG-005 (CODEX) - Extraction Contexte (Taille, Âge, Pavillon)
```yaml
Description: Extraire automatiquement métadonnées yacht de la question
Fichier: lib/context-extractor-enhanced.ts (NOUVEAU)
Actions:
  - Regex pour taille: "(\d+)\s*(m|metres|meters|feet)" → convertir en mètres
  - Regex pour âge: "built\s*(\d{4})" ou "(\d{4})\s*yacht" → calculer âge
  - Regex pour pavillon: "(Malta|Cayman|Marshall|IoM|British|Luxembourg)" etc.
  - Regex pour GT: "(\d+)\s*GT"
  - Si taille >24m → ajouter à contexte "Large Yacht"
  - Si taille >500GT ou taille >50m → "SOLAS/MLC applicable"
  - Si âge >15 ans → "Enhanced inspections"
  - Si âge >25 ans → "Age-related restrictions"
  - Retourner objet: {size, age, flag, gt, tags: string[]}
Intégration: Appeler dans retrieveRelevantChunks() avant search
Tests:
  - "45m yacht built 2000 Malta" → {size:45, age:26, flag:"Malta", tags:["Large Yacht", "Enhanced inspections", "Age-related"]}
Output: Mettre status dans CLAUDE.md quand terminé
```

#### TODO T-RAG-006 (CODEX) - Boost Documents selon Contexte
```yaml
Description: Booster docs pertinents selon contexte extrait
Fichier: lib/context-aware-scorer.ts (NOUVEAU)
Actions:
  - Si tags contient "Large Yacht" → boost docs LY3/REG Yacht Code/SOLAS (x2)
  - Si tags contient "Enhanced inspections" → boost docs inspection/survey (x2)
  - Si tags contient "Age-related" → boost docs waivers/age-exemptions (x2.5)
  - Si flag extrait (ex: Malta) → boost docs PAVILLON_MALTA (x3)
  - Si GT >500 → boost docs MLC/STCW/manning (x2)
  - Combiner avec T-RAG-001 (document-scorer.ts)
Intégration: Appliquer après T-RAG-001 dans search-documents.ts
Tests:
  - "50m yacht Malta" → LY3+REG YC+PAVILLON_MALTA dans top 5
  - "yacht 2000" → docs inspection âge dans top 10
Output: Mettre status dans CLAUDE.md quand terminé
```

---

### 🎯 Phase 4: Amélioration Prompt Gemini
**Objectif:** Forcer Gemini à utiliser TOUS les chunks et répondre avec spécificité

#### TODO T-RAG-007 (CODEX) - Prompt Engineering Strict
```yaml
Description: Renforcer prompt Gemini pour analyse exhaustive
Fichier: lib/gemini.ts (MODIFIER - fonction askGemini)
Actions:
  - Ajouter règle: "Tu DOIS analyser TOUS les documents fournis ci-dessous"
  - Ajouter règle: "Si une information existe dans les documents, tu DOIS la citer"
  - Ajouter règle: "N'affirme JAMAIS que l'info manque sans avoir vérifié TOUS les chunks"
  - Ajouter règle: "Pour un yacht de Xm construit en YYYY, mentionne implications âge/taille"
  - Ajouter règle: "Cite les codes/lois PRÉCIS (articles, sections) mentionnés dans docs"
  - Ajouter règle: "Format citations: [Source: nom_doc, page X, section Y]"
  - Ajouter exemple de bonne réponse dans few-shot prompt
Intégration: Modifier systemPrompt dans askGemini()
Tests:
  - Vérifier réponse cite ≥5 documents différents
  - Vérifier réponse mentionne taille/âge yacht si fourni
  - Vérifier 0 "information manquante" si doc existe
Output: Mettre status dans CLAUDE.md quand terminé
```

#### TODO T-RAG-008 (CODEX) - Post-Processing Vérification
```yaml
Description: Vérifier réponse Gemini avant envoi utilisateur
Fichier: lib/response-validator.ts (NOUVEAU)
Actions:
  - Analyser réponse Gemini
  - Compter nombre de sources citées → si <3, relancer avec prompt "CITE PLUS DE SOURCES"
  - Détecter phrases type "information manquante", "base insuffisante"
  - Pour chaque phrase détectée, chercher keywords dans chunks fournis
  - Si keyword trouvé → relancer Gemini: "L'info est dans [doc], re-analyse"
  - Maximum 2 re-try puis retourner
Intégration: Wrapper autour de askGemini() dans chat/route.ts
Tests:
  - Réponse avec 1 source → re-try automatique
  - Réponse "pas d'info X" + chunks contiennent X → re-try
Output: Mettre status dans CLAUDE.md quand terminé
```

---

### 🎯 Phase 5: Tests & Validation
**Objectif:** Valider les améliorations avec cas réels

#### TODO T-RAG-009 (CODEX) - Tests E2E Cas Réels
```yaml
Description: Créer tests E2E avec questions problématiques
Fichier: scripts/test-rag-ia-improvements.ts (NOUVEAU)
Actions:
  - Test 1: "Malta registration requirements 45m yacht built 2000"
    * Vérifier docs OGSR + Merchant Shipping Act + Registration Process présents
    * Vérifier mention âge >20 ans et inspections
    * Vérifier ≥5 sources citées
  - Test 2: "Cayman REG obligations 50m commercial yacht according to LY3 and REG Yacht Code"
    * Vérifier LY3 + REG YC dans top 3
    * Vérifier mention SOLAS/MLC (50m = >500 GT)
    * Vérifier définition "large commercial yacht"
  - Test 3: "Malta deletion certificate documents needed"
    * Vérifier 0 docs Monaco/VAT/autres pavillons
    * Vérifier liste complète documents
  - Scorer chaque test: PASS si critères OK, FAIL sinon
  - Générer rapport markdown
Tests: npm run test:rag-ia
Output: Rapport dans TEST_RAG_IA_RESULTS.md + status CLAUDE.md
```

---

## 📊 MÉTRIQUES DE SUCCÈS

| Métrique | Avant | Objectif | Comment Mesurer |
|----------|-------|----------|-----------------|
| Docs officiels en top 5 | ~40% | >80% | T-RAG-001, T-RAG-002 |
| Sources différentes citées | 1-2 | 5-8 | T-RAG-003, T-RAG-004 |
| Fausses "info manquante" | ~30% | <5% | T-RAG-008 |
| Prise en compte contexte | 0% | >90% | T-RAG-005, T-RAG-006 |
| Bruit (docs hors sujet) | ~20% | <5% | T-RAG-002 |
| Spécificité codes/lois | Faible | Élevée | T-RAG-007 |

---

## 🔄 DÉPENDANCES ENTRE TODOs

```
T-RAG-001 (Document Scoring) ───┐
                                 ├──> T-RAG-006 (Context-Aware Scorer)
T-RAG-005 (Context Extractor) ───┘

T-RAG-002 (Document Filter) ───> T-RAG-003 (topK + Diversity)

T-RAG-004 (Query Expansion) ───> T-RAG-003 (topK + Diversity)

T-RAG-003 ───┐
T-RAG-006 ───┼──> T-RAG-007 (Prompt Engineering)
T-RAG-002 ───┘

T-RAG-007 ───> T-RAG-008 (Response Validator)

T-RAG-008 ───> T-RAG-009 (Tests E2E)
```

---

## 🎯 ORDRE D'EXÉCUTION RECOMMANDÉ

### 🔵 Batch 1 (Parallèle) - Scoring & Filtrage
- T-RAG-001 (Document Scoring)
- T-RAG-002 (Document Filter)
- T-RAG-005 (Context Extractor)

### 🟢 Batch 2 (Parallèle) - Multi-Sources & Context-Aware
- T-RAG-003 (topK + Diversity)
- T-RAG-004 (Query Expansion)
- T-RAG-006 (Context-Aware Scorer) [dépend de T-RAG-001 et T-RAG-005]

### 🟡 Batch 3 (Séquentiel) - Prompt & Validation
- T-RAG-007 (Prompt Engineering)
- T-RAG-008 (Response Validator)

### 🔴 Batch 4 (Final) - Tests
- T-RAG-009 (Tests E2E)

---

## ✅ CONSIGNES POUR CODEX

**Pour chaque TODO:**
1. Créer le fichier avec commentaires détaillés
2. Implémenter la logique selon spec
3. Écrire tests unitaires si applicable
4. Intégrer dans les fichiers existants si MODIFIER
5. **Une fois terminé, METTRE À JOUR CLAUDE.md section "Task Completion Log" avec:**
   - Task ID
   - Statut: ✅ DONE
   - Fichiers créés/modifiés
   - Note courte (1 ligne)

**Format mise à jour CLAUDE.md:**
```
| 2026-01-26 10:30 | CODEX | T-RAG-001 | 12 min | ✅ DONE | Document scoring avec boost x3 codes/lois. Fichier: lib/document-scorer.ts |
```

---

## 🔄 ORCHESTRATION CLAUDE

**Boucle automatique (toutes les 60 secondes):**

1. Vérifier CLAUDE.md Task Completion Log
2. Identifier TODOs CODEX terminés
3. Si Batch 1 complet (T-RAG-001, T-RAG-002, T-RAG-005) → Envoyer Batch 2 à CODEX
4. Si Batch 2 complet → Envoyer Batch 3 à CODEX
5. Si Batch 3 complet → Envoyer Batch 4 à CODEX
6. Si Batch 4 complet → Rapport final utilisateur
7. Si TODO pas fini après 60s → sleep 60s et re-check

---

## 📝 TEMPLATE PROMPT CODEX

```
<task>
Implémente TODO [T-RAG-XXX] selon la spec du plan.

SPEC:
[copier la spec du TODO depuis ce fichier]

CONSIGNES:
- Utilise les librairies existantes (reranker.ts, chunker.ts, etc.) si pertinent
- Écris du code TypeScript strict avec types
- Ajoute commentaires JSDoc
- Teste manuellement avec exemples
- Une fois terminé, UPDATE CLAUDE.md Task Completion Log avec format:
  | 2026-01-26 HH:MM | CODEX | T-RAG-XXX | Xmin | ✅ DONE | [résumé 1 ligne] |
</task>

<acceptance_criteria>
- Fichier créé/modifié selon spec
- Code compile sans erreurs TypeScript
- Logique implémentée exactement selon Actions listées
- CLAUDE.md mis à jour
</acceptance_criteria>

<output_format>
1. Code implémenté
2. Ligne mise à jour CLAUDE.md
3. Note courte (2-3 lignes) sur ce qui a été fait
</output_format>
```

---

**🎯 PLAN PRÊT - En attente de démarrage orchestration**
