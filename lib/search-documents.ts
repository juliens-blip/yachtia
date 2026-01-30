/**
 * Document search and retrieval for RAG pipeline
 */

import { generateEmbedding } from './gemini'
import { supabaseAdmin } from './supabase'
import { rerankChunks, getRerankingStats, type RankedChunk } from './reranker'
import { filterDocuments, logEliminatedDocuments, type FilterContext, type DocumentChunk } from './document-filter'
import { filterByDocType, filterByFlag, logDocFilterResult, type DocFilterMode } from './doc-filter'
import { extractFlag, extractCitedCodes, extractYachtContext } from './context-extractor'
import { scoreDocument } from './document-scorer'
import { scoreByContext } from './context-aware-scorer'
import { extractFlagFromDocument, flagsMatch } from './flag-normalizer'
import type { RelevantChunk } from './rag-pipeline'

type SearchDocumentsRow = {
  chunk_id: string
  document_id: string
  document_name: string
  category: string
  chunk_text: string
  similarity: number
  page_number: number | null
  chunk_index: number
  source_url?: string
}

function getDocFilterMode(): DocFilterMode {
  const raw = process.env.RAG_DOC_FILTER_MODE?.toUpperCase()
  if (raw === 'STRICT' || raw === 'BALANCED') return raw
  return 'BALANCED'
}

/**
 * Search chunks by document name (metadata match)
 * Complements vector search for cited codes (LY3, OGSR, REG, etc.)
 */
async function searchByDocumentName(
  citedCodes: string[],
  category?: string,
  topK: number = 10
): Promise<SearchDocumentsRow[]> {
  if (citedCodes.length === 0) return []

  try {
    // Build ILIKE patterns for each cited code
    const patterns = citedCodes.flatMap(code => {
      const normalized = code.toUpperCase()
      return [
        `%${normalized}%`,
        `%${normalized.replace(/\s+/g, '_')}%`,
        `%${normalized.replace(/\s+/g, '-')}%`
      ]
    })

    // Query: SELECT chunks WHERE document_name ILIKE any pattern
    let query = supabaseAdmin
      .from('document_chunks')
      .select(`
        chunk_id,
        document_id,
        documents!inner(name, category, source_url),
        chunk_text,
        page_number,
        chunk_index
      `)
      .or(patterns.map(p => `documents.name.ilike.${p}`).join(','), { foreignTable: 'documents' })
      .limit(topK * 2)

    if (category) {
      query = query.eq('documents.category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('searchByDocumentName error:', error)
      return []
    }

    if (!data || data.length === 0) return []

    // Transform to SearchDocumentsRow format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((row: any) => ({
      chunk_id: row.chunk_id,
      document_id: row.document_id,
      document_name: row.documents.name,
      category: row.documents.category,
      chunk_text: row.chunk_text,
      similarity: 0.9, // Base score for metadata match
      page_number: row.page_number,
      chunk_index: row.chunk_index,
      source_url: row.documents.source_url
    }))
  } catch (err) {
    console.error('searchByDocumentName exception:', err)
    return []
  }
}

/**
 * Merge metadata search results with vector search results
 * Boost metadata matches by x2
 */
/**
 * Boost official/authoritative docs by category and document name patterns
 */
function boostOfficialDocs(results: SearchDocumentsRow[]): SearchDocumentsRow[] {
  return results.map(r => {
    let boost = 0
    
    // Official categories
    if (r.category === 'Official Law') boost += 0.15
    if (r.category === 'Maritime Code') boost += 0.12
    
    // Known official docs
    if (r.document_name?.match(/MI-\d+|CYC \d+|OGSR|Merchant Shipping Act|VAT.*Guide/i)) boost += 0.08
    
    return { ...r, similarity: Math.min(1.0, r.similarity + boost) }
  })
}

/**
 * Get effective threshold adjusted by category
 */
function getEffectiveThreshold(baseThreshold: number, category?: string): number {
  const adjustments: Record<string, number> = {
    'Official Law': -0.05,      // 0.70 → 0.65 (more permissive)
    'Maritime Code': -0.05,     // 0.70 → 0.65
    'Blog': +0.05,              // 0.70 → 0.75 (more strict)
    'Article': +0.03            // 0.70 → 0.73
  }
  return baseThreshold + (category ? (adjustments[category] || 0) : 0)
}

function mergeWithMetadataBoost(
  vectorResults: SearchDocumentsRow[],
  metadataResults: SearchDocumentsRow[]
): SearchDocumentsRow[] {
  if (metadataResults.length === 0) return vectorResults

  const merged = new Map<string, SearchDocumentsRow>()
  
  // Add vector results first
  for (const row of vectorResults) {
    merged.set(row.chunk_id, row)
  }

  // Add/boost metadata results (x2 boost)
  for (const row of metadataResults) {
    const existing = merged.get(row.chunk_id)
    if (existing) {
      // Already in vector results, boost score x2
      merged.set(row.chunk_id, {
        ...existing,
        similarity: existing.similarity * 2.0
      })
    } else {
      // New chunk from metadata search, add with boosted score
      merged.set(row.chunk_id, {
        ...row,
        similarity: row.similarity * 2.0
      })
    }
  }

  // Convert back to array and sort by similarity
  const result = Array.from(merged.values())
  result.sort((a, b) => b.similarity - a.similarity)
  
  console.log(
    `🔍 Metadata merge: vector=${vectorResults.length}, metadata=${metadataResults.length}, merged=${result.length}`
  )
  
  return result
}

/**
 * Retrieve relevant chunks for a query using vector search
 */
export async function searchDocuments(
  query: string,
  category?: string,
  topK: number = 20,
  similarityThreshold: number = 0.6,
  useReranking: boolean = true,
  filterContext?: FilterContext,
  queryFlag?: string  // T-052: Flag detected from query for pre-filtering
): Promise<RelevantChunk[]> {
  try {
    // Step 1: Generate query embedding
    const queryEmbedding = await generateEmbedding(query)

    // Step 2: Search via pgvector function - fetch more candidates for re-ranking
    const candidateCount = useReranking ? Math.max(topK * 2, 10) : topK

    const callSearchDocuments = async (params: {
      query_embedding: number[]
      match_threshold: number
      match_count: number
      filter_category: string | null
      use_reranking?: boolean
    }) => {
      const { data, error } = await supabaseAdmin.rpc('search_documents', params)

      if (error && error.code === 'PGRST202' && 'use_reranking' in params) {
        const { use_reranking, ...fallbackParams } = params
        void use_reranking
        const retry = await supabaseAdmin.rpc('search_documents', fallbackParams)
        return retry
      }

      return { data, error }
    }

    // Apply category-specific threshold adjustment
    const effectiveThreshold = getEffectiveThreshold(similarityThreshold, category)
    
    const { data, error } = await callSearchDocuments({
      query_embedding: queryEmbedding,
      match_threshold: effectiveThreshold,
      match_count: candidateCount,
      filter_category: category || null,
      use_reranking: useReranking
    })

    if (error) {
      console.error('Vector search error:', error)
      throw new Error(`Vector search failed: ${error.message}`)
    }

    let rawResults = (data as SearchDocumentsRow[] | null) || []

    // Step 2.4: Apply official docs boost
    rawResults = boostOfficialDocs(rawResults)

    // Step 2.5: T-052 Hard filter by flag BEFORE re-ranking
    if (queryFlag) {
      const beforeFilter = rawResults.length
      rawResults = rawResults.filter(row => {
        const docFlag = extractFlagFromDocument(row.document_name, row.category)
        if (!docFlag) return true  // Keep docs without flag
        return flagsMatch(docFlag, queryFlag)
      })
      
      const filtered = beforeFilter - rawResults.length
      if (filtered > 0) {
        console.log(`🚫 T-052 Hard filter: Eliminated ${filtered} chunks (wrong flag, query=${queryFlag})`)
      }
    }

    // Step 2.6: Extract cited codes and search by document name (metadata match)
    const citedCodes = extractCitedCodes(query)
    if (citedCodes.length > 0) {
      console.log(`🔍 Cited codes detected: ${citedCodes.join(', ')}`)
      const metadataResults = await searchByDocumentName(citedCodes, category, topK)
      if (metadataResults.length > 0) {
        rawResults = mergeWithMetadataBoost(rawResults, metadataResults)
      }
    }

    // Retry with relaxed threshold and no category filter if nothing found
    if (rawResults.length === 0) {
      const relaxedThreshold = Math.max(0.3, similarityThreshold - 0.3)
      const relaxedCount = Math.max(candidateCount * 2, 20)

      const { data: relaxedData, error: relaxedError } = await callSearchDocuments({
        query_embedding: queryEmbedding,
        match_threshold: relaxedThreshold,
        match_count: relaxedCount,
        filter_category: null,
        use_reranking: useReranking
      })

      if (relaxedError) {
        console.error('Vector search retry error:', relaxedError)
      } else {
        rawResults = (relaxedData as SearchDocumentsRow[] | null) || []
      }
    }

    // Fallback: keyword-reduced query with lowered threshold (but not junk)
    if (rawResults.length === 0) {
      const keywordQuery = extractKeywordQuery(query)
      if (keywordQuery && keywordQuery !== query) {
        const keywordEmbedding = await generateEmbedding(keywordQuery)
        const fallbackCount = Math.max(candidateCount * 2, 20)

        const { data: fallbackData, error: fallbackError } = await callSearchDocuments({
          query_embedding: keywordEmbedding,
          match_threshold: 0.2,
          match_count: fallbackCount,
          filter_category: null,
          use_reranking: useReranking
        })

        if (fallbackError) {
          console.error('Vector search fallback error:', fallbackError)
        } else {
          rawResults = (fallbackData as SearchDocumentsRow[] | null) || []
          if (rawResults.length > 0) {
            console.log(`⚠️ Fallback retrieval: ${rawResults.length} chunks (keyword query, threshold 0.2)`)
          }
        }
      }
    }

    // Final fallback: broadened search with minimum quality threshold (no junk)
    if (rawResults.length === 0) {
      const fallbackCount = Math.max(candidateCount * 2, 20)
      const { data: finalData, error: finalError } = await callSearchDocuments({
        query_embedding: queryEmbedding,
        match_threshold: 0.15,
        match_count: fallbackCount,
        filter_category: null,
        use_reranking: useReranking
      })

      if (finalError) {
        console.error('Vector search final fallback error:', finalError)
      } else {
        rawResults = (finalData as SearchDocumentsRow[] | null) || []
        if (rawResults.length > 0) {
          console.log(`⚠️ Final fallback: ${rawResults.length} chunks (threshold 0.15, no category filter)`)
        } else {
          console.log(`❌ No documents found for query even with fallback. Query may be outside document corpus.`)
        }
      }
    }

    const dominantDocId = findDominantDocumentId(rawResults, 0.8)
    if (dominantDocId) {
      const diversifiedCount = Math.max(candidateCount * 2, topK * 3, 30)
      const { data: diversifiedData, error: diversifiedError } = await callSearchDocuments({
        query_embedding: queryEmbedding,
        match_threshold: similarityThreshold,
        match_count: diversifiedCount,
        filter_category: category || null,
        use_reranking: useReranking
      })

      if (diversifiedError) {
        console.error('Vector search diversity retry error:', diversifiedError)
      } else {
        const diversifiedResults = ((diversifiedData as SearchDocumentsRow[] | null) || [])
          .filter(row => row.document_id !== dominantDocId)

        if (diversifiedResults.length > 0) {
          const merged = new Map<string, SearchDocumentsRow>()
          diversifiedResults.forEach(row => merged.set(row.chunk_id, row))
          rawResults
            .filter(row => row.document_id !== dominantDocId)
            .forEach(row => merged.set(row.chunk_id, row))
          rawResults = Array.from(merged.values())
        }
      }
    }

    // Step 3: Apply document filtering (anti-bruit) if filter context provided
    let filteredResults = rawResults
    if (filterContext) {
      const documentsForFiltering: DocumentChunk[] = rawResults.map(row => ({
        content: row.chunk_text,
        title: row.document_name,
        similarity: row.similarity,
        flag: undefined,
        themes: undefined,
        document_type: undefined
      }))

      const filterResult = filterDocuments(documentsForFiltering, filterContext)
      logEliminatedDocuments(filterResult)

      const filteredChunkTitles = new Set(filterResult.filtered.map(c => c.title))
      filteredResults = rawResults.filter(row => filteredChunkTitles.has(row.document_name))
    }

    // Step 4: Apply re-ranking if enabled
    if (useReranking && filteredResults.length > 0) {
      const chunksForReranking = filteredResults.map(row => ({
        chunk_text: row.chunk_text,
        similarity: row.similarity,
        chunkId: row.chunk_id,
        documentId: row.document_id,
        documentName: row.document_name,
        category: row.category,
        pageNumber: row.page_number,
        chunkIndex: row.chunk_index,
        sourceUrl: row.source_url
      }))

      const rerankedChunks = await rerankChunks(query, chunksForReranking, chunksForReranking.length)
      const yachtContext = extractYachtContext(query)
      const boostedChunks = applyScoringBoosts(rerankedChunks, query, yachtContext)

      // Post-rerank doc filters
      const docFilterMode = getDocFilterMode()
      const docTypeResult = filterByDocType(boostedChunks, docFilterMode)
      logDocFilterResult('doc-type', docTypeResult)

      const queryFlag = extractFlag(query)
      const flagResult = filterByFlag(docTypeResult.filtered, queryFlag, docFilterMode)
      logDocFilterResult('flag', flagResult)

      const rerankedFiltered = flagResult.filtered
      const diversifiedChunks = applyDocumentDiversity(rerankedFiltered, topK)

      // Log re-ranking stats for debugging
      const stats = getRerankingStats(chunksForReranking, rerankedChunks)
      console.log(
        `Re-ranking stats: before=${stats.beforeAvg.toFixed(3)}, after=${stats.afterAvg.toFixed(3)}, improvement=${(stats.improvement * 100).toFixed(1)}%`
      )

      return diversifiedChunks.map((chunk: RankedChunk) => ({
        chunkId: chunk.chunkId || '',
        documentId: chunk.documentId || '',
        documentName: chunk.documentName || '',
        category: chunk.category || '',
        chunkText: chunk.chunk_text,
        similarity: chunk.score,
        pageNumber: chunk.pageNumber ?? null,
        chunkIndex: chunk.chunkIndex || 0,
        sourceUrl: chunk.sourceUrl
      }))
    }

    // Step 5: Format results without re-ranking
    const baseChunks = filteredResults.map((row) => ({
      chunkId: row.chunk_id,
      documentId: row.document_id,
      documentName: row.document_name,
      category: row.category,
      chunkText: row.chunk_text,
      similarity: row.similarity,
      pageNumber: row.page_number,
      chunkIndex: row.chunk_index,
      sourceUrl: row.source_url
    }))

    const yachtContext = extractYachtContext(query)
    const boostedBaseChunks = applyScoringBoosts(baseChunks, query, yachtContext)
    const chunks: RelevantChunk[] = applyDocumentDiversity(boostedBaseChunks, topK)

    return chunks
  } catch (error) {
    console.error('RAG pipeline error:', error)
    throw new Error(`RAG retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

type ScoreCarrier = { score?: number; similarity?: number }

type DiversityChunk = {
  chunkId?: string
  documentId?: string
  documentName?: string
} & ScoreCarrier

function applyScoringBoosts<T extends ScoreCarrier & { documentName?: string; category?: string }>(
  chunks: T[],
  query: string,
  yachtContext: ReturnType<typeof extractYachtContext>
): T[] {
  return chunks.map(chunk => {
    const baseScore = chunk.score ?? chunk.similarity ?? 0
    const docBoost = scoreDocument(chunk.documentName || '', chunk.category || '', query)
    const contextBoost = scoreByContext(yachtContext, chunk.documentName || '', chunk.category || '')
    const adjustedScore = baseScore * docBoost * contextBoost

    if ('score' in chunk) {
      return { ...chunk, score: adjustedScore }
    }

    return { ...chunk, similarity: adjustedScore }
  })
}

function applyDocumentDiversity<T extends DiversityChunk>(
  chunks: T[],
  topK: number
): T[] {
  if (chunks.length <= topK) return chunks.slice(0, topK)

  const indexed = chunks.map((chunk, idx) => ({
    chunk,
    idx,
    baseScore: chunk.score ?? chunk.similarity ?? 0,
    docKey: chunk.documentId || chunk.documentName || `unknown-${idx}`,
    uniqueKey: chunk.chunkId || `${chunk.documentId || chunk.documentName || 'unknown'}-${idx}`
  }))

  indexed.sort((a, b) => b.baseScore - a.baseScore)

  const perDocSeen = new Map<string, number>()
  const adjusted = indexed.map(item => {
    const count = perDocSeen.get(item.docKey) || 0
    perDocSeen.set(item.docKey, count + 1)
    return { ...item, adjustedScore: item.baseScore - 0.1 * count }
  })

  adjusted.sort((a, b) => b.adjustedScore - a.adjustedScore)

  let ordered = adjusted
  if (topK >= 10) {
    ordered = enforceMinUniqueAtTop(ordered, 10, 3)
  }
  if (topK >= 20) {
    ordered = enforceMinUniqueAtTop(ordered, 20, 5)
  }

  return ordered.slice(0, topK).map(item => item.chunk)
}

function enforceMinUniqueAtTop<T extends { docKey: string; uniqueKey: string; adjustedScore: number }>(
  items: T[],
  topN: number,
  minUnique: number
): T[] {
  if (items.length <= topN) return items

  const topItems = items.slice(0, topN)
  const rest = items.slice(topN)

  const perDocCount = new Map<string, number>()
  for (const item of topItems) {
    perDocCount.set(item.docKey, (perDocCount.get(item.docKey) || 0) + 1)
  }

  const uniqueDocs = Array.from(perDocCount.keys())
  if (uniqueDocs.length >= minUnique) {
    return items
  }

  const replacementCandidates = rest.filter(item => !perDocCount.has(item.docKey))
  if (replacementCandidates.length === 0) {
    return items
  }

  const duplicateIndices = topItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => (perDocCount.get(item.docKey) || 0) > 1)
    .sort((a, b) => a.item.adjustedScore - b.item.adjustedScore)

  const updatedTop = topItems.slice()
  let candidateIndex = 0
  let currentUnique = uniqueDocs.length

  while (currentUnique < minUnique && candidateIndex < replacementCandidates.length && duplicateIndices.length > 0) {
    const candidate = replacementCandidates[candidateIndex]
    const toReplace = duplicateIndices.shift()
    if (!toReplace) break

    const removed = updatedTop[toReplace.index]
    updatedTop[toReplace.index] = candidate

    perDocCount.set(candidate.docKey, 1)
    const remainingCount = (perDocCount.get(removed.docKey) || 1) - 1
    perDocCount.set(removed.docKey, Math.max(0, remainingCount))
    currentUnique = Array.from(perDocCount.keys()).filter(key => (perDocCount.get(key) || 0) > 0).length
    candidateIndex += 1
  }

  const updatedKeys = new Set(updatedTop.map(item => item.uniqueKey))
  const remaining = rest.filter(item => !updatedKeys.has(item.uniqueKey))

  return [...updatedTop, ...remaining]
}

function findDominantDocumentId(rows: SearchDocumentsRow[], threshold: number): string | null {
  if (rows.length === 0) return null
  const counts = new Map<string, number>()
  for (const row of rows) {
    counts.set(row.document_id, (counts.get(row.document_id) || 0) + 1)
  }

  let dominant: { id: string; ratio: number } | null = null
  for (const [id, count] of counts.entries()) {
    const ratio = count / rows.length
    if (!dominant || ratio > dominant.ratio) {
      dominant = { id, ratio }
    }
  }

  if (dominant && dominant.ratio > threshold) {
    return dominant.id
  }

  return null
}

function extractKeywordQuery(query: string): string {
  const stopwords = new Set([
    'le','la','les','un','une','des','du','de','d','au','aux','et','ou','mais','donc','or','ni',
    'ce','cet','cette','ces','qui','que','quoi','dont','où','quand','comment','pourquoi',
    'dans','sur','sous','avec','sans','par','pour','chez','en','vers','entre','contre',
    'est','sont','être','avoir','fait','faites','faire','peut','peuvent','doit','doivent',
    'what','who','when','where','why','how','the','a','an','and','or','but','if','then','of',
    'to','from','in','on','at','by','for','with','without','as','is','are','be','been','was','were'
  ])

  const normalized = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const keywords = normalized
    .split(' ')
    .filter(word => word.length > 3 && !stopwords.has(word))

  return keywords.slice(0, 10).join(' ')
}
