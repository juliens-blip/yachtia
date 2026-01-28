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
