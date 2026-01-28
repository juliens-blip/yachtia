/**
 * Document type and flag detection helpers for ranking boosts
 */

export type DocType = 'CODE' | 'OGSR' | 'LOI' | 'OTHER'

const DOC_TYPE_BOOST: Record<DocType, number> = {
  CODE: 3,
  OGSR: 2.5,
  LOI: 2,
  OTHER: 1
}

const DETECT_DOC_TYPE_CACHE = new Map<string, DocType>()

const QUERY_CODE_BOOST = 3.0
const FLAG_MATCH_BOOST = 2
const FLAG_MISMATCH_PENALTY = 0.5

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

export function extractFlag(text: string): string | null {
  const normalized = normalizeForMatch(text)

  const flagPatterns: Array<{ flag: string; patterns: string[] }> = [
    { flag: 'MALTA', patterns: ['malta', 'maltese', 'malte', 'maltais'] },
    { flag: 'CAYMAN', patterns: ['cayman', 'cayman islands', 'caimans', 'cayman island'] },
    { flag: 'MARSHALL', patterns: ['marshall', 'marshall islands'] },
    { flag: 'BVI', patterns: ['bvi', 'british virgin', 'british virgin islands', 'virgin islands'] },
    { flag: 'IOM', patterns: ['isle of man', 'iom', 'isle-of-man'] },
    { flag: 'JERSEY', patterns: ['jersey', 'channel islands'] },
    { flag: 'GIBRALTAR', patterns: ['gibraltar'] },
    { flag: 'NETHERLANDS', patterns: ['netherlands', 'dutch', 'holland', 'pays bas', 'pays-bas'] },
    { flag: 'UK', patterns: ['uk', 'united kingdom', 'britain', 'british'] },
    { flag: 'PANAMA', patterns: ['panama', 'panamanian'] },
    { flag: 'BAHAMAS', patterns: ['bahamas', 'bahamian'] },
    { flag: 'MONACO', patterns: ['monaco', 'monegasque'] },
    { flag: 'MADEIRA', patterns: ['madeira', 'madere'] },
    { flag: 'FRANCE', patterns: ['france', 'french', 'francais'] }
  ]

  for (const { flag, patterns } of flagPatterns) {
    if (patterns.some(pattern => normalized.includes(pattern))) {
      return flag
    }
  }

  return null
}

function detectDocFlag(documentName?: string, category?: string): string | null {
  const categoryMatch = category?.match(/PAVILLON_([A-Z0-9_]+)/)
  if (categoryMatch) {
    const raw = categoryMatch[1]
    if (raw.includes('MALTA')) return 'MALTA'
    if (raw.includes('CAYMAN')) return 'CAYMAN'
    if (raw.includes('MARSHALL')) return 'MARSHALL'
    if (raw.includes('BVI')) return 'BVI'
    if (raw.includes('IOM')) return 'IOM'
    if (raw.includes('JERSEY')) return 'JERSEY'
    if (raw.includes('GIBRALTAR')) return 'GIBRALTAR'
    if (raw.includes('NETHERLANDS')) return 'NETHERLANDS'
    if (raw.includes('UK') || raw.includes('UNITED_KINGDOM') || raw.includes('BRITAIN')) return 'UK'
    if (raw.includes('PANAMA')) return 'PANAMA'
    if (raw.includes('BAHAMAS')) return 'BAHAMAS'
    if (raw.includes('MONACO')) return 'MONACO'
    if (raw.includes('MADERE') || raw.includes('MADEIRA')) return 'MADEIRA'
    if (raw.includes('FRANCE')) return 'FRANCE'
  }

  const nameFlag = extractFlag(`${documentName || ''} ${category || ''}`)
  return nameFlag
}

export function getFlagBoost(query: string, documentName?: string, category?: string): number {
  const queryFlag = extractFlag(query)
  if (!queryFlag) return 1

  const docFlag = detectDocFlag(documentName, category)
  if (!docFlag) return 1

  if (docFlag === queryFlag) return FLAG_MATCH_BOOST

  return FLAG_MISMATCH_PENALTY
}
