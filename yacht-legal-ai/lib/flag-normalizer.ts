/**
 * Unified flag normalization module
 * Centralizes all flag extraction and normalization logic
 */

export type CanonicalFlag =
  | 'Malta'
  | 'Cayman'
  | 'Marshall'
  | 'UK'
  | 'Panama'
  | 'Bahamas'
  | 'Monaco'
  | 'France'
  | 'Gibraltar'
  | 'Netherlands'
  | 'Jersey'
  | 'Isle of Man'
  | 'BVI'
  | 'Madeira'
  | 'Italy'
  | 'Spain'
  | 'Greece'
  | 'Croatia'
  | 'Turkey'
  | 'Cyprus'
  | 'Belgium'
  | 'Germany'
  | 'Portugal'
  | 'Bermuda'
  | 'Antigua'
  | 'St Vincent'
  | 'Liberia'
  | 'Luxembourg'

/**
 * Canonical flag names - single source of truth
 */
export const FLAG_CANONICAL_NAMES: Record<string, CanonicalFlag> = {
  // Malta variants
  'malta': 'Malta',
  'maltese': 'Malta',
  'malte': 'Malta',
  'maltais': 'Malta',
  'MALTA': 'Malta',
  'PAVILLON_MALTA': 'Malta',
  'PAVILLON_MALTE': 'Malta',
  
  // Cayman variants
  'cayman': 'Cayman',
  'cayman islands': 'Cayman',
  'cayman island': 'Cayman',
  'caimans': 'Cayman',
  'CAYMAN': 'Cayman',
  'PAVILLON_CAYMAN': 'Cayman',
  'PAVILLON_CAYMAN_REG': 'Cayman',
  
  // Marshall Islands variants
  'marshall': 'Marshall',
  'marshall islands': 'Marshall',
  'rmi': 'Marshall',
  'MARSHALL': 'Marshall',
  'PAVILLON_MARSHALL': 'Marshall',
  'PAVILLON_RMI': 'Marshall',
  
  // UK variants
  'uk': 'UK',
  'united kingdom': 'UK',
  'britain': 'UK',
  'british': 'UK',
  'UK': 'UK',
  'PAVILLON_UK': 'UK',
  'PAVILLON_BRITISH': 'UK',
  
  // Panama variants
  'panama': 'Panama',
  'panamanian': 'Panama',
  'PANAMA': 'Panama',
  'PAVILLON_PANAMA': 'Panama',
  
  // Bahamas variants
  'bahamas': 'Bahamas',
  'bahamian': 'Bahamas',
  'BAHAMAS': 'Bahamas',
  'PAVILLON_BAHAMAS': 'Bahamas',
  
  // Monaco variants
  'monaco': 'Monaco',
  'monegasque': 'Monaco',
  'MONACO': 'Monaco',
  'PAVILLON_MONACO': 'Monaco',
  
  // France variants
  'france': 'France',
  'french': 'France',
  'francais': 'France',
  'français': 'France',
  'FRANCE': 'France',
  'PAVILLON_FRANCE': 'France',
  'PAVILLON_FRANCAIS': 'France',
  
  // Gibraltar variants
  'gibraltar': 'Gibraltar',
  'GIBRALTAR': 'Gibraltar',
  'PAVILLON_GIBRALTAR': 'Gibraltar',
  
  // Netherlands variants
  'netherlands': 'Netherlands',
  'dutch': 'Netherlands',
  'holland': 'Netherlands',
  'pays bas': 'Netherlands',
  'pays-bas': 'Netherlands',
  'NETHERLANDS': 'Netherlands',
  'PAVILLON_NETHERLANDS': 'Netherlands',
  'PAVILLON_DUTCH': 'Netherlands',
  
  // Jersey variants
  'jersey': 'Jersey',
  'channel islands': 'Jersey',
  'JERSEY': 'Jersey',
  'PAVILLON_JERSEY': 'Jersey',
  
  // Isle of Man variants
  'isle of man': 'Isle of Man',
  'iom': 'Isle of Man',
  'isle-of-man': 'Isle of Man',
  'IOM': 'Isle of Man',
  'PAVILLON_IOM': 'Isle of Man',
  'PAVILLON_ISLE_OF_MAN': 'Isle of Man',
  
  // BVI variants
  'bvi': 'BVI',
  'british virgin': 'BVI',
  'british virgin islands': 'BVI',
  'virgin islands': 'BVI',
  'BVI': 'BVI',
  'PAVILLON_BVI': 'BVI',
  'PAVILLON_VIRGIN': 'BVI',
  
  // Madeira variants
  'madeira': 'Madeira',
  'madere': 'Madeira',
  'madère': 'Madeira',
  'MADEIRA': 'Madeira',
  'PAVILLON_MADEIRA': 'Madeira',

  // Italy variants
  'italy': 'Italy',
  'italian': 'Italy',
  'italie': 'Italy',
  'italien': 'Italy',
  'ITALY': 'Italy',
  'PAVILLON_ITALY': 'Italy',
  'PAVILLON_ITALIAN': 'Italy',

  // Spain variants
  'spain': 'Spain',
  'spanish': 'Spain',
  'espagne': 'Spain',
  'espagnol': 'Spain',
  'SPAIN': 'Spain',
  'PAVILLON_SPAIN': 'Spain',

  // Greece variants
  'greece': 'Greece',
  'greek': 'Greece',
  'grece': 'Greece',
  'GREECE': 'Greece',
  'PAVILLON_GREECE': 'Greece',

  // Croatia variants
  'croatia': 'Croatia',
  'croatian': 'Croatia',
  'croatie': 'Croatia',
  'CROATIA': 'Croatia',
  'PAVILLON_CROATIA': 'Croatia',

  // Turkey variants
  'turkey': 'Turkey',
  'turkish': 'Turkey',
  'turquie': 'Turkey',
  'TURKEY': 'Turkey',
  'PAVILLON_TURKEY': 'Turkey',

  // Cyprus variants
  'cyprus': 'Cyprus',
  'cypriot': 'Cyprus',
  'chypre': 'Cyprus',
  'CYPRUS': 'Cyprus',
  'PAVILLON_CYPRUS': 'Cyprus',

  // Belgium variants
  'belgium': 'Belgium',
  'belgian': 'Belgium',
  'belgique': 'Belgium',
  'BELGIUM': 'Belgium',
  'PAVILLON_BELGIUM': 'Belgium',

  // Germany variants
  'germany': 'Germany',
  'german': 'Germany',
  'allemagne': 'Germany',
  'GERMANY': 'Germany',
  'PAVILLON_GERMANY': 'Germany',

  // Portugal variants
  'portugal': 'Portugal',
  'portuguese': 'Portugal',
  'PORTUGAL': 'Portugal',
  'PAVILLON_PORTUGAL': 'Portugal',

  // Bermuda variants
  'bermuda': 'Bermuda',
  'bermudian': 'Bermuda',
  'bermudes': 'Bermuda',
  'BERMUDA': 'Bermuda',
  'PAVILLON_BERMUDA': 'Bermuda',

  // Antigua variants
  'antigua': 'Antigua',
  'antigua and barbuda': 'Antigua',
  'ANTIGUA': 'Antigua',
  'PAVILLON_ANTIGUA': 'Antigua',

  // St Vincent variants
  'st vincent': 'St Vincent',
  'saint vincent': 'St Vincent',
  'svg': 'St Vincent',
  'PAVILLON_ST_VINCENT': 'St Vincent',

  // Liberia variants
  'liberia': 'Liberia',
  'liberian': 'Liberia',
  'LIBERIA': 'Liberia',
  'PAVILLON_LIBERIA': 'Liberia',

  // Luxembourg variants
  'luxembourg': 'Luxembourg',
  'luxembourgish': 'Luxembourg',
  'LUXEMBOURG': 'Luxembourg',
  'PAVILLON_LUXEMBOURG': 'Luxembourg'
}

/**
 * Flag detection patterns - order matters (most specific first)
 */
const FLAG_DETECTION_PATTERNS: Array<{ flag: CanonicalFlag; patterns: RegExp[] }> = [
  {
    flag: 'Malta',
    patterns: [
      /\bPAVILLON_MALTA?\b/i,
      /\bmalta(is|ese)?\b/i,
      /\bmalte(se)?\b/i
    ]
  },
  {
    flag: 'Cayman',
    patterns: [
      /\bPAVILLON_CAYMAN(_REG)?\b/i,
      /\bcayman(\s+islands?)?\b/i,
      /\bcaimans?\b/i
    ]
  },
  {
    flag: 'Marshall',
    patterns: [
      /\bPAVILLON_(MARSHALL|RMI)\b/i,
      /\bmarshall(\s+islands?)?\b/i,
      /\brmi\b/i
    ]
  },
  {
    flag: 'BVI',
    patterns: [
      /\bPAVILLON_(BVI|VIRGIN)\b/i,
      /\bbritish\s+virgin(\s+islands?)?\b/i,
      /\bbvi\b/i
    ]
  },
  {
    flag: 'Isle of Man',
    patterns: [
      /\bPAVILLON_(IOM|ISLE_OF_MAN)\b/i,
      /\bisle[- ]of[- ]man\b/i,
      /\biom\b/i
    ]
  },
  {
    flag: 'Jersey',
    patterns: [
      /\bPAVILLON_JERSEY\b/i,
      /\bjersey\b/i,
      /\bchannel\s+islands?\b/i
    ]
  },
  {
    flag: 'Gibraltar',
    patterns: [
      /\bPAVILLON_GIBRALTAR\b/i,
      /\bgibraltar\b/i
    ]
  },
  {
    flag: 'Netherlands',
    patterns: [
      /\bPAVILLON_(NETHERLANDS|DUTCH)\b/i,
      /\bnetherlands?\b/i,
      /\bdutch\b/i,
      /\bholland\b/i,
      /\bpays[- ]bas\b/i
    ]
  },
  {
    flag: 'UK',
    patterns: [
      /\bPAVILLON_(UK|BRITISH)\b/i,
      /\bunited\s+kingdom\b/i,
      /\bbritain\b/i,
      /\bbritish\b/i,
      /\buk\b/i
    ]
  },
  {
    flag: 'Panama',
    patterns: [
      /\bPAVILLON_PANAMA\b/i,
      /\bpanama(nian)?\b/i
    ]
  },
  {
    flag: 'Bahamas',
    patterns: [
      /\bPAVILLON_BAHAMAS\b/i,
      /\bbahamas?\b/i,
      /\bbahamian\b/i
    ]
  },
  {
    flag: 'Monaco',
    patterns: [
      /\bPAVILLON_MONACO\b/i,
      /\bmonaco\b/i,
      /\bmonegasque\b/i
    ]
  },
  {
    flag: 'France',
    patterns: [
      /\bPAVILLON_FRAN[CÇ](AIS|E)\b/i,
      /\bfran[cç](e|ais)\b/i,
      /\bfrench\b/i
    ]
  },
  {
    flag: 'Madeira',
    patterns: [
      /\bPAVILLON_MADEIRA\b/i,
      /\bmad[eè]ira?\b/i,
      /\bmadere\b/i
    ]
  },
  {
    flag: 'Italy',
    patterns: [
      /\bPAVILLON_ITAL(Y|IAN)\b/i,
      /\bital(y|ian|ie|ien)\b/i
    ]
  },
  {
    flag: 'Spain',
    patterns: [
      /\bPAVILLON_SPAIN\b/i,
      /\bspain\b/i,
      /\bspanish\b/i,
      /\bespagn[eo]l?\b/i
    ]
  },
  {
    flag: 'Greece',
    patterns: [
      /\bPAVILLON_GREECE\b/i,
      /\bgree(ce|k)\b/i,
      /\bgrece\b/i
    ]
  },
  {
    flag: 'Croatia',
    patterns: [
      /\bPAVILLON_CROATIA\b/i,
      /\bcroat(ia|ian|ie)\b/i
    ]
  },
  {
    flag: 'Turkey',
    patterns: [
      /\bPAVILLON_TURKEY\b/i,
      /\bturk(ey|ish|ie)\b/i,
      /\bturquie\b/i
    ]
  },
  {
    flag: 'Cyprus',
    patterns: [
      /\bPAVILLON_CYPRUS\b/i,
      /\bcypr(us|iot)\b/i,
      /\bchypre\b/i
    ]
  },
  {
    flag: 'Belgium',
    patterns: [
      /\bPAVILLON_BELGIUM\b/i,
      /\bbelg(ium|ian|ique)\b/i
    ]
  },
  {
    flag: 'Germany',
    patterns: [
      /\bPAVILLON_GERMANY\b/i,
      /\bgerman(y)?\b/i,
      /\ballemagne\b/i
    ]
  },
  {
    flag: 'Portugal',
    patterns: [
      /\bPAVILLON_PORTUGAL\b/i,
      /\bportug(al|uese)\b/i
    ]
  },
  {
    flag: 'Bermuda',
    patterns: [
      /\bPAVILLON_BERMUDA\b/i,
      /\bbermud(a|ian|es)\b/i
    ]
  },
  {
    flag: 'Antigua',
    patterns: [
      /\bPAVILLON_ANTIGUA\b/i,
      /\bantigua\b/i
    ]
  },
  {
    flag: 'St Vincent',
    patterns: [
      /\bPAVILLON_ST_VINCENT\b/i,
      /\b(st|saint)\s*vincent\b/i,
      /\bsvg\b/i
    ]
  },
  {
    flag: 'Liberia',
    patterns: [
      /\bPAVILLON_LIBERIA\b/i,
      /\bliber(ia|ian)\b/i
    ]
  },
  {
    flag: 'Luxembourg',
    patterns: [
      /\bPAVILLON_LUXEMBOURG\b/i,
      /\bluxembourg(ish)?\b/i
    ]
  }
]

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract flag from category metadata (PAVILLON_XXX format)
 */
function extractFlagFromCategory(category: string): CanonicalFlag | null {
  const match = category.match(/PAVILLON_([A-Z0-9_]+)/)
  if (!match) return null
  
  const pavillonKey = `PAVILLON_${match[1]}`
  return FLAG_CANONICAL_NAMES[pavillonKey] || null
}

/**
 * Normalize any flag string to canonical form
 * 
 * @param input - Any flag representation (query, category, document name)
 * @returns Canonical flag name or null if not recognized
 * 
 * @example
 * normalizeFlag('malta') === 'Malta'
 * normalizeFlag('PAVILLON_MALTA') === 'Malta'
 * normalizeFlag('Marshall Islands') === 'Marshall'
 * normalizeFlag('Cayman Islands') === 'Cayman'
 */
export function normalizeFlag(input: string | null | undefined): CanonicalFlag | null {
  if (!input) return null
  
  // Direct lookup in canonical names (fast path for exact matches)
  const directMatch = FLAG_CANONICAL_NAMES[input]
  if (directMatch) return directMatch
  
  // Try category extraction (PAVILLON_XXX)
  if (input.startsWith('PAVILLON_')) {
    const categoryFlag = extractFlagFromCategory(input)
    if (categoryFlag) return categoryFlag
  }
  
  // Normalize and try direct lookup again
  const normalized = normalizeText(input)
  const normalizedMatch = FLAG_CANONICAL_NAMES[normalized]
  if (normalizedMatch) return normalizedMatch
  
  // Pattern matching (most thorough but slowest)
  for (const { flag, patterns } of FLAG_DETECTION_PATTERNS) {
    if (patterns.some(pattern => pattern.test(input))) {
      return flag
    }
  }
  
  return null
}

/**
 * Extract flag from query text
 * Same as normalizeFlag but optimized for user queries
 */
export function extractFlagFromQuery(query: string): CanonicalFlag | null {
  return normalizeFlag(query)
}

/**
 * Extract flag from document metadata
 * Checks both document name and category
 */
export function extractFlagFromDocument(
  documentName: string | undefined,
  category: string | undefined
): CanonicalFlag | null {
  // Category takes precedence (more explicit)
  if (category) {
    const categoryFlag = normalizeFlag(category)
    if (categoryFlag) return categoryFlag
  }
  
  // Fallback to document name
  if (documentName) {
    return normalizeFlag(documentName)
  }
  
  return null
}

/**
 * Check if two flags match (case-insensitive, handles variants)
 */
export function flagsMatch(
  flag1: string | null | undefined,
  flag2: string | null | undefined
): boolean {
  if (!flag1 || !flag2) return false
  
  const normalized1 = normalizeFlag(flag1)
  const normalized2 = normalizeFlag(flag2)
  
  return normalized1 === normalized2
}

/**
 * Get all flag variants for a canonical flag name
 * Useful for SQL queries with multiple category patterns
 */
export function getFlagVariants(canonicalFlag: CanonicalFlag): string[] {
  const variants: string[] = []
  
  for (const [key, value] of Object.entries(FLAG_CANONICAL_NAMES)) {
    if (value === canonicalFlag) {
      variants.push(key)
    }
  }
  
  return variants
}

/**
 * Map canonical flag to category patterns for SQL filtering
 */
export function getFlagCategories(canonicalFlag: CanonicalFlag): string[] {
  const variants = getFlagVariants(canonicalFlag)
  return variants.filter(v => v.startsWith('PAVILLON_'))
}
