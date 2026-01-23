/**
 * Text Chunking Utilities
 *
 * Smart text chunking for optimal RAG performance:
 * - Chunk size: 500 tokens (~2000 characters, assuming 4 chars per token)
 * - Overlap: 200 tokens (40%)
 * - Preserves sentence boundaries when possible
 */

const CHUNK_SIZE = 500 // tokens
const OVERLAP = 200 // tokens - increased for better context preservation
const CHARS_PER_TOKEN = 4 // Average estimate

export type ChunkMetadata = {
  section: string
  headers: string[]
  page: number
}

export type TextChunk = {
  text: string
  tokenCount: number
  index: number
  startChar: number
  endChar: number
  metadata: ChunkMetadata
}

/**
 * Estimate token count from character count
 * Assumes ~4 characters per token on average
 */
function estimateTokens(charCount: number): number {
  return Math.ceil(charCount / CHARS_PER_TOKEN)
}

/**
 * Extract headers from text (lines starting with # or all caps lines)
 */
function extractHeaders(text: string): string[] {
  const lines = text.split('\n')
  const headers: string[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    // Markdown headers
    if (trimmed.startsWith('#')) {
      headers.push(trimmed.replace(/^#+\s*/, ''))
    }
    // All caps headers (common in legal docs)
    else if (trimmed.length > 3 && trimmed.length < 100 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      headers.push(trimmed)
    }
  }
  
  return headers.slice(-3) // Keep last 3 headers for context
}

/**
 * Detect section from text content
 */
function detectSection(text: string): string {
  const lowerText = text.toLowerCase()
  
  // Common legal document sections
  if (lowerText.includes('article') || lowerText.includes('clause')) return 'clauses'
  if (lowerText.includes('definition')) return 'definitions'
  if (lowerText.includes('annex') || lowerText.includes('appendix')) return 'annexes'
  if (lowerText.includes('schedule')) return 'schedules'
  if (lowerText.includes('whereas') || lowerText.includes('recital')) return 'recitals'
  if (lowerText.includes('signature') || lowerText.includes('witness')) return 'signatures'
  if (lowerText.includes('table of contents') || lowerText.includes('index')) return 'toc'
  
  return 'body'
}

/**
 * Preserve structure markers for lists and tables
 */
function preserveStructure(text: string): string {
  // Mark list items
  let processed = text.replace(/^(\s*[-•*]\s+)/gm, '\n$1')
  // Mark numbered items
  processed = processed.replace(/^(\s*\d+[.)]\s+)/gm, '\n$1')
  // Preserve table-like structures (pipe delimited)
  processed = processed.replace(/(\|[^|]+\|)/g, '\n$1\n')
  
  return processed
}

/**
 * Split text into sentence-like segments with basic newline handling
 */
function splitIntoSegments(text: string): string[] {
  const sentenceRegex = /[^.!?\n]+[.!?]+|[^.!?\n]+/g
  const matches = text.match(sentenceRegex)
  if (!matches) return [text]
  return matches.map(segment => segment.trim()).filter(segment => segment.length > 0)
}

/**
 * Split oversized segments to avoid single-chunk overflow
 */
function splitLargeSegment(segment: string, maxSize: number): string[] {
  if (segment.length <= maxSize) return [segment]

  const parts: string[] = []
  let start = 0

  while (start < segment.length) {
    let end = Math.min(start + maxSize, segment.length)
    if (end < segment.length) {
      const lastSpace = segment.lastIndexOf(' ', end)
      if (lastSpace > start + Math.floor(maxSize * 0.5)) {
        end = lastSpace
      }
    }
    parts.push(segment.slice(start, end).trim())
    start = end
  }

  return parts.filter(part => part.length > 0)
}

/**
 * Split text into overlapping chunks
 * Uses character-based chunking with token estimation
 */
export function chunkText(
  text: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = OVERLAP,
  pageNumber: number = 1
): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  const charChunkSize = chunkSize * CHARS_PER_TOKEN
  const charOverlap = overlap * CHARS_PER_TOKEN

  return smartChunkText(text, charChunkSize, charOverlap, pageNumber)
}

/**
 * Smart chunking that preserves sentence boundaries
 * More sophisticated than simple character chunking
 */
export function smartChunkText(
  text: string,
  charChunkSize: number = CHUNK_SIZE * CHARS_PER_TOKEN,
  charOverlap: number = OVERLAP * CHARS_PER_TOKEN,
  pageNumber: number = 1
): TextChunk[] {
  // Preserve structure before chunking
  const structuredText = preserveStructure(text)
  
  // Split into sentence-like segments with basic newline support
  const baseSegments = splitIntoSegments(structuredText)
  const sentences = baseSegments.flatMap(segment =>
    splitLargeSegment(segment, charChunkSize)
  )

  const chunks: TextChunk[] = []
  let currentChunk = ''
  let currentChars = 0
  let chunkIndex = 0
  let startChar = 0
  let accumulatedHeaders: string[] = []

  for (const sentence of sentences) {
    const sentenceChars = sentence.length
    
    // Accumulate headers as we go
    const sentenceHeaders = extractHeaders(sentence)
    if (sentenceHeaders.length > 0) {
      accumulatedHeaders = [...accumulatedHeaders, ...sentenceHeaders].slice(-3)
    }

    // If adding this sentence would exceed target, start new chunk
    if (currentChars + sentenceChars > charChunkSize && currentChunk.length > 0) {
      const trimmedChunk = currentChunk.trim()
      const chunkHeaders = extractHeaders(trimmedChunk)
      const headers = [...accumulatedHeaders, ...chunkHeaders].slice(-3)
      chunks.push({
        text: trimmedChunk,
        tokenCount: estimateTokens(trimmedChunk.length),
        index: chunkIndex,
        startChar,
        endChar: startChar + trimmedChunk.length,
        metadata: {
          section: detectSection(trimmedChunk),
          headers,
          page: pageNumber
        }
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
    const chunkHeaders = extractHeaders(trimmedChunk)
    const headers = [...accumulatedHeaders, ...chunkHeaders].slice(-3)
    chunks.push({
      text: trimmedChunk,
      tokenCount: estimateTokens(trimmedChunk.length),
      index: chunkIndex,
      startChar,
      endChar: startChar + trimmedChunk.length,
      metadata: {
        section: detectSection(trimmedChunk),
        headers,
        page: pageNumber
      }
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
