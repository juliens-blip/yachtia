# Mission APEX: Fix Mode Dégradé Gemini (Phase A)

**Priority:** CRITICAL  
**Deadline:** 30min  
**Dependencies:** None

## Objectif

Stopper le mode dégradé en réduisant les appels Gemini + retry intelligent pour 429/Resource exhausted.

## Actions

### 1. Unifier Retry Logic (Fix Double Retry)
**Fichier:** `yacht-legal-ai/app/api/chat/route.ts` (lignes 140-210)

**Problème actuel:**
- Retry dans `gemini.ts` (runWithRetry: 3 attempts, backoff 2/4/8s)
- + Retry validation dans `route.ts` (maxAttempts=3)
- = 9 appels Gemini possibles → rate limit garanti

**Fix:**
```typescript
// route.ts ligne ~165
// OLD: maxAttempts = 3
const maxAttempts = 1  // Ne pas retry validation ici

// OLD: if (!validated) { retry... }
// NEW: Si validation échoue, post-traitement local citations au lieu de retry
if (!validated) {
  console.warn('[RAG] Validation failed, post-processing citations locally')
  const citations = extractCitationsLocally(answer, chunks)
  if (citations.length < 3) {
    answer += `\n\n**Sources complémentaires:** ${chunks.slice(0,3).map(c => `[${c.document_name}]`).join(', ')}`
  }
}
```

### 2. Retry "Resource Exhausted" comme Rate Limit
**Fichier:** `yacht-legal-ai/lib/gemini.ts` (ligne 320-340)

**Bug actuel:**
```typescript
// OLD: Ne retry que sur 429
const isRateLimit = message.includes('429')
```

**Fix:**
```typescript
const isRateLimit = 
  message.includes('429') ||
  message.includes('Resource exhausted') ||
  message.includes('quota') ||
  message.includes('RESOURCE_EXHAUSTED')
```

### 3. Backoff Plus Long + Jitter
**Fichier:** `yacht-legal-ai/lib/gemini.ts` (ligne 315-325)

**OLD:**
```typescript
const delays = [2000, 4000, 8000]  // 2s, 4s, 8s
```

**NEW:**
```typescript
const delays = [2000, 5000, 10000, 20000]  // 2s, 5s, 10s, 20s
const jitter = Math.random() * 1000
await new Promise(r => setTimeout(r, delays[attempt] + jitter))
```

### 4. Instrumentation Fallback Raison
**Fichier:** `yacht-legal-ai/app/api/chat/route.ts` (ligne 108-120)

**Ajouter:**
```typescript
const buildFallbackAnswer = (reason: string, details: any) => {
  console.log('[RAG] FALLBACK TRIGGERED', {
    reason,
    gemini_attempts: details.attempts || 0,
    chunks_count: chunks.length,
    unique_docs: new Set(chunks.map(c => c.document_id)).size,
    error_message: details.error || 'none'
  })
  
  fallbackUsed = true
  fallbackReason = reason  // Ajouter variable tracking
  
  // Synthèse minimale au lieu de snippet
  const summary = chunks.slice(0, 3).map(c => 
    `**${c.document_name}**: ${c.chunk_content.slice(0, 200)}...`
  ).join('\n\n')
  
  return `⚠️ Réponse générée en mode simplifié (${reason}).\n\n${summary}\n\n*Veuillez réessayer dans quelques instants.*`
}
```

## Tests Validation

```bash
cd yacht-legal-ai

# Test 1: Stress 5 questions parallèles (doit gérer sans fallback)
npm run test:stress -- --concurrent 5

# Test 2: Vérifier logs fallback_reason
tail -f logs/gemini-rag.log | grep FALLBACK

# Metrics attendues:
# - Fallback rate < 10%
# - Max gemini_attempts <= 4 (au lieu de 9)
# - Latence < 12s (backoff 20s max)
```

## Deliverables

1. `app/api/chat/route.ts` - Retry unique + instrumentation
2. `lib/gemini.ts` - Resource exhausted handling + backoff long
3. Logs: fallback_reason, attempts, chunks_count

**Success:** Test stress 5/5 OK, fallback < 10%, logs clairs

**Report to:** T040 master task + CLAUDE orchestrator
