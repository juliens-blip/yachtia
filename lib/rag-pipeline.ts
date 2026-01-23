/**
 * RAG (Retrieval-Augmented Generation) Pipeline
 *
 * Orchestrates the complete RAG flow:
 * 1. Generate query embedding
 * 2. Search similar chunks in vector database
 * 3. Retrieve relevant context
 * 4. Return formatted results for LLM
 */

import { generateEmbedding } from './gemini'
import { supabaseAdmin } from './supabase'
import { rerankChunks, getRerankingStats, type RankedChunk } from './reranker'

export type RelevantChunk = {
  chunkId: string
  documentId: string
  documentName: string
  category: string
  chunkText: string
  similarity: number
  pageNumber: number | null
  chunkIndex: number
  sourceUrl?: string
}

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

/**
 * Retrieve relevant chunks for a query using vector search
 *
 * @param query - User's question
 * @param category - Optional category filter (MYBA, AML, etc.)
 * @param topK - Number of top results to return (default: 5)
 * @param similarityThreshold - Minimum similarity score (default: 0.6)
 * @param useReranking - Whether to apply re-ranking (default: true)
 * @returns Array of relevant chunks sorted by similarity/score
 */
export async function retrieveRelevantChunks(
  query: string,
  category?: string,
  topK: number = 5,
  similarityThreshold: number = 0.6,
  useReranking: boolean = true
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
        const retry = await supabaseAdmin.rpc('search_documents', fallbackParams)
        return retry
      }

      return { data, error }
    }

    const { data, error } = await callSearchDocuments({
      query_embedding: queryEmbedding,
      match_threshold: similarityThreshold,
      match_count: candidateCount,
      filter_category: category || null,
      use_reranking: useReranking
    })

    if (error) {
      console.error('Vector search error:', error)
      throw new Error(`Vector search failed: ${error.message}`)
    }

    let rawResults = (data as SearchDocumentsRow[] | null) || []

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

    // Final fallback: keyword-reduced query with very low threshold
    if (rawResults.length === 0) {
      const keywordQuery = extractKeywordQuery(query)
      if (keywordQuery && keywordQuery !== query) {
        const keywordEmbedding = await generateEmbedding(keywordQuery)
        const fallbackCount = Math.max(candidateCount * 3, 30)

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
        }
      }
    }

    // Absolute fallback: return nearest chunks with effectively no threshold
    if (rawResults.length === 0) {
      const fallbackCount = Math.max(candidateCount * 2, 20)
      const { data: finalData, error: finalError } = await callSearchDocuments({
        query_embedding: queryEmbedding,
        match_threshold: -100.0,
        match_count: fallbackCount,
        filter_category: null,
        use_reranking: useReranking
      })

      if (finalError) {
        console.error('Vector search final fallback error:', finalError)
      } else {
        rawResults = (finalData as SearchDocumentsRow[] | null) || []
      }
    }

    // Ensure we have enough candidates to rerank
    if (rawResults.length > 0 && rawResults.length < topK) {
      const fillCount = Math.max(candidateCount * 2, 20)
      const { data: fillData, error: fillError } = await callSearchDocuments({
        query_embedding: queryEmbedding,
        match_threshold: -100.0,
        match_count: fillCount,
        filter_category: null,
        use_reranking: useReranking
      })

      if (fillError) {
        console.error('Vector search fill error:', fillError)
      } else if (fillData) {
        const merged = new Map<string, SearchDocumentsRow>()
        rawResults.forEach(row => merged.set(row.chunk_id, row))
        ;(fillData as SearchDocumentsRow[]).forEach(row => {
          if (!merged.has(row.chunk_id)) merged.set(row.chunk_id, row)
        })
        rawResults = Array.from(merged.values())
      }
    }
    
    // Step 3: Apply re-ranking if enabled
    if (useReranking && rawResults.length > 0) {
      const chunksForReranking = rawResults.map(row => ({
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
      
      const rerankedChunks = await rerankChunks(query, chunksForReranking, topK)
      
      // Log re-ranking stats for debugging
      const stats = getRerankingStats(chunksForReranking, rerankedChunks)
      console.log(`Re-ranking stats: before=${stats.beforeAvg.toFixed(3)}, after=${stats.afterAvg.toFixed(3)}, improvement=${(stats.improvement * 100).toFixed(1)}%`)
      
      return rerankedChunks.map((chunk: RankedChunk) => ({
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

    // Step 4: Format results without re-ranking
    const chunks: RelevantChunk[] = rawResults.slice(0, topK).map((row) => ({
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

    return chunks
  } catch (error) {
    console.error('RAG pipeline error:', error)
    throw new Error(`RAG retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
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
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const keywords = normalized
    .split(' ')
    .filter(word => word.length > 3 && !stopwords.has(word))

  return keywords.slice(0, 10).join(' ')
}

/**
 * Format chunks for LLM context
 * Prepares chunks with source attribution for GPT prompting
 *
 * @param chunks - Array of relevant chunks
 * @returns Formatted context string
 */
export function formatChunksForContext(chunks: RelevantChunk[]): string[] {
  return chunks.map((chunk) => {
    const source = `[Document: ${chunk.documentName} (${chunk.category})${
      chunk.pageNumber ? `, Page ${chunk.pageNumber}` : ''
    }]`

    return `${source}\n${chunk.chunkText}`
  })
}

/**
 * Get unique document IDs from chunks
 * Used for tracking which documents were used in response
 *
 * @param chunks - Array of chunks
 * @returns Array of unique document IDs
 */
export function getUniqueDocumentIds(chunks: RelevantChunk[]): string[] {
  const uniqueIds = new Set(chunks.map(c => c.documentId))
  return Array.from(uniqueIds)
}

/**
 * Calculate confidence score for RAG response
 * Based on similarity scores of retrieved chunks
 *
 * @param chunks - Array of chunks
 * @returns Confidence score 0-1
 */
export function calculateConfidence(chunks: RelevantChunk[]): number {
  if (chunks.length === 0) {
    return 0
  }

  // Weighted average: top chunk has 50% weight, others distributed
  const topSimilarity = chunks[0].similarity
  const avgOthers = chunks.slice(1).reduce((sum, c) => sum + c.similarity, 0) / Math.max(chunks.length - 1, 1)

  return topSimilarity * 0.5 + avgOthers * 0.5
}

/**
 * Get statistics about the document corpus
 *
 * @returns Statistics object
 */
export async function getCorpusStats() {
  try {
    const [docsResult, chunksResult] = await Promise.all([
      supabaseAdmin.from('documents').select('id, category', { count: 'exact', head: false }),
      supabaseAdmin.from('document_chunks').select('id', { count: 'exact', head: true })
    ])

    const categoryCounts: Record<string, number> = {}
    docsResult.data?.forEach((doc: { category: string }) => {
      categoryCounts[doc.category] = (categoryCounts[doc.category] || 0) + 1
    })

    return {
      totalDocuments: docsResult.count || 0,
      totalChunks: chunksResult.count || 0,
      categoryBreakdown: categoryCounts
    }
  } catch (error) {
    console.error('Stats error:', error)
    return {
      totalDocuments: 0,
      totalChunks: 0,
      categoryBreakdown: {}
    }
  }
}
