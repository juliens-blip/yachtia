# Mission CODEX: Retrieval Multi-Aspect (Phase B)

**Priority:** HIGH  
**Deadline:** 60min  
**Dependencies:** Phase A (retry fixes)

## Objectif

Pour questions multi-aspect (ex: "RMI→Malta?"), forcer couverture Exit/Entry/Technique/Fiscal avec 10+ documents distincts.

## Problème Actuel

**Test:** "Comment transférer un yacht de RMI vers Malte?"

**Retrieval actuel:**
- 8 chunks max (slice(0,8))
- Query expansion basique (2-3 variantes keywords)
- Souvent mono-source (CYC 2020 uniquement)

**Attendu:**
- 15+ chunks (4 aspects × 4 chunks)
- 10+ documents distincts (RMI MI-103, Malta OGSR, CYC 2020/2025, VAT Smartbook, etc.)
- Balance par aspect: 25% RMI + 25% Malta + 25% Technique + 25% Fiscal

## Actions

### 1. Détection Multi-Aspect

**Fichier:** `yacht-legal-ai/lib/question-processor.ts`

**Ajouter fonction:**
```typescript
export interface QueryAspect {
  name: string
  keywords: string[]
  weight: number
}

export function detectMultiAspect(query: string): QueryAspect[] | null {
  const patterns = {
    transfer_geo: /transf[eé]r|passage|conversion|changement.*(?:registre|pavillon|flag)/i,
    exit_dereg: /RMI|Marshall|sortie|radiation|dés?-?immatriculation|deletion/i,
    entry_reg: /Malte|Malta|entr[eé]e|immatriculation|enregistrement|registration/i,
    technical: /CYC|Commercial Yacht Code|technical|compliance|surveys|manning/i,
    fiscal: /TVA|VAT|tax|fiscal|importation|duties/i
  }

  const matches: QueryAspect[] = []

  // Transfer géographique détecté
  if (patterns.transfer_geo.test(query)) {
    // Exit aspect
    if (patterns.exit_dereg.test(query)) {
      matches.push({
        name: 'Exit_RMI',
        keywords: ['RMI', 'Marshall Islands', 'deregistration', 'deletion', 'certificate', 'discharge', 'mortgage'],
        weight: 0.25
      })
    }

    // Entry aspect
    if (patterns.entry_reg.test(query)) {
      matches.push({
        name: 'Entry_Malta',
        keywords: ['Malta', 'ship registry', 'registration', 'Part I', 'provisional', 'permanent', 'requirements', 'OGSR', 'Merchant Shipping Act'],
        weight: 0.25
      })
    }

    // Technical always relevant for transfers
    matches.push({
      name: 'Technical_Compliance',
      keywords: ['CYC', 'Commercial Yacht Code', 'compliance', 'surveys', 'safety', 'manning', 'certification'],
      weight: 0.25
    })

    // Fiscal if mentioned or Malta (VAT important)
    if (patterns.fiscal.test(query) || patterns.entry_reg.test(query)) {
      matches.push({
        name: 'Fiscal_VAT',
        keywords: ['VAT', 'tax', 'importation', 'temporary admission', 'charter VAT', 'Mediterranean', 'duties'],
        weight: 0.25
      })
    }
  }

  return matches.length >= 2 ? matches : null
}
```

### 2. Query Decomposition par Aspect

**Fichier:** `yacht-legal-ai/lib/question-processor.ts`

**Ajouter:**
```typescript
export interface ExpandedQueryMultiAspect {
  original: string
  aspects: QueryAspect[]
  queries: { aspect: string; query: string }[]
}

export async function expandQueryMultiAspect(query: string): Promise<ExpandedQueryMultiAspect> {
  const aspects = detectMultiAspect(query)

  if (!aspects) {
    // Fallback to simple expansion
    const simple = await expandQuery(query)
    return {
      original: query,
      aspects: [],
      queries: [{ aspect: 'default', query: simple.original }]
    }
  }

  // Generate query for each aspect
  const queries = aspects.map(aspect => ({
    aspect: aspect.name,
    query: `${query} ${aspect.keywords.slice(0, 5).join(' ')}`
  }))

  return { original: query, aspects, queries }
}
```

### 3. Retrieval Diversifié (Round-Robin par Aspect + Doc Cap)

**Fichier:** `yacht-legal-ai/app/api/chat/route.ts`

**Remplacer lignes 72-96:**
```typescript
// Step 1: Detect multi-aspect
const multiAspect = await expandQueryMultiAspect(message)

console.log('[RAG] Query analysis:', {
  multiAspect: multiAspect.aspects.length > 0,
  aspects: multiAspect.aspects.map(a => a.name),
  queries: multiAspect.queries.length
})

// Step 2: Retrieve by aspect (if multi-aspect) or simple
let chunks: RelevantChunk[]

if (multiAspect.aspects.length >= 2) {
  // Multi-aspect: retrieve per aspect
  const chunksByAspect = await Promise.all(
    multiAspect.queries.map(async ({ aspect, query }) => {
      const aspectChunks = await retrieveRelevantChunks(query, category, 5, 0.55)
      return { aspect, chunks: aspectChunks }
    })
  )

  // Deduplicate + balance
  const allChunks = chunksByAspect.flatMap(a => a.chunks)
  const uniqueChunks = deduplicateChunks(allChunks.map(c => ({ ...c, id: c.chunkId })))

  // Round-robin: max 2 chunks per document, balance aspects
  const docCounts = new Map<number, number>()
  const aspectCounts = new Map<string, number>()
  const maxPerDoc = 2
  const maxPerAspect = Math.ceil(15 / multiAspect.aspects.length)

  chunks = uniqueChunks.filter(c => {
    const docCount = docCounts.get(c.document_id) || 0
    const aspectName = chunksByAspect.find(a => a.chunks.some(ac => ac.chunkId === c.chunkId))?.aspect || 'unknown'
    const aspectCount = aspectCounts.get(aspectName) || 0

    if (docCount >= maxPerDoc) return false
    if (aspectCount >= maxPerAspect) return false

    docCounts.set(c.document_id, docCount + 1)
    aspectCounts.set(aspectName, aspectCount + 1)
    return true
  }).slice(0, 15) as RelevantChunk[]

  console.log('[RAG] Multi-aspect chunks:', {
    total: allChunks.length,
    unique: uniqueChunks.length,
    selected: chunks.length,
    uniqueDocs: new Set(chunks.map(c => c.document_id)).size,
    byAspect: Array.from(aspectCounts.entries())
  })
} else {
  // Simple retrieval
  const expanded = await expandQuery(message)
  const allChunkResults = await Promise.all([
    retrieveRelevantChunks(expanded.original, category, 5, 0.7),
    ...expanded.variants.map(v => retrieveRelevantChunks(v, category, 3, 0.7))
  ])
  
  chunks = deduplicateChunks(
    allChunkResults.flat().map(c => ({ ...c, id: c.chunkId }))
  ).slice(0, 8) as RelevantChunk[]

  console.log('[RAG] Simple chunks:', {
    total: allChunkResults.flat().length,
    unique: chunks.length
  })
}
```

**Importer en haut:**
```typescript
import { expandQuery, expandQueryMultiAspect, deduplicateChunks } from '@/lib/question-processor'
```

## Tests Validation

```bash
cd yacht-legal-ai

# Test multi-aspect RMI→Malta
npx tsx -e "
import { expandQueryMultiAspect } from './lib/question-processor'
const result = await expandQueryMultiAspect('Comment transférer un yacht de RMI vers Malte?')
console.log('Aspects:', result.aspects.map(a => a.name))
console.log('Queries:', result.queries.length)
"

# Test retrieval complet
cat > test-scripts/test-multi-aspect.ts << 'TESTEOF'
import { retrieveRelevantChunks } from '../lib/rag-pipeline'
import { expandQueryMultiAspect } from '../lib/question-processor'

async function testMultiAspect() {
  const query = "Comment transférer un yacht de RMI vers Malte?"
  console.log('🧪 Test Multi-Aspect Retrieval\n')
  console.log(`Question: ${query}\n`)

  const multiAspect = await expandQueryMultiAspect(query)
  console.log(`Aspects détectés: ${multiAspect.aspects.map(a => a.name).join(', ')}`)
  console.log(`Queries: ${multiAspect.queries.length}\n`)

  const chunksByAspect = await Promise.all(
    multiAspect.queries.map(async ({ aspect, query }) => {
      const chunks = await retrieveRelevantChunks(query, undefined, 5, 0.55)
      return { aspect, chunks, docs: new Set(chunks.map(c => c.document_name)) }
    })
  )

  chunksByAspect.forEach(({ aspect, chunks, docs }) => {
    console.log(`${aspect}:`)
    console.log(`  Chunks: ${chunks.length}`)
    console.log(`  Docs: ${Array.from(docs).slice(0,3).join(', ')}`)
    console.log(`  Top similarity: ${chunks[0]?.similarity?.toFixed(3) || 'N/A'}`)
  })

  const allChunks = chunksByAspect.flatMap(a => a.chunks)
  const uniqueDocs = new Set(allChunks.map(c => c.document_name))

  console.log(`\n📊 Résumé:`)
  console.log(`  Total chunks: ${allChunks.length}`)
  console.log(`  Unique docs: ${uniqueDocs.size}`)
  console.log(`  Expected: >= 10 docs, >= 15 chunks`)
  console.log(`\n${uniqueDocs.size >= 8 ? '✅ MULTI-ASPECT OK' : '❌ INSUFFICIENT COVERAGE'}`)
}

testMultiAspect().catch(console.error)
TESTEOF

npx tsx test-scripts/test-multi-aspect.ts
```

**Critères succès:**
- ✅ Aspects: 4 détectés (Exit_RMI, Entry_Malta, Technical, Fiscal)
- ✅ Unique docs >= 8
- ✅ Total chunks >= 12
- ✅ Balance aspects: ~25% chacun

**Résume:** Aspects détectés, docs uniques, balance.
