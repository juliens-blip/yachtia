# 🔍 MONITORING MANUEL - Session 2026-01-26

## Commandes Rapides

```bash
# Vérifier CODEX en temps réel
tmux capture-pane -t orchestration-iayacht:5 -p | tail -30

# Voir CODEX en direct
tmux attach -t orchestration-iayacht
# Puis Ctrl+B puis 5

# Checker status fichiers créés
ls -lth /home/julien/Documents/iayacht/yacht-legal-ai/lib/ | head -15

# Grep complétion dans MEMOIRE
grep "DONE" /home/julien/Documents/iayacht/MEMOIRE_SESSION_2026-01-26.md | tail -10
```

## Timeline Monitoring

### 15:27 - Batch 2 en cours
- T-RAG-003: topK=20 + Diversity
- T-RAG-004: Query Expansion
- T-RAG-006: Context-Aware Scorer
- **CODEX:** 93% context left, working...

### 15:30 - Check #1 (à faire dans 3 min)
```bash
tmux capture-pane -t orchestration-iayacht:5 -p | tail -30
```

### 15:35 - Check #2 (à faire dans 8 min)
```bash
# Vérifier si Batch 2 terminé
ls -l /home/julien/Documents/iayacht/yacht-legal-ai/lib/context-aware-scorer.ts
# Si existe → Batch 2 DONE → Envoyer Batch 3
```

---

## Prochain Check Manuel: 15:35

**Si Batch 2 DONE:**
1. Update MEMOIRE_SESSION
2. Envoyer Batch 3 à CODEX
3. Documenter dans CLAUDE.md

**Si Batch 2 EN COURS:**
1. Attendre 5 min
2. Re-check à 15:40
