/**
 * Context extraction helpers for yacht-related queries
 */

export type YachtContext = {
  size?: number
  age?: number
  buildYear?: number
  flag?: string
  citedCodes?: string[]
}

const SIZE_MIN_M = 24
const SIZE_MAX_M = 200
const BUILD_YEAR_MIN = 1950
const BUILD_YEAR_MAX = 2026
const CURRENT_YEAR = 2026

const SIZE_PATTERNS = [
  /(\d+)\s*m(?:\s|$)/i,
  /(\d+)\s*mètres/i,
  /(\d+)\s*ft/i
]

const BUILD_YEAR_PATTERNS = [
  /built\s+in\s+(\d{4})/i,
  /construit\s+en\s+(\d{4})/i
]

const FLAG_PATTERNS: Array<{ flag: string; patterns: string[] }> = [
  { flag: 'Malta', patterns: ['malta', 'maltese', 'malte', 'maltais'] },
  { flag: 'Cayman', patterns: ['cayman', 'cayman islands', 'cayman island', 'caimans'] },
  { flag: 'Marshall', patterns: ['marshall', 'marshall islands'] },
  { flag: 'UK', patterns: ['uk', 'united kingdom', 'britain', 'british'] },
  { flag: 'Panama', patterns: ['panama', 'panamanian'] },
  { flag: 'Bahamas', patterns: ['bahamas', 'bahamian'] },
  { flag: 'Monaco', patterns: ['monaco', 'monegasque'] },
  { flag: 'France', patterns: ['france', 'french', 'francais'] },
  { flag: 'Gibraltar', patterns: ['gibraltar'] },
  { flag: 'Netherlands', patterns: ['netherlands', 'dutch', 'holland', 'pays bas', 'pays-bas'] },
  { flag: 'Jersey', patterns: ['jersey', 'channel islands'] },
  { flag: 'Isle of Man', patterns: ['isle of man', 'iom', 'isle-of-man'] },
  { flag: 'BVI', patterns: ['bvi', 'british virgin', 'british virgin islands', 'virgin islands'] }
]

const CODE_PATTERNS: Array<{ code: string; patterns: string[] }> = [
  { code: 'LY3', patterns: ['ly3', 'large yacht code', 'large yacht code 3'] },
  { code: 'REG Yacht Code', patterns: ['reg yacht code', 'reg code', 'red ensign yacht code', 'reg yacht'] },
  { code: 'CYC', patterns: ['cyc', 'commercial yacht code', 'commercial yacht code (cyc)'] },
  { code: 'MLC', patterns: ['mlc', 'maritime labour convention'] },
  { code: 'SOLAS', patterns: ['solas'] },
  { code: 'MARPOL', patterns: ['marpol'] },
  { code: 'OGSR', patterns: ['ogsr', 'official guide to ship registries'] }
]

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractYachtSize(query: string): number | undefined {
  const normalized = normalize(query)

  for (const pattern of SIZE_PATTERNS) {
    const match = normalized.match(pattern)
    if (!match) continue
    const raw = Number(match[1])
    if (!Number.isFinite(raw)) continue

    let meters = raw
    if (pattern.source.includes('ft')) {
      meters = raw * 0.3048
    }

    const rounded = Math.round(meters)
    if (rounded >= SIZE_MIN_M && rounded <= SIZE_MAX_M) {
      return rounded
    }
  }

  return undefined
}

export function extractYachtAge(query: string): { age?: number; buildYear?: number } {
  const normalized = normalize(query)

  for (const pattern of BUILD_YEAR_PATTERNS) {
    const match = normalized.match(pattern)
    if (!match) continue
    const buildYear = Number(match[1])
    if (!Number.isFinite(buildYear)) continue
    if (buildYear < BUILD_YEAR_MIN || buildYear > BUILD_YEAR_MAX) continue

    const age = Math.max(0, CURRENT_YEAR - buildYear)
    return { age, buildYear }
  }

  return {}
}

export function extractFlag(query: string): string | undefined {
  const normalized = normalize(query)

  for (const { flag, patterns } of FLAG_PATTERNS) {
    if (patterns.some(pattern => normalized.includes(pattern))) {
      return flag
    }
  }

  return undefined
}

export function extractCitedCodes(query: string): string[] {
  const normalized = normalize(query)
  const codes: string[] = []

  for (const { code, patterns } of CODE_PATTERNS) {
    if (patterns.some(pattern => normalized.includes(pattern))) {
      codes.push(code)
    }
  }

  return Array.from(new Set(codes))
}

export function extractYachtContext(query: string): YachtContext {
  const size = extractYachtSize(query)
  const { age, buildYear } = extractYachtAge(query)
  const flag = extractFlag(query)
  const citedCodes = extractCitedCodes(query)

  return {
    size,
    age,
    buildYear,
    flag,
    citedCodes: citedCodes.length > 0 ? citedCodes : undefined
  }
}

export function buildContextPrompt(context: YachtContext): string {
  const lines: string[] = []

  if (context.size !== undefined) {
    lines.push(`Taille estimée du yacht: ${context.size}m.`)
    if (context.size >= 50) {
      lines.push('Conséquence: SOLAS/MLC probablement applicables.')
    }
  }

  if (context.age !== undefined || context.buildYear !== undefined) {
    const ageText = context.age !== undefined ? `${context.age} ans` : 'âge inconnu'
    const yearText = context.buildYear !== undefined ? `(${context.buildYear})` : ''
    lines.push(`Âge du yacht: ${ageText} ${yearText}.`.trim())
    if (context.age !== undefined) {
      if (context.age > 20) {
        lines.push('Conséquence: inspections supplémentaires probables.')
      }
    }
  }

  if (context.flag) {
    lines.push(`Pavillon identifié: ${context.flag}. Prioriser les documents du pavillon.`)
  }

  if (context.citedCodes && context.citedCodes.length > 0) {
    lines.push(`Codes cités: ${context.citedCodes.join(', ')}. Citer ces codes en priorité.`)
  }

  return lines.join('\n')
}
