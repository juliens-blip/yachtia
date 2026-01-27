/**
 * Enhanced context extraction for yacht metadata from user queries.
 */

export type YachtContext = {
  size?: number
  age?: number
  flag?: string
  gt?: number
  tags: string[]
}

type FlagDefinition = {
  flag: string
  patterns: string[]
}

const CURRENT_YEAR = 2026
const BUILD_YEAR_MIN = 1950
const BUILD_YEAR_MAX = 2026

const FLAG_DEFINITIONS: FlagDefinition[] = [
  { flag: 'Malta', patterns: ['malta', 'maltese', 'malte', 'maltais'] },
  { flag: 'Cayman', patterns: ['cayman', 'cayman islands', 'cayman island', 'caimans'] },
  { flag: 'Marshall', patterns: ['marshall', 'marshall islands'] },
  { flag: 'IoM', patterns: ['iom', 'isle of man', 'isle-of-man'] },
  { flag: 'British', patterns: ['british', 'uk', 'united kingdom', 'britain'] },
  { flag: 'Luxembourg', patterns: ['luxembourg', 'luxembourgish'] },
  { flag: 'Panama', patterns: ['panama', 'panamanian'] },
  { flag: 'Bahamas', patterns: ['bahamas', 'bahamian'] },
  { flag: 'Monaco', patterns: ['monaco', 'monegasque'] },
  { flag: 'France', patterns: ['france', 'french', 'francais'] },
  { flag: 'BVI', patterns: ['bvi', 'british virgin', 'virgin islands'] },
  { flag: 'Gibraltar', patterns: ['gibraltar'] },
  { flag: 'Netherlands', patterns: ['netherlands', 'dutch', 'holland', 'pays bas', 'pays-bas'] },
  { flag: 'Jersey', patterns: ['jersey', 'channel islands'] }
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

function extractSize(query: string): number | undefined {
  const match = query.match(/(\d+(?:\.\d+)?)\s*(m|metres|meters|feet|ft)\b/i)
  if (!match) return undefined

  const raw = Number(match[1])
  if (!Number.isFinite(raw)) return undefined

  const unit = match[2].toLowerCase()
  const meters = unit === 'feet' || unit === 'ft' ? raw * 0.3048 : raw
  return Math.round(meters)
}

function extractBuildYear(query: string): number | undefined {
  const patterns = [
    /built\s*(?:in\s*)?(\d{4})/i,
    /construit\s*(?:en\s*)?(\d{4})/i,
    /(\d{4})\s*yacht/i
  ]

  for (const pattern of patterns) {
    const match = query.match(pattern)
    if (!match) continue
    const year = Number(match[1])
    if (!Number.isFinite(year)) continue
    if (year < BUILD_YEAR_MIN || year > BUILD_YEAR_MAX) continue
    return year
  }

  return undefined
}

function extractFlag(query: string): string | undefined {
  const normalized = normalize(query)
  for (const definition of FLAG_DEFINITIONS) {
    if (definition.patterns.some(pattern => normalized.includes(pattern))) {
      return definition.flag
    }
  }
  return undefined
}

function extractGt(query: string): number | undefined {
  const match = query.match(/(\d+)\s*gt\b/i)
  if (!match) return undefined
  const raw = Number(match[1])
  if (!Number.isFinite(raw)) return undefined
  return raw
}

function buildTags(size?: number, age?: number, gt?: number): string[] {
  const tags: string[] = []

  if (size !== undefined && size > 24) {
    tags.push('Large Yacht')
  }

  if ((size !== undefined && size >= 50) || (gt !== undefined && gt >= 500)) {
    tags.push('SOLAS/MLC applicable')
  }

  if (age !== undefined && age > 15) {
    tags.push('Enhanced inspections')
  }

  if (age !== undefined && age > 25) {
    tags.push('Age-related')
  }

  return tags
}

export function extractYachtContext(query: string): YachtContext {
  const size = extractSize(query)
  const buildYear = extractBuildYear(query)
  const age = buildYear !== undefined ? Math.max(0, CURRENT_YEAR - buildYear) : undefined
  const flag = extractFlag(query)
  const gt = extractGt(query)
  const tags = buildTags(size, age, gt)

  return {
    size,
    age,
    flag,
    gt,
    tags
  }
}
