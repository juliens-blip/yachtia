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

export type RelevantChunk = {
  chunkId: string
  documentId: string
  documentName: string
  category: string
  chunkText: string
  similarity: number
  pageNumber: number | null
  chunkIndex: number
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
}

type CategorySearchRow = {
  id: string
  document_id: string
  chunk_text: string
  page_number: number | null
  chunk_index: number
  documents: {
    name: string
    category: string
  }
}

/**
 * Retrieve relevant chunks for a query using vector search
 *
 * @param query - User's question
 * @param category - Optional category filter (MYBA, AML, etc.)
 * @param topK - Number of top results to return (default: 5)
 * @param similarityThreshold - Minimum similarity score (default: 0.7 = 70%)
 * @returns Array of relevant chunks sorted by similarity
 */
export async function retrieveRelevantChunks(
  query: string,
  category?: string,
  topK: number = 5,
  similarityThreshold: number = 0.7
): Promise<RelevantChunk[]> {
  try {
    // Step 1: Generate query embedding
    const queryEmbedding = await generateEmbedding(query)

    // Step 2: Search via pgvector function
    const { data, error } = await supabaseAdmin
      .rpc('search_documents', {
        query_embedding: queryEmbedding,
        match_threshold: similarityThreshold,
        match_count: topK,
        filter_category: category || null
      })

    if (error) {
      console.error('Vector search error:', error)
      throw new Error(`Vector search failed: ${error.message}`)
    }

    // Step 3: Format results
    const chunks: RelevantChunk[] = (data as SearchDocumentsRow[] | null || []).map((row) => ({
      chunkId: row.chunk_id,
      documentId: row.document_id,
      documentName: row.document_name,
      category: row.category,
      chunkText: row.chunk_text,
      similarity: row.similarity,
      pageNumber: row.page_number,
      chunkIndex: row.chunk_index
    }))

    return chunks
  } catch (error) {
    console.error('RAG pipeline error:', error)
    throw new Error(`RAG retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
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
 * Search documents by category
 * Returns all chunks from documents in specified category
 *
 * @param category - Document category
 * @param limit - Max number of chunks (default: 20)
 * @returns Array of chunks
 */
export async function searchByCategory(
  category: string,
  limit: number = 20
): Promise<RelevantChunk[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('document_chunks')
      .select(`
        id,
        document_id,
        chunk_text,
        page_number,
        chunk_index,
        documents!inner (
          name,
          category
        )
      `)
      .eq('documents.category', category)
      .eq('documents.is_public', true)
      .limit(limit)

    if (error) {
      console.error('Category search error:', error)
      return []
    }

    return (data as CategorySearchRow[] | null || []).map((row) => ({
      chunkId: row.id,
      documentId: row.document_id,
      documentName: row.documents.name,
      category: row.documents.category,
      chunkText: row.chunk_text,
      similarity: 1.0, // No similarity score for category browse
      pageNumber: row.page_number,
      chunkIndex: row.chunk_index
    }))
  } catch (error) {
    console.error('Category search exception:', error)
    return []
  }
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
