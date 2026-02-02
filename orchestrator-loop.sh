#!/bin/bash
# Orchestrator Loop - Distribution automatique de TODOs
# Session: orchestration-iayacht

SESSION="orchestration-iayacht"
MEMORY_FILE="/home/julien/Documents/iayacht/CLAUDE.md"
ANTIGRAVIT_WINDOW=2
CODEX_WINDOW=5
TODO_COUNTER=26  # Dernier ID dans CLAUDE.md: T025

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[ORCHESTRATOR]${NC} $(date +'%H:%M:%S') - $1"
}

send_to_agent() {
    local window=$1
    local message=$2
    local agent_name=$3
    
    log "Envoi TODO à ${BLUE}$agent_name${NC} (window $window)"
    tmux send-keys -t "$SESSION:$window" "$message" Enter
}

check_agent_status() {
    local window=$1
    local agent_name=$2
    
    echo -e "${YELLOW}=== $agent_name (window $window) ===${NC}"
    tmux capture-pane -t "$SESSION:$window" -p | tail -15
}

check_memory_for_completion() {
    local todo_id=$1
    grep -q "| $todo_id | .* | ✅ DONE |" "$MEMORY_FILE" 2>/dev/null
}

distribute_todos() {
    local next_id=$1
    
    # TODO pour CODEX (Backend/Data)
    local codex_todo="TODO_ID: T${next_id}

📋 TÂCHES (3 items - utilise agent library et apex si complexe):

1. **Tests E2E complets RAG V3**
   - Script: scripts/test-e2e-rag-v3.ts
   - Valider: context extraction, filtrage doc, multi-pass
   - Skills: utilise @agent-library/testing-agent

2. **Métriques production**
   - Logger latence/citations/fallback dans lib/metrics-logger.ts
   - Dashboard simple console
   - Skills: utilise @agent-library/monitoring-agent

3. **Optimisation performances**
   - Analyser bottlenecks pipeline RAG
   - Cache embeddings si pertinent
   - Skills: utilise @apex pour analyse complexe

⚠️ IMPORTANT:
- Utilise OBLIGATOIREMENT les agents de library (skills/)
- Tâches complexes → délègue à @apex
- Une fois terminé → écris dans CLAUDE.md section 'Task Completion Log':
  | $(date +'%Y-%m-%d %H:%M') | CODEX | T${next_id} | <durée> | ✅ DONE | <notes> |"

    send_to_agent $CODEX_WINDOW "$codex_todo" "CODEX"
    
    # TODO pour ANTIGRAVIT (AI/Prompts)
    local antigravit_id=$((next_id + 1))
    local antigravit_todo="TODO_ID: T${antigravit_id}

📋 TÂCHES (4 items - utilise agent library et apex si complexe):

1. **Validation prompt Gemini**
   - Vérifier règles strictes citations (min 3)
   - Tester edge cases (docs contradictoires)
   - Skills: utilise @agent-library/prompt-testing-agent

2. **A/B testing prompts**
   - Créer 2 variantes prompt
   - Comparer qualité citations
   - Skills: utilise @apex pour analyse statistique

3. **Documentation utilisateur**
   - README_RAG_V3.md: guide utilisation
   - Exemples queries complexes
   - Skills: utilise @agent-library/documentation-agent

4. **Monitoring qualité réponses**
   - Script validation citations auto
   - Alertes si qualité < seuil
   - Skills: utilise @agent-library/quality-agent + @apex

⚠️ IMPORTANT:
- Utilise OBLIGATOIREMENT les agents de library
- Tâches complexes → délègue à @apex
- Une fois terminé → écris dans CLAUDE.md section 'Task Completion Log':
  | $(date +'%Y-%m-%d %H:%M') | ANTIGRAVIT | T${antigravit_id} | <durée> | ✅ DONE | <notes> |"

    send_to_agent $ANTIGRAVIT_WINDOW "$antigravit_todo" "ANTIGRAVIT"
    
    # Incrémenter compteur
    echo $((antigravit_id + 1)) > /tmp/orchestrator_todo_counter
}

# Boucle principale
log "🚀 Démarrage orchestrateur automatique"
log "📂 Mémoire: $MEMORY_FILE"
log "🔄 Boucle: check toutes les 60s"

# Initialiser compteur
echo $TODO_COUNTER > /tmp/orchestrator_todo_counter

# Distribution initiale
log "📤 Distribution initiale des TODOs..."
distribute_todos $TODO_COUNTER

# Boucle infinie
while true; do
    sleep 60  # Attendre 1 minute
    
    log "🔍 Vérification statut agents..."
    
    # Lire compteur actuel
    CURRENT_ID=$(cat /tmp/orchestrator_todo_counter)
    
    # Vérifier CODEX (T026, T028, T030...)
    CODEX_TODO=$((CURRENT_ID - 2))
    if check_memory_for_completion "T$(printf "%03d" $CODEX_TODO)"; then
        log "✅ CODEX terminé T$(printf "%03d" $CODEX_TODO) → nouvelle TODO"
        distribute_todos $CURRENT_ID
        CURRENT_ID=$(cat /tmp/orchestrator_todo_counter)
    else
        check_agent_status $CODEX_WINDOW "CODEX" | tail -5
    fi
    
    # Vérifier ANTIGRAVIT (T027, T029, T031...)
    ANTIGRAVIT_TODO=$((CURRENT_ID - 1))
    if check_memory_for_completion "T$(printf "%03d" $ANTIGRAVIT_TODO)"; then
        log "✅ ANTIGRAVIT terminé T$(printf "%03d" $ANTIGRAVIT_TODO) → nouvelle TODO"
        # Antigravit redistribué avec Codex
    else
        check_agent_status $ANTIGRAVIT_WINDOW "ANTIGRAVIT" | tail -5
    fi
    
    log "⏳ Sleep 60s avant prochain cycle..."
done
