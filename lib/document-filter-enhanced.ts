/**
 * Pre-similarity filtering helpers based on query context.
 */

type DocumentLike = {
  documentName?: string
  title?: string
  category?: string
}

type FlagDefinition = {
  key: string
  patterns: string[]
  categoryTokens: string[]
}

type ThemeDefinition = {
  key: string
  patterns: string[]
}

const FLAG_DEFINITIONS: FlagDefinition[] = [
  { key: 'MALTA', patterns: ['malta', 'maltese', 'malte', 'maltais'], categoryTokens: ['MALTA'] },
  { key: 'CAYMAN', patterns: ['cayman', 'cayman islands', 'cayman island', 'caimans'], categoryTokens: ['CAYMAN'] },
  { key: 'IOM', patterns: ['iom', 'isle of man', 'isle-of-man'], categoryTokens: ['IOM', 'ISLE_OF_MAN'] },
  { key: 'MARSHALL', patterns: ['marshall', 'marshall islands'], categoryTokens: ['MARSHALL'] },
  { key: 'BRITISH', patterns: ['british', 'uk', 'united kingdom', 'britain'], categoryTokens: ['UK', 'UNITED_KINGDOM', 'BRITAIN', 'BRITISH'] },
  { key: 'LUXEMBOURG', patterns: ['luxembourg', 'luxembourgish'], categoryTokens: ['LUXEMBOURG'] },
  { key: 'PANAMA', patterns: ['panama', 'panamanian'], categoryTokens: ['PANAMA'] },
  { key: 'BAHAMAS', patterns: ['bahamas', 'bahamian'], categoryTokens: ['BAHAMAS'] },
  { key: 'MONACO', patterns: ['monaco', 'monegasque'], categoryTokens: ['MONACO'] },
  { key: 'FRANCE', patterns: ['france', 'french', 'francais'], categoryTokens: ['FRANCE'] },
  { key: 'MADEIRA', patterns: ['madeira', 'madere'], categoryTokens: ['MADEIRA', 'MADERE'] },
  { key: 'BVI', patterns: ['bvi', 'british virgin', 'virgin islands'], categoryTokens: ['BVI'] },
  { key: 'GIBRALTAR', patterns: ['gibraltar'], categoryTokens: ['GIBRALTAR'] },
  { key: 'NETHERLANDS', patterns: ['netherlands', 'dutch', 'holland', 'pays bas', 'pays-bas'], categoryTokens: ['NETHERLANDS'] },
  { key: 'JERSEY', patterns: ['jersey', 'channel islands'], categoryTokens: ['JERSEY'] }
]

const THEME_DEFINITIONS: ThemeDefinition[] = [
  { key: 'registration', patterns: ['registration', 'register', 'registry', 'flagging', 'immatriculation', 'enregistrement'] },
  { key: 'vat', patterns: ['vat', 'tva', 'iva', 'tax', 'taxation'] },
  { key: 'crew', patterns: ['crew', 'seafarer', 'seaman', 'mariner', 'mlc', 'stcw', 'employment', 'wages'] },
  { key: 'safety', patterns: ['safety', 'solas', 'ism', 'isps', 'security', 'fire', 'life-saving'] },
  { key: 'deletion', patterns: ['deletion', 'deregistration', 'delete', 'certificate of deletion', 'radiation', 'radiation du registre'] },
  { key: 'manning', patterns: ['manning', 'safe manning', 'minimum safe manning', 'mms'] }
]

const GENERIC_CODE_PATTERNS = [
  'code',
  'international',
  'convention',
  'solas',
  'mlc',
  'marpol',
  'stcw',
  'ism',
  'isps',
  'ly3',
  'reg yacht code',
  'red ensign',
  'cyc',
  'ogsr'
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

function documentToText(document: DocumentLike): string {
  return `${document.documentName || ''} ${document.title || ''} ${document.category || ''}`.trim()
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

function detectDocumentFlag(document: DocumentLike): string | null {
  return detectFlagFromCategory(document.category) ?? detectFlagFromText(documentToText(document))
}

function isGenericCodeDocument(document: DocumentLike): boolean {
  const haystack = normalize(documentToText(document))
  return GENERIC_CODE_PATTERNS.some(pattern => haystack.includes(pattern))
}

function detectThemes(query: string): string[] {
  const normalized = normalize(query)
  const themes: string[] = []

  for (const theme of THEME_DEFINITIONS) {
    if (theme.patterns.some(pattern => normalized.includes(pattern))) {
      themes.push(theme.key)
    }
  }

  return themes
}

function documentMatchesThemes(document: DocumentLike, themes: string[]): boolean {
  if (themes.length === 0) return true

  const haystack = normalize(documentToText(document))

  for (const theme of THEME_DEFINITIONS) {
    if (!themes.includes(theme.key)) continue
    if (theme.patterns.some(pattern => haystack.includes(pattern))) {
      return true
    }
  }

  return false
}

export function filterByContext<T extends DocumentLike>(query: string, documents: T[]): T[] {
  if (!query || documents.length === 0) return documents

  const queryFlag = detectQueryFlag(query)
  const themes = detectThemes(query)

  let filtered = documents

  if (queryFlag) {
    filtered = filtered.filter(document => {
      const docFlag = detectDocumentFlag(document)
      if (docFlag && docFlag === queryFlag) return true
      return isGenericCodeDocument(document)
    })
  }

  if (themes.length > 0) {
    filtered = filtered.filter(document => documentMatchesThemes(document, themes))
  }

  return filtered
}
