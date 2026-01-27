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

  const isMaltaRegistration = normalized.includes('malta') && (
    normalized.includes('registration') ||
    normalized.includes('register') ||
    normalized.includes('registry') ||
    normalized.includes('immatriculation') ||
    normalized.includes('enregistrement')
  )

  if (isMaltaRegistration) {
    variants.push('Malta registration eligibility requirements')
    variants.push('Malta ship registry documents process')
    variants.push('OGSR Malta vessel registration criteria')
    return variants
  }

  const keywords = extractLegalKeywords(question)
  
  if (keywords.length > 0) {
    const keywordVariant = `${question} (${keywords.slice(0, 5).join(', ')})`
    variants.push(keywordVariant)
  }
  
  if (question.includes('obligation')) {
    variants.push(question.replace('obligation', 'responsabilité'))
    variants.push(question.replace('obligation', 'devoir'))
  }
  if (question.includes('vendeur')) {
    variants.push(question.replace('vendeur', 'seller'))
  }
  if (question.includes('acheteur')) {
    variants.push(question.replace('acheteur', 'buyer'))
  }
  if (question.includes('contrat')) {
    variants.push(question.replace('contrat', 'agreement'))
    variants.push(question.replace('contrat', 'convention'))
  }
  if (question.includes('yacht')) {
    variants.push(question.replace('yacht', 'vessel'))
    variants.push(question.replace('yacht', 'navire'))
  }
  
  return variants.slice(0, 3)
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
