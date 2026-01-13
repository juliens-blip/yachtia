/**
 * Text Chunking Utilities
 *
 * Smart text chunking for optimal RAG performance:
 * - Chunk size: 500 tokens (~2000 characters, assuming 4 chars per token)
 * - Overlap: 100 tokens (20%)
 * - Preserves sentence boundaries when possible
 */

const CHUNK_SIZE = 500 // tokens
const OVERLAP = 100 // tokens
const CHARS_PER_TOKEN = 4 // Average estimate

export type TextChunk = {
  text: string
  tokenCount: number
  index: number
  startChar: number
  endChar: number
}

/**
 * Estimate token count from character count
 * Assumes ~4 characters per token on average
 */
function estimateTokens(charCount: number): number {
  return Math.ceil(charCount / CHARS_PER_TOKEN)
}

/**
 * Split text into overlapping chunks
 * Uses character-based chunking with token estimation
 */
export function chunkText(
  text: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = OVERLAP
): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  const charChunkSize = chunkSize * CHARS_PER_TOKEN
  const charOverlap = overlap * CHARS_PER_TOKEN

  return smartChunkText(text, charChunkSize, charOverlap)
}

/**
 * Smart chunking that preserves sentence boundaries
 * More sophisticated than simple character chunking
 */
export function smartChunkText(
  text: string,
  charChunkSize: number = CHUNK_SIZE * CHARS_PER_TOKEN,
  charOverlap: number = OVERLAP * CHARS_PER_TOKEN
): TextChunk[] {
  // Split by sentences (basic approach: split on . ! ?)
  const sentenceRegex = /[^.!?]+[.!?]+/g
  const sentences = text.match(sentenceRegex) || [text]

  const chunks: TextChunk[] = []
  let currentChunk = ''
  let currentChars = 0
  let chunkIndex = 0
  let startChar = 0

  for (const sentence of sentences) {
    const sentenceChars = sentence.length

    // If adding this sentence would exceed target, start new chunk
    if (currentChars + sentenceChars > charChunkSize && currentChunk.length > 0) {
      const trimmedChunk = currentChunk.trim()
      chunks.push({
        text: trimmedChunk,
        tokenCount: estimateTokens(trimmedChunk.length),
        index: chunkIndex,
        startChar,
        endChar: startChar + trimmedChunk.length
      })

      chunkIndex++
      startChar += trimmedChunk.length

      // Add overlap from previous chunk if possible
      if (currentChunk.length > charOverlap) {
        currentChunk = currentChunk.slice(-charOverlap) + sentence
        currentChars = charOverlap + sentenceChars
      } else {
        currentChunk = sentence
        currentChars = sentenceChars
      }
    } else {
      currentChunk += sentence
      currentChars += sentenceChars
    }
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    const trimmedChunk = currentChunk.trim()
    chunks.push({
      text: trimmedChunk,
      tokenCount: estimateTokens(trimmedChunk.length),
      index: chunkIndex,
      startChar,
      endChar: startChar + trimmedChunk.length
    })
  }

  return chunks
}

/**
 * Estimate token count for text
 * Based on character count: ~4 characters per token
 */
export function estimateTokenCount(text: string): number {
  return estimateTokens(text.length)
}
