/**
 * Post-processing validation for Gemini responses.
 */

import type { RelevantChunk } from './rag-pipeline'

export type ResponseValidation = {
  valid: boolean
  retry?: string
  issues: string[]
}

const MIN_SOURCE_COUNT = 5

const MISSING_INFO_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  { regex: /information\s+manquante(?:\s+sur)?\s+([^\.\n]+)/gi, label: 'information manquante' },
  { regex: /base\s+insuffisante(?:\s+sur)?\s+([^\.\n]+)/gi, label: 'base insuffisante' },
  { regex: /pas\s+d['’]information\s+sur\s+([^\.\n]+)/gi, label: 'pas d\'information' },
  { regex: /pas\s+d['’]info(?:rmation)?\s+sur\s+([^\.\n]+)/gi, label: 'pas d\'info' }
]

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function extractCitedSources(response: string): string[] {
  const sources = new Set<string>()
  const regex = /\[Source:\s*([^,\]]+)/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(response)) !== null) {
    const name = match[1]?.trim()
    if (name) sources.add(name)
  }
  return Array.from(sources)
}

function extractMissingInfoKeywords(response: string): Array<{ keyword: string; phrase: string }> {
  const findings: Array<{ keyword: string; phrase: string }> = []

  for (const pattern of MISSING_INFO_PATTERNS) {
    const matches = response.matchAll(pattern.regex)
    for (const match of matches) {
      const raw = match[1]?.trim()
      if (!raw) continue
      const keyword = raw.split(/,|;|\.|\n/)[0]?.trim()
      if (keyword) {
        findings.push({ keyword, phrase: pattern.label })
      }
    }
  }

  return findings
}

function findKeywordInChunks(keyword: string, chunks: RelevantChunk[]): RelevantChunk | undefined {
  const normalizedKeyword = normalize(keyword)
  if (!normalizedKeyword) return undefined

  return chunks.find(chunk => normalize(chunk.chunkText).includes(normalizedKeyword))
}

export function validateResponse(response: string, chunks: RelevantChunk[]): ResponseValidation {
  const issues: string[] = []

  const citedSources = extractCitedSources(response)
  if (citedSources.length < MIN_SOURCE_COUNT) {
    issues.push(`sources citées insuffisantes (${citedSources.length})`)
    return {
      valid: false,
      retry: 'CITE AU MINIMUM 5 SOURCES DIFFÉRENTES',
      issues
    }
  }

  // Check source diversity if many chunks available
  const uniqueSources = new Set(citedSources)
  if (chunks.length >= 5 && uniqueSources.size < 3) {
    issues.push(`Insufficient source diversity (${uniqueSources.size} unique sources with ${chunks.length} chunks available)`)
    return {
      valid: false,
      retry: 'CITE AU MINIMUM 5 SOURCES DIFFÉRENTES parmi les documents fournis',
      issues
    }
  }

  if (citedSources.length >= MIN_SOURCE_COUNT) {
    return { valid: true, issues }
  }

  const missingInfoFindings = extractMissingInfoKeywords(response)
  for (const finding of missingInfoFindings) {
    const matchingChunk = findKeywordInChunks(finding.keyword, chunks)
    if (matchingChunk) {
      issues.push(`${finding.phrase} alors que '${finding.keyword}' existe dans ${matchingChunk.documentName}`)
      return {
        valid: false,
        retry: `L'information sur ${finding.keyword} est dans ${matchingChunk.documentName}. Re-analyse en profondeur.`,
        issues
      }
    }
  }

  return { valid: true, issues }
}
