/**
 * Multi-pass retrieval for complex queries
 */

import { expandQuery } from './question-processor'
import { extractCitedCodes } from './context-extractor'
import type { FilterContext } from './document-filter'
import type { RelevantChunk } from './rag-pipeline'

export type MultiPassOptions = {
  category?: string
  similarityThreshold?: number
  useReranking?: boolean
  filterContext?: FilterContext
  finalTopK?: number
  pass1TopK?: number
  pass2TopK?: number
  searchFn?: SearchDocumentsFn
  queryFlag?: string  // T-052: Flag for hard filtering
}

export type SearchDocumentsFn = (
  query: string,
  category?: string,
  topK?: number,
  similarityThreshold?: number,
  useReranking?: boolean,
  filterContext?: FilterContext,
  queryFlag?: string  // T-052
) => Promise<RelevantChunk[]>

const CODE_QUERY_MAP: Record<string, string> = {
  LY3: 'LY3 Large Yacht Code requirements obligations',
  'REG Yacht Code': 'REG Yacht Code requirements obligations',
  CYC: 'CYC 2020 Commercial Yacht Code safety manning surveys',
  OGSR: 'OGSR Malta ship registry registration eligibility',
  MLC: 'Maritime Labour Convention MLC requirements obligations',
  SOLAS: 'SOLAS Convention requirements obligations',
  MARPOL: 'MARPOL requirements obligations',
  VAT: 'VAT Smartbook charter taxation France Italy Spain Mediterranean',
  IYC: 'IYC charter taxes VAT by country Mediterranean'
}

export function isComplexQuery(query: string): boolean {
  const wordCount = query.trim().split(/\s+/).filter(Boolean).length
  if (wordCount > 15) return true

  const citedCodes = extractCitedCodes(query)
  return citedCodes.length >= 2
}

function deduplicateChunks(chunks: RelevantChunk[]): RelevantChunk[] {
  const seen = new Map<string, RelevantChunk>()
  for (const chunk of chunks) {
    const key =
      chunk.chunkId ||
      `${chunk.documentId || ''}:${chunk.pageNumber || 0}:${chunk.chunkIndex || 0}:${chunk.chunkText.slice(0, 80)}`
    const existing = seen.get(key)
    if (!existing || chunk.similarity > existing.similarity) {
      seen.set(key, chunk)
    }
  }
  return Array.from(seen.values())
}

function buildEnrichedQuery(original: string, keywords: string[], variants: string[]): string {
  if (variants.length > 0) return variants[0]
  if (keywords.length > 0) return `${original} (${keywords.slice(0, 6).join(', ')})`
  return original
}

function buildCodeQueries(codes: string[]): string[] {
  const queries = codes.map(code => {
    const baseQuery = CODE_QUERY_MAP[code] ?? `${code} requirements obligations`
    const yearMatch = code.match(/\b(19|20)\d{2}\b/)
    if (!yearMatch) return baseQuery
    const year = yearMatch[0]
    return baseQuery.includes(year) ? baseQuery : `${baseQuery} ${year}`
  })
  return Array.from(new Set(queries))
}

export async function multiPassRetrieval(
  query: string,
  passes: number = 2,
  options: MultiPassOptions = {}
): Promise<RelevantChunk[]> {
  const pass1TopK = options.pass1TopK ?? 15
  const pass2TopK = options.pass2TopK ?? 10
  const finalTopK = options.finalTopK ?? pass1TopK
  const searchFn = options.searchFn ?? (await import('./search-documents')).searchDocuments

  if (passes <= 1) {
    return searchFn(
      query,
      options.category,
      finalTopK,
      options.similarityThreshold,
      options.useReranking,
      options.filterContext
    )
  }

  console.log(`\n🔁 Multi-pass retrieval: pass1=${pass1TopK}, pass2=${pass2TopK}`)

  const pass1 = await searchFn(
    query,
    options.category,
    pass1TopK,
    options.similarityThreshold,
    options.useReranking,
    options.filterContext
  )

  const citedCodes = extractCitedCodes(query)
  const codeQueries = buildCodeQueries(citedCodes)

  const expanded = await expandQuery(query)
  const enrichedQuery = buildEnrichedQuery(query, expanded.keywords, expanded.variants)

  const pass2 = await searchFn(
    enrichedQuery,
    options.category,
    pass2TopK,
    options.similarityThreshold,
    options.useReranking,
    options.filterContext
  )

  let pass3: RelevantChunk[] = []
  if (codeQueries.length > 0) {
    const pass3Results = await Promise.all(
      codeQueries.map(codeQuery =>
        searchFn(
          codeQuery,
          options.category,
          pass2TopK,
          options.similarityThreshold,
          options.useReranking,
          options.filterContext
        )
      )
    )
    pass3 = pass3Results.flat()
  }

  // Weight pass results: pass1 (direct) > pass2 (enriched) > pass3 (speculative codes)
  const weightedPass1 = pass1.map(c => ({ ...c, similarity: c.similarity * 1.0 }))
  const weightedPass2 = pass2.map(c => ({ ...c, similarity: c.similarity * 0.85 }))
  const weightedPass3 = pass3.map(c => ({ ...c, similarity: c.similarity * 0.7 }))

  const merged = deduplicateChunks([...weightedPass1, ...weightedPass2, ...weightedPass3])
  merged.sort((a, b) => b.similarity - a.similarity)

  const pass3Log = codeQueries.length > 0 ? `, pass3=${pass3.length}` : ''
  console.log(`🔁 Multi-pass merge: pass1=${pass1.length}, pass2=${pass2.length}${pass3Log}, merged=${merged.length}`)

  return merged.slice(0, finalTopK)
}
