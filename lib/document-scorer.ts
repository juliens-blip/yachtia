/**
 * Document scoring helper to boost official documents mentioned in user queries.
 */

type FlagDefinition = {
  key: string
  label: string
  patterns: string[]
  categoryTokens: string[]
}

const FLAG_DEFINITIONS: FlagDefinition[] = [
  { key: 'MALTA', label: 'Malta', patterns: ['malta', 'maltese', 'malte', 'maltais'], categoryTokens: ['MALTA'] },
  { key: 'CAYMAN', label: 'Cayman', patterns: ['cayman', 'cayman islands', 'cayman island', 'caimans'], categoryTokens: ['CAYMAN'] },
  { key: 'IOM', label: 'IoM', patterns: ['iom', 'isle of man', 'isle-of-man'], categoryTokens: ['IOM', 'ISLE_OF_MAN'] },
  { key: 'MARSHALL', label: 'Marshall', patterns: ['marshall', 'marshall islands'], categoryTokens: ['MARSHALL'] },
  { key: 'BRITISH', label: 'British', patterns: ['british', 'uk', 'united kingdom', 'britain'], categoryTokens: ['UK', 'UNITED_KINGDOM', 'BRITAIN', 'BRITISH'] },
  { key: 'LUXEMBOURG', label: 'Luxembourg', patterns: ['luxembourg', 'luxembourgish'], categoryTokens: ['LUXEMBOURG'] },
  { key: 'PANAMA', label: 'Panama', patterns: ['panama', 'panamanian'], categoryTokens: ['PANAMA'] },
  { key: 'BAHAMAS', label: 'Bahamas', patterns: ['bahamas', 'bahamian'], categoryTokens: ['BAHAMAS'] },
  { key: 'MONACO', label: 'Monaco', patterns: ['monaco', 'monegasque'], categoryTokens: ['MONACO'] },
  { key: 'FRANCE', label: 'France', patterns: ['france', 'french', 'francais'], categoryTokens: ['FRANCE'] },
  { key: 'MADEIRA', label: 'Madeira', patterns: ['madeira', 'madere'], categoryTokens: ['MADEIRA', 'MADERE'] },
  { key: 'BVI', label: 'BVI', patterns: ['bvi', 'british virgin', 'virgin islands'], categoryTokens: ['BVI'] },
  { key: 'GIBRALTAR', label: 'Gibraltar', patterns: ['gibraltar'], categoryTokens: ['GIBRALTAR'] },
  { key: 'NETHERLANDS', label: 'Netherlands', patterns: ['netherlands', 'dutch', 'holland', 'pays bas', 'pays-bas'], categoryTokens: ['NETHERLANDS'] },
  { key: 'JERSEY', label: 'Jersey', patterns: ['jersey', 'channel islands'], categoryTokens: ['JERSEY'] }
]

const ARTICLE_PATTERNS = [
  'article',
  'blog',
  'news',
  'insight',
  'analysis',
  'newsletter',
  'press',
  'opinion'
]

const REGISTRATION_KEYWORDS = ['registration', 'register', 'registry', 'immatriculation', 'enregistrement']
const OFFICIAL_REGISTRY_PATTERNS = ['ogsr', 'official guide to ship registries', 'merchant shipping act']

const SCORE_MIN = 0.5
const SCORE_MAX = 3.0

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function detectFlagFromCategory(category?: string): string | null {
  if (!category) return null
  const match = category.match(/PAVILLON_([A-Z0-9_]+)/)
  if (!match) return null

  const raw = match[1]
  for (const definition of FLAG_DEFINITIONS) {
    if (definition.categoryTokens.some(token => raw.includes(token))) {
      return definition.key
    }
  }

  return null
}

function detectFlagFromText(text: string): string | null {
  const normalized = normalize(text)
  for (const definition of FLAG_DEFINITIONS) {
    if (definition.patterns.some(pattern => normalized.includes(pattern))) {
      return definition.key
    }
  }
  return null
}

function detectQueryFlag(query: string): string | null {
  return detectFlagFromText(query)
}

function detectDocFlag(docName?: string, category?: string): string | null {
  return detectFlagFromCategory(category) ?? detectFlagFromText(`${docName || ''} ${category || ''}`)
}

function isArticleLike(docName?: string, category?: string): boolean {
  const haystack = normalize(`${docName || ''} ${category || ''}`)
  return ARTICLE_PATTERNS.some(pattern => haystack.includes(pattern))
}

function queryIncludesLy3(query: string): boolean {
  return /\bly\s?-?3\b/i.test(query)
}

function queryIncludesRegYachtCode(query: string): boolean {
  return /\breg\s+yacht\s+code\b/i.test(query)
}

function docIncludesLy3(docName?: string, category?: string): boolean {
  return /\bly\s?-?3\b/i.test(`${docName || ''} ${category || ''}`)
}

function docIncludesReg(docName?: string, category?: string): boolean {
  return /\breg\b/i.test(`${docName || ''} ${category || ''}`)
}

function queryIncludesRegistration(query: string): boolean {
  const normalized = normalize(query)
  return REGISTRATION_KEYWORDS.some(keyword => normalized.includes(keyword))
}

function docIncludesOfficialRegistry(docName?: string, category?: string): boolean {
  const normalized = normalize(`${docName || ''} ${category || ''}`)
  return OFFICIAL_REGISTRY_PATTERNS.some(pattern => normalized.includes(pattern))
}

export function scoreDocument(docName: string, category: string, query: string): number {
  let multiplier = 1

  if (/\bPAVILLON_/i.test(category || '')) {
    multiplier *= 2
  }

  if (isArticleLike(docName, category)) {
    multiplier *= 0.5
  }

  if (queryIncludesLy3(query) && docIncludesLy3(docName, category)) {
    multiplier *= 3
  }

  if (queryIncludesLy3(query) && !docIncludesLy3(docName, category)) {
    multiplier *= 0.7
  }

  if (queryIncludesRegYachtCode(query) && docIncludesReg(docName, category)) {
    multiplier *= 3
  }

  if (queryIncludesRegistration(query)) {
    const queryFlag = detectQueryFlag(query)
    if (queryFlag && docIncludesOfficialRegistry(docName, category)) {
      multiplier *= 2
    }
  }

  const queryFlag = detectQueryFlag(query)
  if (queryFlag) {
    const docFlag = detectDocFlag(docName, category)
    if (docFlag && docFlag === queryFlag) {
      multiplier *= 2.5
    }
  }

  return clamp(multiplier, SCORE_MIN, SCORE_MAX)
}
