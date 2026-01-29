/**
 * Document type and flag detection helpers for ranking boosts
 */

import {
  extractFlagFromDocument,
  extractFlagFromQuery,
  flagsMatch,
  normalizeFlag,
  type CanonicalFlag
} from './flag-normalizer'

export type DocType = 'CODE' | 'OGSR' | 'LOI' | 'OTHER'

const DOC_TYPE_BOOST: Record<DocType, number> = {
  CODE: 3,
  OGSR: 2.5,
  LOI: 2,
  OTHER: 1
}

const DETECT_DOC_TYPE_CACHE = new Map<string, DocType>()

const QUERY_CODE_BOOST = 5.0  // T-056: Boost codes cités (was 3.0)
const FLAG_MATCH_BOOST = 2
const FLAG_MISMATCH_PENALTY = 0.05  // T-053: Quasi-élimination docs hors pavillon (was 0.5)

const CODE_WITH_DIGITS_REGEX = /\b[A-Z]{2,6}\s?-?\d{1,3}\b/g
const ACRONYM_REGEX = /\b[A-Z]{2,6}\b/g
const KNOWN_ACRONYMS = new Set([
  'LY3', 'LY2', 'LY',
  'REG', 'CYC',
  'MLC', 'ISM', 'ISPS', 'SOLAS', 'MARPOL', 'STCW',
  'OGSR'
])

function normalizeForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function detectDocType(documentName?: string, category?: string): DocType {
  const cacheKey = normalizeForMatch(`${documentName || ''} ${category || ''}`)
  const cached = DETECT_DOC_TYPE_CACHE.get(cacheKey)
  if (cached) return cached

  const haystack = cacheKey

  if (/(^|\s)ogsr(\s|$)/i.test(haystack) || haystack.includes('official guide to ship registries') ||
      haystack.includes('transport malta') || haystack.includes('registration process') ||
      haystack.includes('ship registry') || haystack.includes('merchant shipping')) {
    DETECT_DOC_TYPE_CACHE.set(cacheKey, 'OGSR')
    return 'OGSR'
  }

  if (haystack.includes('code') || haystack.includes('cyc') || haystack.includes('ly3') ||
      haystack.includes('solas') || haystack.includes('marpol') || haystack.includes('stcw') ||
      haystack.includes('isps') || haystack.includes('ism') || haystack.includes('mlc')) {
    DETECT_DOC_TYPE_CACHE.set(cacheKey, 'CODE')
    return 'CODE'
  }

  // VAT/charter guides get LOI-level boost (authoritative)
  if (haystack.includes('vat') || haystack.includes('smartbook') || haystack.includes('iyc') ||
      haystack.includes('yacht welfare') || haystack.includes('charter tax')) {
    DETECT_DOC_TYPE_CACHE.set(cacheKey, 'LOI')
    return 'LOI'
  }

  if (
    haystack.includes('loi') ||
    haystack.includes('law') ||
    haystack.includes('act') ||
    haystack.includes('decret') ||
    haystack.includes('decret-loi') ||
    haystack.includes('ordinance') ||
    haystack.includes('reglement')
  ) {
    DETECT_DOC_TYPE_CACHE.set(cacheKey, 'LOI')
    return 'LOI'
  }

  DETECT_DOC_TYPE_CACHE.set(cacheKey, 'OTHER')
  return 'OTHER'
}

export function getBoostFactor(docType: DocType): number {
  return DOC_TYPE_BOOST[docType] || 1
}

export function extractCodesFromQuery(query: string): string[] {
  const upperQuery = query.toUpperCase()
  const codes = new Set<string>()

  const codeWithDigits = upperQuery.match(CODE_WITH_DIGITS_REGEX) || []
  for (const match of codeWithDigits) {
    codes.add(match.replace(/[^A-Z0-9]/g, ''))
  }

  const acronymMatches = upperQuery.match(ACRONYM_REGEX) || []
  for (const match of acronymMatches) {
    if (KNOWN_ACRONYMS.has(match)) {
      codes.add(match)
    }
  }

  return Array.from(codes)
}

export function getQueryCodeBoost(query: string, documentName?: string, category?: string): number {
  const codes = extractCodesFromQuery(query)
  if (codes.length === 0) return 1

  const haystack = normalizeForMatch(`${documentName || ''} ${category || ''}`).toUpperCase()

  for (const code of codes) {
    const pattern = new RegExp(`\\b${escapeRegExp(code)}\\b`, 'i')
    if (pattern.test(haystack)) {
      return QUERY_CODE_BOOST
    }
  }

  return 1
}

/**
 * Extract flag from document metadata or text
 * @deprecated Use extractFlagFromDocument or extractFlagFromQuery from flag-normalizer.ts
 */
export function extractFlag(text: string): CanonicalFlag | null {
  return normalizeFlag(text)
}

function detectDocFlag(documentName?: string, category?: string): CanonicalFlag | null {
  return extractFlagFromDocument(documentName, category)
}

export function getFlagBoost(query: string, documentName?: string, category?: string): number {
  const queryFlag = extractFlagFromQuery(query)
  if (!queryFlag) return 1

  const docFlag = detectDocFlag(documentName, category)
  if (!docFlag) return 1

  if (flagsMatch(queryFlag, docFlag)) return FLAG_MATCH_BOOST

  return FLAG_MISMATCH_PENALTY
}
