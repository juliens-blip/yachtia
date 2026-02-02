/**
 * Question Processor for RAG Query Expansion
 * 
 * Expands user questions with variants and keywords
 * to improve RAG retrieval accuracy
 */

const LEGAL_KEYWORDS_MAP: Record<string, string[]> = {
  'vendeur': ['seller', 'propriétaire', 'cédant', 'owner'],
  'acheteur': ['buyer', 'acquéreur', 'purchaser'],
  'contrat': ['contract', 'agreement', 'convention', 'accord'],
  'vente': ['sale', 'transaction', 'cession', 'transfer'],
  'yacht': ['vessel', 'navire', 'bateau', 'boat', 'ship'],
  'obligation': ['duty', 'responsibility', 'devoir', 'requirement'],
  'immatriculation': ['registration', 'enregistrement', 'flag', 'pavillon'],
  'pavillon': ['flag', 'registry', 'flag state'],
  'malta': ['maltese', 'malte', 'maltais'],
  'france': ['french', 'français', 'francais'],
  'cayman': ['caïmans', 'cayman islands'],
  'inspection': ['survey', 'audit', 'contrôle', 'vérification'],
  'certificat': ['certificate', 'attestation', 'document'],
  'assurance': ['insurance', 'policy', 'couverture'],
  'équipage': ['crew', 'personnel', 'matelots'],
  'capitaine': ['captain', 'master', 'skipper'],
  'sécurité': ['safety', 'sûreté', 'security', 'SOLAS'],
  'environnement': ['environment', 'MARPOL', 'pollution'],
  'douane': ['customs', 'douanier', 'dédouanement'],
  'TVA': ['VAT', 'taxe', 'tax'],
  'hypothèque': ['mortgage', 'hypotheque', 'lien'],
  'deletion': ['radiation', 'deregistration', 'closure'],
  'ISM': ['ISM Code', 'safety management'],
  'ISPS': ['ISPS Code', 'security'],
  'MLC': ['Maritime Labour Convention', 'travail maritime'],
}

export interface ExpandedQuery {
  original: string
  variants: string[]
  keywords: string[]
}

export interface QueryAspect {
  name: string
  keywords: string[]
  weight: number
}

export interface ExpandedQueryMultiAspect {
  original: string
  aspects: QueryAspect[]
  queries: { aspect: string; query: string }[]
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function extractLegalKeywords(question: string): string[] {
  const keywords: string[] = []
  const lowerQuestion = question.toLowerCase()
  
  for (const [key, synonyms] of Object.entries(LEGAL_KEYWORDS_MAP)) {
    if (lowerQuestion.includes(key.toLowerCase())) {
      keywords.push(key, ...synonyms)
    }
    for (const synonym of synonyms) {
      if (lowerQuestion.includes(synonym.toLowerCase())) {
        keywords.push(key, ...synonyms)
        break
      }
    }
  }
  
  return Array.from(new Set(keywords))
}

function generateVariants(question: string): string[] {
  const normalized = normalize(question)
  const variants: string[] = []

  // Detect multiple aspects in the query and generate targeted variants for each
  const hasMaltaRegistration = normalized.includes('malta') && (
    normalized.includes('registration') || normalized.includes('register') ||
    normalized.includes('registry') || normalized.includes('immatriculation') ||
    normalized.includes('enregistrement') || normalized.includes('commercial')
  )
  const hasCYC = /\bcyc\b/.test(normalized) || normalized.includes('commercial yacht code')
  const hasVAT = normalized.includes('vat') || normalized.includes('tva') ||
    normalized.includes('taxe') || normalized.includes('charter')
  const hasFlag = normalized.includes('pavillon') || normalized.includes('flag') ||
    normalized.includes('rmi') || normalized.includes('marshall')

  // Generate ONE variant per detected aspect (no early return)
  if (hasMaltaRegistration) {
    variants.push('OGSR Malta registration eligibility owner société shipping organisation')
  }
  if (hasCYC) {
    variants.push('CYC 2020 Commercial Yacht Code safety surveys manning equipment')
  }
  if (hasVAT) {
    variants.push('VAT Smartbook charter taxation France Italy Spain Mediterranean IYC')
  }
  if (hasFlag) {
    variants.push('flag state deregistration deletion certificate re-registration pavillon')
  }

  // Generic keyword expansion if no specific aspects detected
  if (variants.length === 0) {
    const keywords = extractLegalKeywords(question)
    if (keywords.length > 0) {
      variants.push(`${question} (${keywords.slice(0, 5).join(', ')})`)
    }
    if (question.includes('obligation')) {
      variants.push(question.replace('obligation', 'responsabilité'))
    }
    if (question.includes('yacht')) {
      variants.push(question.replace('yacht', 'vessel'))
    }
  }

  return variants.slice(0, 5)
}

export async function expandQuery(question: string): Promise<ExpandedQuery> {
  const keywords = extractLegalKeywords(question)
  const variants = generateVariants(question)
  
  return {
    original: question,
    variants,
    keywords
  }
}

export function deduplicateChunks<T extends { chunk_text?: string; id?: string }>(
  chunks: T[]
): T[] {
  const seen = new Set<string>()
  return chunks.filter(chunk => {
    const key = chunk.id || chunk.chunk_text?.substring(0, 100) || ''
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Detect multi-aspect patterns in query
 * Returns null if < 2 aspects (use simple expansion)
 */
export function detectMultiAspect(query: string): QueryAspect[] | null {
  const normalized = normalize(query)
  const aspects: QueryAspect[] = []

  // Pattern: transfer/re-flag involving RMI
  const hasRMIExit = (normalized.includes('rmi') || normalized.includes('marshall')) &&
    (normalized.includes('transfer') || normalized.includes('reflag') || 
     normalized.includes('deletion') || normalized.includes('radiation') || 
     normalized.includes('deregister') || /de\s+rmi|from\s+rmi/.test(normalized))

  // Pattern: Malta entry/registration
  const hasMaltaEntry = (normalized.includes('malta') || normalized.includes('malte')) &&
    (normalized.includes('transfer') || normalized.includes('reflag') || 
     normalized.includes('register') || normalized.includes('immatriculation') || 
     normalized.includes('commercial') || /vers\s+malt|to\s+malt/.test(normalized))

  // Pattern: Technical/CYC requirements (infer from transfer context)
  const hasTechnical = normalized.includes('cyc') ||
    normalized.includes('commercial yacht') ||
    normalized.includes('surveys') ||
    normalized.includes('safety') ||
    normalized.includes('manning') ||
    // Infer technical aspect if transfer involves Malta commercial registry
    ((hasRMIExit || hasMaltaEntry) && (normalized.includes('yacht') || normalized.includes('vessel')))

  // Pattern: Fiscal/VAT (infer from Malta transfer context)
  const hasFiscal = normalized.includes('vat') || normalized.includes('tva') ||
    normalized.includes('tax') || normalized.includes('fiscal') ||
    normalized.includes('charter') ||
    // Infer fiscal aspect for Malta transfers (VAT/charter implications)
    (hasMaltaEntry && hasTechnical)

  if (hasRMIExit) {
    aspects.push({
      name: 'Exit_RMI',
      keywords: ['RMI', 'Marshall Islands', 'deletion', 'deregistration', 'closure', 'provisional', 'MI-103', 'flag state'],
      weight: 1.0
    })
  }

  if (hasMaltaEntry) {
    aspects.push({
      name: 'Entry_Malta',
      keywords: ['Malta', 'OGSR', 'registration', 'commercial yacht', 'eligibility', 'société', 'shipping organisation', 'Transport Malta'],
      weight: 1.0
    })
  }

  if (hasTechnical) {
    aspects.push({
      name: 'Technical',
      keywords: ['CYC', 'Commercial Yacht Code', 'surveys', 'safety equipment', 'manning', 'certificates', 'SOLAS', 'ISM'],
      weight: 0.8
    })
  }

  if (hasFiscal) {
    aspects.push({
      name: 'Fiscal',
      keywords: ['VAT', 'taxation', 'charter', 'IYC', 'Smartbook', 'fiscal regime', 'Mediterranean', 'France', 'Italy'],
      weight: 0.8
    })
  }

  return aspects.length >= 2 ? aspects : null
}

/**
 * Expand query with multi-aspect decomposition
 * Falls back to simple expansion if < 2 aspects
 */
export async function expandQueryMultiAspect(query: string): Promise<ExpandedQueryMultiAspect | ExpandedQuery> {
  const aspects = detectMultiAspect(query)

  if (!aspects) {
    // Fallback to simple expansion
    return expandQuery(query)
  }

  // Multi-aspect: create enriched query per aspect
  const queries = aspects.map(aspect => ({
    aspect: aspect.name,
    query: `${query} (${aspect.keywords.slice(0, 5).join(', ')})`
  }))

  return {
    original: query,
    aspects,
    queries
  }
}
