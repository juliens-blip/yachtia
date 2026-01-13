/**
 * Text Chunking Utilities
 *
 * Smart text chunking for optimal RAG performance:
 * - Chunk size: 500 tokens
 * - Overlap: 100 tokens (20%)
 * - Preserves sentence boundaries when possible
 */

import { encode } from 'js-tiktoken/lite'

const CHUNK_SIZE = 500 // tokens
const OVERLAP = 100 // tokens

export type TextChunk = {
  text: string
  tokenCount: number
  index: number
  startChar: number
  endChar: number
}

/**
 * Split text into overlapping chunks
 *
 * @param text - Text to chunk
 * @param chunkSize - Target chunk size in tokens (default: 500)
 * @param overlap - Overlap between chunks in tokens (default: 100)
 * @returns Array of chunks with metadata
 */
export function chunkText(
  text: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = OVERLAP
): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  try {
    const encoder = encode
    const tokens = encoder(text)
    const chunks: TextChunk[] = []

    let startIndex = 0
    let chunkIndex = 0

    while (startIndex < tokens.length) {
      // Calculate end index for this chunk
      const endIndex = Math.min(startIndex + chunkSize, tokens.length)

      // Extract token slice
      const chunkTokens = tokens.slice(startIndex, endIndex)

      // Decode tokens back to text
      // Note: This is a simplified approach. For production, consider using
      // a proper tokenizer library that can decode token arrays
      const chunkText = decodeTokens(chunkTokens)

      chunks.push({
        text: chunkText,
        tokenCount: chunkTokens.length,
        index: chunkIndex,
        startChar: startIndex,
        endChar: endIndex
      })

      // Move to next chunk with overlap
      startIndex += (chunkSize - overlap)
      chunkIndex++
    }

    return chunks
  } catch (error) {
    console.error('Chunking error:', error)
    // Fallback: simple character-based chunking
    return fallbackCharacterChunking(text, chunkSize * 4) // ~4 chars per token average
  }
}

/**
 * Decode token array back to text
 * This is a simplified version - for production use proper tokenizer
 */
function decodeTokens(tokens: number[]): string {
  try {
    // For now, use simple conversion
    // TODO: Implement proper token decoding when needed
    return tokens.map(t => String.fromCharCode(t)).join('')
  } catch {
    return ''
  }
}

/**
 * Fallback chunking strategy using character count
 * Used if token-based chunking fails
 */
function fallbackCharacterChunking(text: string, maxChars: number): TextChunk[] {
  const chunks: TextChunk[] = []
  let startChar = 0
  let chunkIndex = 0

  while (startChar < text.length) {
    const endChar = Math.min(startChar + maxChars, text.length)
    const chunkText = text.substring(startChar, endChar)

    chunks.push({
      text: chunkText,
      tokenCount: Math.floor(chunkText.length / 4), // Rough estimate
      index: chunkIndex,
      startChar,
      endChar
    })

    startChar += maxChars - Math.floor(maxChars * 0.2) // 20% overlap
    chunkIndex++
  }

  return chunks
}

/**
 * Estimate token count for text
 * @param text - Text to analyze
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  try {
    const encoder = encode
    return encoder(text).length
  } catch {
    // Fallback: ~4 characters per token
    return Math.floor(text.length / 4)
  }
}

/**
 * Smart chunking that preserves sentence boundaries
 * More sophisticated than simple token chunking
 *
 * @param text - Text to chunk
 * @param targetChunkSize - Target size in tokens
 * @returns Array of chunks aligned with sentence boundaries
 */
export function smartChunkText(text: string, targetChunkSize: number = CHUNK_SIZE): TextChunk[] {
  // Split by sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

  const chunks: TextChunk[] = []
  let currentChunk = ''
  let currentTokens = 0
  let chunkIndex = 0
  let startChar = 0

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokenCount(sentence)

    // If adding this sentence would exceed target, start new chunk
    if (currentTokens + sentenceTokens > targetChunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        tokenCount: currentTokens,
        index: chunkIndex,
        startChar,
        endChar: startChar + currentChunk.length
      })

      chunkIndex++
      startChar += currentChunk.length
      currentChunk = sentence
      currentTokens = sentenceTokens
    } else {
      currentChunk += sentence
      currentTokens += sentenceTokens
    }
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      tokenCount: currentTokens,
      index: chunkIndex,
      startChar,
      endChar: startChar + currentChunk.length
    })
  }

  return chunks
}
