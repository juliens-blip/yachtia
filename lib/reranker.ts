/**
 * Re-ranking module for RAG pipeline
 *
 * Combines vector similarity with semantic relevance scoring
 * to improve chunk retrieval quality
 */

import { detectDocType, getBoostFactor, getFlagBoost, getQueryCodeBoost } from './doc-type-tagger'

export type RankedChunk = {
  chunk_text: string
  similarity: number
  score: number
  chunkId?: string
  documentId?: string
  documentName?: string
  category?: string
  pageNumber?: number | null
  chunkIndex?: number
  sourceUrl?: string
}

type ChunkInput = {
  chunk_text: string
  similarity: number
  chunkId?: string
  documentId?: string
  documentName?: string
  category?: string
  pageNumber?: number | null
  chunkIndex?: number
  sourceUrl?: string
}

/**
 * Calculate semantic similarity between query and chunk text
 * Uses keyword overlap and term frequency
 */
function calculateSemanticScore(query: string, chunkText: string): number {
  const queryTerms = normalizeText(query).split(/\s+/).filter(t => t.length > 2)
  const chunkTerms = normalizeText(chunkText).split(/\s+/).filter(t => t.length > 2)
  
  if (queryTerms.length === 0) return 0
  
  let matchCount = 0
  let weightedScore = 0
  
  for (const queryTerm of queryTerms) {
    const termCount = chunkTerms.filter(t =>
      t === queryTerm ||
      t.startsWith(queryTerm) ||
      queryTerm.startsWith(t)
    ).length
    if (termCount > 0) {
      matchCount++
      weightedScore += Math.min(termCount / 3, 1)
    }
  }
  
  const coverageScore = matchCount / queryTerms.length
  const densityScore = weightedScore / queryTerms.length
  
  return (coverageScore * 0.6 + densityScore * 0.4)
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Re-rank chunks combining vector similarity with semantic scoring
 * 
 * @param query - User's search query
 * @param chunks - Array of chunks with vector similarity scores
 * @param topK - Number of top chunks to return (default: 5)
 * @returns Re-ranked chunks with combined scores
 */
export async function rerankChunks(
  query: string,
  chunks: ChunkInput[],
  topK: number = 5
): Promise<RankedChunk[]> {
  if (chunks.length === 0) return []
  const profileEnabled = process.env.RERANK_PROFILE === '1'
  if (profileEnabled) {
    console.time('rerankChunks')
  }
  
  const scoredChunks: RankedChunk[] = chunks.map(chunk => {
    const vectorScore = chunk.similarity
    const semanticScore = calculateSemanticScore(query, chunk.chunk_text)
    const baseScore = vectorScore * 0.5 + semanticScore * 0.5

    const docType = detectDocType(chunk.documentName, chunk.category)
    const docTypeBoost = getBoostFactor(docType)
    const queryCodeBoost = getQueryCodeBoost(query, chunk.documentName, chunk.category)
    const flagBoost = getFlagBoost(query, chunk.documentName, chunk.category)
    const combinedScore = baseScore * docTypeBoost * queryCodeBoost * flagBoost

    return {
      ...chunk,
      score: combinedScore
    }
  })
  
  scoredChunks.sort((a, b) => b.score - a.score)
  
  const results = scoredChunks.slice(0, topK)
  if (profileEnabled) {
    console.timeEnd('rerankChunks')
  }
  return results
}

/**
 * Calculate diversity score to avoid returning similar chunks
 */
function calculateDiversity(chunk: string, selectedChunks: string[]): number {
  if (selectedChunks.length === 0) return 1
  
  const chunkTerms = new Set(normalizeText(chunk).split(/\s+/))
  
  let maxOverlap = 0
  for (const selected of selectedChunks) {
    const selectedTerms = new Set(normalizeText(selected).split(/\s+/))
    const intersection = Array.from(chunkTerms).filter(t => selectedTerms.has(t)).length
    const overlap = intersection / Math.max(chunkTerms.size, 1)
    maxOverlap = Math.max(maxOverlap, overlap)
  }
  
  return 1 - maxOverlap * 0.3
}

/**
 * Re-rank with diversity - ensures variety in returned chunks
 * 
 * @param query - User's search query
 * @param chunks - Array of chunks with vector similarity scores
 * @param topK - Number of top chunks to return
 * @returns Diverse set of re-ranked chunks
 */
export async function rerankWithDiversity(
  query: string,
  chunks: ChunkInput[],
  topK: number = 5
): Promise<RankedChunk[]> {
  if (chunks.length === 0) return []
  
  const scoredChunks = await rerankChunks(query, chunks, chunks.length)
  
  const selected: RankedChunk[] = []
  const selectedTexts: string[] = []
  
  for (const chunk of scoredChunks) {
    if (selected.length >= topK) break
    
    const diversityScore = calculateDiversity(chunk.chunk_text, selectedTexts)
    const adjustedScore = chunk.score * diversityScore
    
    if (adjustedScore > 0.3 || selected.length === 0) {
      selected.push({ ...chunk, score: adjustedScore })
      selectedTexts.push(chunk.chunk_text)
    }
  }
  
  return selected
}

/**
 * Get statistics about re-ranking improvement
 */
export function getRerankingStats(
  beforeChunks: ChunkInput[],
  afterChunks: RankedChunk[]
): { beforeAvg: number; afterAvg: number; improvement: number } {
  const beforeAvg = beforeChunks.reduce((sum, c) => sum + c.similarity, 0) / Math.max(beforeChunks.length, 1)
  const afterAvg = afterChunks.reduce((sum, c) => sum + c.score, 0) / Math.max(afterChunks.length, 1)
  
  return {
    beforeAvg,
    afterAvg,
    improvement: afterAvg > 0 ? (afterAvg - beforeAvg) / beforeAvg : 0
  }
}
