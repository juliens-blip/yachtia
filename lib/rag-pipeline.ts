/**
 * RAG (Retrieval-Augmented Generation) Pipeline
 *
 * Orchestrates the complete RAG flow:
 * 1. Generate query embedding
 * 2. Search similar chunks in vector database
 * 3. Retrieve relevant context
 * 4. Return formatted results for LLM
 */

import { searchDocuments } from './search-documents'
import { isComplexQuery, multiPassRetrieval } from './multi-pass-retrieval'
import type { FilterContext } from './document-filter'
import { supabaseAdmin } from './supabase'
import { expandQuery } from './question-processor'
import { rerankChunks } from './reranker'

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

/**
 * Retrieve relevant chunks for a query using vector search
 *
 * @param query - User's question
 * @param category - Optional category filter (MYBA, AML, etc.)
 * @param topK - Number of top results to return (default: 20)
 * @param similarityThreshold - Minimum similarity score (default: 0.6)
 * @param useReranking - Whether to apply re-ranking (default: true)
 * @returns Array of relevant chunks sorted by similarity/score
 */
export async function retrieveRelevantChunks(
  query: string,
  category?: string,
  topK: number = 20,
  similarityThreshold: number = 0.6,
  useReranking: boolean = true,
  filterContext?: FilterContext
): Promise<RelevantChunk[]> {
  if (isComplexQuery(query)) {
    return multiPassRetrieval(query, 2, {
      category,
      similarityThreshold,
      useReranking,
      filterContext,
      finalTopK: topK
    })
  }

  const expanded = await expandQuery(query)
  const variantQueries = expanded.variants.length > 0
    ? expanded.variants.slice(0, 3)
    : [expanded.original]

  if (variantQueries.length > 1) {
    const perQueryTopK = 7
    const queryResults = await Promise.all(
      variantQueries.map(variant =>
        searchDocuments(variant, category, perQueryTopK, similarityThreshold, false, filterContext)
      )
    )

    const combined = deduplicateByChunkId(queryResults.flat())
    if (combined.length === 0) return []

    const rerankInput = combined.map(chunk => ({
      chunk_text: chunk.chunkText,
      similarity: chunk.similarity,
      chunkId: chunk.chunkId,
      documentId: chunk.documentId,
      documentName: chunk.documentName,
      category: chunk.category,
      pageNumber: chunk.pageNumber ?? null,
      chunkIndex: chunk.chunkIndex,
      sourceUrl: chunk.sourceUrl
    }))

    const reranked = await rerankChunks(query, rerankInput, Math.min(15, rerankInput.length))

    return reranked.slice(0, 15).map(chunk => ({
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

  return searchDocuments(query, category, topK, similarityThreshold, useReranking, filterContext)
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

function deduplicateByChunkId(chunks: RelevantChunk[]): RelevantChunk[] {
  const seen = new Set<string>()
  return chunks.filter(chunk => {
    const key = chunk.chunkId || `${chunk.documentId}-${chunk.chunkIndex}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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
