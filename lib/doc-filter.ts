/**
 * Post-rerank document filtering helpers
 */

import { detectDocType } from './doc-type-tagger'
import { extractFlagFromDocument, flagsMatch, type CanonicalFlag } from './flag-normalizer'

export type DocFilterMode = 'STRICT' | 'BALANCED'

export type DocFilterChunk = {
  score: number
  documentName?: string
  category?: string
}

export type DocFilterResult<T> = {
  filtered: T[]
  eliminated: Array<{ chunk: T; reason: string }>
  downranked: Array<{ chunk: T; reason: string }>
}

const MIN_SCORES: Record<'CODE' | 'ARTICLE', number> = {
  CODE: 0.45,
  ARTICLE: 0.6
}

const ARTICLE_PATTERNS = [
  'article',
  'blog',
  'news',
  'insight',
  'analysis',
  'newsletter'
]

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function detectDocTypeForFilter(documentName?: string, category?: string): 'CODE' | 'ARTICLE' | 'OTHER' {
  const baseType = detectDocType(documentName, category)
  if (baseType === 'CODE') return 'CODE'

  const haystack = normalizeText(`${documentName || ''} ${category || ''}`)
  if (ARTICLE_PATTERNS.some(pattern => haystack.includes(pattern))) {
    return 'ARTICLE'
  }

  return 'OTHER'
}

function detectChunkFlag(documentName?: string, category?: string): CanonicalFlag | null {
  return extractFlagFromDocument(documentName, category)
}

export function filterByDocType<T extends DocFilterChunk>(
  chunks: T[],
  mode: DocFilterMode
): DocFilterResult<T> {
  const filtered: T[] = []
  const eliminated: Array<{ chunk: T; reason: string }> = []
  const downranked: Array<{ chunk: T; reason: string }> = []

  for (const chunk of chunks) {
    const docType = detectDocTypeForFilter(chunk.documentName, chunk.category)
    const minScore = MIN_SCORES[docType as 'CODE' | 'ARTICLE']

    if (minScore !== undefined && chunk.score < minScore) {
      eliminated.push({
        chunk,
        reason: `score ${chunk.score.toFixed(3)} < min ${minScore} (${docType})`
      })
      continue
    }

    filtered.push(chunk)
  }

  if (mode === 'BALANCED') {
    return { filtered, eliminated, downranked }
  }

  return { filtered, eliminated, downranked }
}

export function filterByFlag<T extends DocFilterChunk>(
  chunks: T[],
  queryFlag: string | undefined,
  mode: DocFilterMode
): DocFilterResult<T> {
  const filtered: T[] = []
  const eliminated: Array<{ chunk: T; reason: string }> = []
  const downranked: Array<{ chunk: T; reason: string }> = []

  if (!queryFlag) {
    return { filtered: chunks.slice(), eliminated, downranked }
  }

  for (const chunk of chunks) {
    const chunkFlag = detectChunkFlag(chunk.documentName, chunk.category)
    if (!chunkFlag) {
      filtered.push(chunk)
      continue
    }

    if (flagsMatch(chunkFlag, queryFlag)) {
      filtered.push(chunk)
      continue
    }

    if (mode === 'STRICT') {
      eliminated.push({
        chunk,
        reason: `flag mismatch: query=${queryFlag}, doc=${chunkFlag}`
      })
      continue
    }

    const adjusted = { ...chunk, score: chunk.score * 0.3 }
    downranked.push({
      chunk: adjusted,
      reason: `flag mismatch downrank x0.3: query=${queryFlag}, doc=${chunkFlag}`
    })
    filtered.push(adjusted)
  }

  return { filtered, eliminated, downranked }
}

export function logDocFilterResult<T extends DocFilterChunk>(
  label: string,
  result: DocFilterResult<T>
): void {
  if (result.eliminated.length === 0 && result.downranked.length === 0) return

  console.log(`\n🔎 Doc filter (${label}):`)
  if (result.eliminated.length > 0) {
    console.log(`- Eliminated: ${result.eliminated.length}`)
    result.eliminated.slice(0, 6).forEach(item => {
      console.log(`  • ${item.reason} :: ${item.chunk.documentName || 'unknown'}`)
    })
  }
  if (result.downranked.length > 0) {
    console.log(`- Downranked: ${result.downranked.length}`)
    result.downranked.slice(0, 6).forEach(item => {
      console.log(`  • ${item.reason} :: ${item.chunk.documentName || 'unknown'}`)
    })
  }
}
