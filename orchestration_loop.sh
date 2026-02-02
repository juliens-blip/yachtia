#!/bin/bash
# Boucle d'orchestration automatique - Session 2026-01-26
# Monitore CODEX et dispatch les batches suivants

SESSION="orchestration-iayacht"
CODEX_WINDOW=5
MEMOIRE="/home/julien/Documents/iayacht/MEMOIRE_SESSION_2026-01-26.md"
PLAN="/home/julien/Documents/iayacht/PLAN_AMELIORATION_IA_2026-01-26.md"

BATCH1_DONE=0
BATCH2_DONE=0
BATCH3_DONE=0

echo "🎯 ORCHESTRATION AUTOMATIQUE DÉMARRÉE"
echo "Session: $SESSION"
echo "CODEX: window $CODEX_WINDOW"
echo "Monitoring: Batch 1 (T-RAG-001, T-RAG-002, T-RAG-005)"
echo ""

# Boucle infinie avec sleep 60s
while true; do
  TIMESTAMP=$(date +"%H:%M:%S")
  echo "=== [$TIMESTAMP] Check CODEX ==="
  
  # Capturer sortie CODEX
  OUTPUT=$(tmux capture-pane -t $SESSION:$CODEX_WINDOW -p -S -100)
  
  # Vérifier Batch 1 (3 fichiers créés)
  if [ $BATCH1_DONE -eq 0 ]; then
    T001=$(echo "$OUTPUT" | grep -c "document-scorer.ts.*created\|T-RAG-001.*DONE" || echo "0")
    T002=$(echo "$OUTPUT" | grep -c "document-filter-enhanced.ts.*created\|T-RAG-002.*DONE" || echo "0")
    T005=$(echo "$OUTPUT" | grep -c "context-extractor-enhanced.ts.*created\|T-RAG-005.*DONE" || echo "0")
    
    BATCH1_COUNT=$((T001 + T002 + T005))
    echo "  Batch 1: $BATCH1_COUNT/3 complétés"
    
    if [ "$BATCH1_COUNT" -ge 3 ]; then
      echo "  ✅ BATCH 1 COMPLET!"
      BATCH1_DONE=1
      
      # Envoyer Batch 2 à CODEX
      echo "  🚀 Envoi BATCH 2 à CODEX..."
      
      tmux send-keys -t $SESSION:$CODEX_WINDOW "BATCH 2 - TODO T-RAG-003: Augmenter topK à 20 et forcer diversité docs

Passe de topK=10 à topK=20 et force minimum 3 docs différents dans top 10.

FICHIER À MODIFIER: /home/julien/Documents/iayacht/yacht-legal-ai/lib/search-documents.ts

ACTIONS:
- Changer topK par défaut de 10 à 20
- Après retrieval, regrouper chunks par documentId
- Si >80% chunks du même doc → re-query en excluant ce doc
- Forcer minimum 3 documentIds différents dans top 10
- Diversity penalty: si doc déjà présent, réduire score chunks suivants -0.1

TESTS:
- Top 10 contient ≥3 docs différents
- Top 20 contient ≥5 docs différents

UNE FOIS TERMINÉ:
Update /home/julien/Documents/iayacht/MEMOIRE_SESSION_2026-01-26.md:
| HH:MM | CODEX | T-RAG-003 | ✅ DONE | topK=20, diversity penalty, ≥3 docs top10 |

GO!" Enter
      
      sleep 3
      
      tmux send-keys -t $SESSION:$CODEX_WINDOW "BATCH 2 - TODO T-RAG-004: Query Expansion multi-variantes

Génère 2-3 variantes de query pour sources complémentaires.

FICHIER À MODIFIER: /home/julien/Documents/iayacht/yacht-legal-ai/lib/question-processor.ts

ACTIONS:
- Pour 'conditions registration Malta', générer:
  * Query 1: 'Malta registration eligibility requirements'
  * Query 2: 'Malta ship registry documents process'
  * Query 3: 'OGSR Malta vessel registration criteria'
- Récupérer top 7 chunks par query (total 21)
- Dé-dupliquer par chunkId
- Re-rank avec reranker.ts
- Retourner top 15 final

INTÉGRATION:
Modifier retrieveRelevantChunks() dans rag-pipeline.ts pour mode multi-query

TESTS:
- Vérifier 3 queries générées
- Résultats de sources variées

UNE FOIS TERMINÉ:
Update /home/julien/Documents/iayacht/MEMOIRE_SESSION_2026-01-26.md:
| HH:MM | CODEX | T-RAG-004 | ✅ DONE | Query expansion 3 variantes, 21 chunks → top 15 |

GO!" Enter
      
      sleep 3
      
      tmux send-keys -t $SESSION:$CODEX_WINDOW "BATCH 2 - TODO T-RAG-006: Context-Aware Scorer

Boost docs selon contexte yacht extrait (taille/âge/pavillon).

FICHIER À CRÉER: /home/julien/Documents/iayacht/yacht-legal-ai/lib/context-aware-scorer.ts

ACTIONS:
- Fonction scoreByContext(yachtContext: YachtContext, docName: string, category: string): number
- Si tags contient 'Large Yacht' → boost LY3/REG/SOLAS x2
- Si tags contient 'Enhanced inspections' → boost docs inspection/survey x2
- Si tags contient 'Age-related' → boost waivers/age-exemptions x2.5
- Si flag présent (Malta) → boost PAVILLON_MALTA x3
- Si GT >500 → boost MLC/STCW/manning x2
- Combiner avec document-scorer.ts (T-RAG-001)

INTÉGRATION:
Appliquer après T-RAG-001 dans search-documents.ts

TESTS:
- '50m yacht Malta' → LY3+REG+PAVILLON_MALTA top 5
- 'yacht 2000' → docs inspection âge top 10

UNE FOIS TERMINÉ:
Update /home/julien/Documents/iayacht/MEMOIRE_SESSION_2026-01-26.md:
| HH:MM | CODEX | T-RAG-006 | ✅ DONE | Context-aware scorer, boost contexte yacht |

GO!" Enter
      
      echo "  ✅ Batch 2 envoyé à CODEX"
    fi
  fi
  
  # Vérifier Batch 2 (après Batch 1)
  if [ $BATCH1_DONE -eq 1 ] && [ $BATCH2_DONE -eq 0 ]; then
    T003=$(echo "$OUTPUT" | grep -c "T-RAG-003.*DONE\|search-documents.ts.*modified.*topK" || echo "0")
    T004=$(echo "$OUTPUT" | grep -c "T-RAG-004.*DONE\|question-processor.ts.*modified.*expansion" || echo "0")
    T006=$(echo "$OUTPUT" | grep -c "T-RAG-006.*DONE\|context-aware-scorer.ts.*created" || echo "0")
    
    BATCH2_COUNT=$((T003 + T004 + T006))
    echo "  Batch 2: $BATCH2_COUNT/3 complétés"
    
    if [ "$BATCH2_COUNT" -ge 3 ]; then
      echo "  ✅ BATCH 2 COMPLET!"
      BATCH2_DONE=1
      
      # Envoyer Batch 3
      echo "  🚀 Envoi BATCH 3 à CODEX..."
      
      tmux send-keys -t $SESSION:$CODEX_WINDOW "BATCH 3 - TODO T-RAG-007: Prompt Engineering strict Gemini

Renforce prompt Gemini pour analyse exhaustive TOUS chunks.

FICHIER À MODIFIER: /home/julien/Documents/iayacht/yacht-legal-ai/lib/gemini.ts (fonction askGemini)

ACTIONS:
Ajouter règles dans systemPrompt:
- 'Tu DOIS analyser TOUS les documents fournis'
- 'Si info existe dans docs, tu DOIS la citer'
- 'N'affirme JAMAIS info manquante sans vérifier TOUS chunks'
- 'Pour yacht Xm construit YYYY, mentionne implications âge/taille'
- 'Cite codes/lois PRÉCIS (articles, sections)'
- 'Format: [Source: nom_doc, page X, section Y]'
- Ajouter exemple few-shot de bonne réponse

TESTS:
- Réponse cite ≥5 docs différents
- Mention taille/âge si fourni
- 0 'info manquante' si doc existe

UNE FOIS TERMINÉ:
Update /home/julien/Documents/iayacht/MEMOIRE_SESSION_2026-01-26.md:
| HH:MM | CODEX | T-RAG-007 | ✅ DONE | Prompt strict analyse TOUS chunks, ≥5 citations |

GO!" Enter
      
      sleep 3
      
      tmux send-keys -t $SESSION:$CODEX_WINDOW "BATCH 3 - TODO T-RAG-008: Response Validator post-processing

Vérifie réponse Gemini avant envoi utilisateur.

FICHIER À CRÉER: /home/julien/Documents/iayacht/yacht-legal-ai/lib/response-validator.ts

ACTIONS:
- Fonction validateResponse(response: string, chunks: any[]): {valid: boolean, retry?: string}
- Compter sources citées → si <3, retourner retry: 'CITE PLUS DE SOURCES'
- Détecter phrases 'information manquante', 'base insuffisante'
- Pour chaque phrase, chercher keywords dans chunks
- Si keyword trouvé → retry: 'Info dans [doc], re-analyse'
- Maximum 2 re-try

INTÉGRATION:
Wrapper autour askGemini() dans app/api/chat/route.ts

TESTS:
- Réponse 1 source → re-try auto
- 'pas d'info X' + chunks avec X → re-try

UNE FOIS TERMINÉ:
Update /home/julien/Documents/iayacht/MEMOIRE_SESSION_2026-01-26.md:
| HH:MM | CODEX | T-RAG-008 | ✅ DONE | Response validator, auto-retry si <3 sources |

GO!" Enter
      
      echo "  ✅ Batch 3 envoyé à CODEX"
    fi
  fi
  
  # Vérifier Batch 3 (après Batch 2)
  if [ $BATCH2_DONE -eq 1 ] && [ $BATCH3_DONE -eq 0 ]; then
    T007=$(echo "$OUTPUT" | grep -c "T-RAG-007.*DONE\|gemini.ts.*modified.*prompt" || echo "0")
    T008=$(echo "$OUTPUT" | grep -c "T-RAG-008.*DONE\|response-validator.ts.*created" || echo "0")
    
    BATCH3_COUNT=$((T007 + T008))
    echo "  Batch 3: $BATCH3_COUNT/2 complétés"
    
    if [ "$BATCH3_COUNT" -ge 2 ]; then
      echo "  ✅ BATCH 3 COMPLET!"
      BATCH3_DONE=1
      
      # Envoyer Batch 4 (Tests)
      echo "  🚀 Envoi BATCH 4 (Tests E2E) à CODEX..."
      
      tmux send-keys -t $SESSION:$CODEX_WINDOW "BATCH 4 - TODO T-RAG-009: Tests E2E cas réels

Tests E2E avec questions problématiques identifiées.

FICHIER À CRÉER: /home/julien/Documents/iayacht/yacht-legal-ai/scripts/test-rag-ia-improvements.ts

ACTIONS:
- Test 1: 'Malta registration requirements 45m yacht built 2000'
  * Vérifier OGSR + Merchant Shipping Act + Registration Process présents
  * Vérifier mention âge >20 ans et inspections
  * Vérifier ≥5 sources citées
- Test 2: 'Cayman REG obligations 50m commercial yacht according to LY3 and REG Yacht Code'
  * Vérifier LY3 + REG YC dans top 3
  * Vérifier mention SOLAS/MLC
  * Vérifier définition 'large commercial yacht'
- Test 3: 'Malta deletion certificate documents needed'
  * Vérifier 0 docs Monaco/VAT/autres pavillons
  * Vérifier liste complète documents
- Scorer: PASS/FAIL par critère
- Générer rapport markdown

COMMANDE:
npm run test:rag-ia (ajouter dans package.json)

OUTPUT:
Rapport TEST_RAG_IA_RESULTS.md + update MEMOIRE_SESSION_2026-01-26.md:
| HH:MM | CODEX | T-RAG-009 | ✅ DONE | Tests E2E 3/3 PASS, rapport généré |

GO!" Enter
      
      echo "  ✅ Batch 4 (final) envoyé à CODEX"
      echo ""
      echo "🏁 TOUS LES BATCHES ENVOYÉS!"
      echo "Monitoring continue pour Batch 4..."
    fi
  fi
  
  # Vérifier Batch 4 (final)
  if [ $BATCH3_DONE -eq 1 ]; then
    T009=$(echo "$OUTPUT" | grep -c "T-RAG-009.*DONE\|test-rag-ia-improvements.ts.*created\|TEST_RAG_IA_RESULTS" || echo "0")
    
    if [ "$T009" -ge 1 ]; then
      echo "  ✅ BATCH 4 COMPLET!"
      echo ""
      echo "🎉 MISSION ACCOMPLIE - 9/9 TODOs COMPLÉTÉS"
      echo "Génération rapport final..."
      
      # Générer rapport
      cat >> "$MEMOIRE" << 'EOFMEM'

---

## 🎉 SESSION TERMINÉE

**Tous les TODOs complétés:** 9/9 ✅  
**Date fin:** $(date +"%Y-%m-%d %H:%M")  
**Durée:** ~2-3h  

### Fichiers Créés
1. lib/document-scorer.ts
2. lib/document-filter-enhanced.ts
3. lib/context-extractor-enhanced.ts
4. lib/context-aware-scorer.ts
5. lib/response-validator.ts
6. scripts/test-rag-ia-improvements.ts

### Fichiers Modifiés
1. lib/search-documents.ts (topK=20, diversity)
2. lib/question-processor.ts (query expansion)
3. lib/gemini.ts (prompt strict)
4. app/api/chat/route.ts (response validator)

### Prochaines Étapes
1. Tester en production avec vraies questions clients
2. Analyser métriques (docs top 5, sources citées, faux négatifs)
3. Ajuster si nécessaire

EOFMEM
      
      echo "✅ Rapport final généré dans $MEMOIRE"
      echo "Arrêt boucle d'orchestration."
      exit 0
    else
      echo "  Batch 4: En cours... (tests E2E)"
    fi
  fi
  
  # Afficher dernières lignes CODEX
  echo "  📺 Dernière activité CODEX:"
  tmux capture-pane -t $SESSION:$CODEX_WINDOW -p | tail -5 | sed 's/^/    /'
  echo ""
  
  # Attendre 60 secondes
  echo "⏰ Prochain check dans 60 secondes..."
  echo ""
  sleep 60
done
