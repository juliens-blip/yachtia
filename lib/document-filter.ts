/**
 * Document Filter - Anti-Bruit pour RAG Pipeline
 * 
 * Problème résolu: Question Malta → sources Monaco/VAT Italie
 * Solution: Filtrer chunks par pavillon et thème avant envoi Gemini
 */

export interface FilterContext {
  flag?: string // Pavillon détecté (Malta, Cayman, Marshall, etc)
  themes?: string[] // Thèmes détectés (eligibility, inspection, manning, etc)
  mentioned_codes?: string[] // Codes mentionnés (LY3, REG, CYC, OGSR)
}

export interface DocumentChunk {
  content: string
  title: string
  similarity: number
  flag?: string // Pavillon du document
  themes?: string[] // Thèmes du document
  document_type?: string // CODE, OGSR, LOI, GUIDE, ARTICLE
}

export interface FilterResult {
  filtered: DocumentChunk[]
  eliminated: DocumentChunk[]
  reason: Map<number, string> // index → raison élimination
}

/**
 * Filtre chunks pour éliminer bruit (pavillons contradictoires, thèmes hors-sujet)
 */
export function filterDocuments(
  chunks: DocumentChunk[],
  context: FilterContext
): FilterResult {
  const filtered: DocumentChunk[] = []
  const eliminated: DocumentChunk[] = []
  const reason = new Map<number, string>()

  chunks.forEach((chunk, index) => {
    let shouldEliminate = false
    let eliminationReason = ''

    // Filtre 1: Pavillon contradictoire
    if (context.flag && chunk.flag) {
      // Si question mentionne pavillon X, éliminer chunks pavillon Y
      const normalizedContextFlag = normalizeFlag(context.flag)
      const normalizedChunkFlag = normalizeFlag(chunk.flag)
      
      if (normalizedChunkFlag !== normalizedContextFlag) {
        // Exception: garder docs génériques multi-pavillons (pas de flag spécifique)
        if (!isGenericDocument(chunk.title)) {
          shouldEliminate = true
          eliminationReason = `Pavillon contradictoire: question=${context.flag}, doc=${chunk.flag}`
        }
      }
    }

    // Filtre 2: Thème complètement hors-sujet
    if (!shouldEliminate && context.themes && context.themes.length > 0 && chunk.themes && chunk.themes.length > 0) {
      const hasOverlap = context.themes.some(t => chunk.themes!.includes(t))
      
      // Si aucun thème en commun ET doc très spécialisé (pas généraliste)
      if (!hasOverlap && chunk.document_type !== 'CODE' && chunk.document_type !== 'OGSR') {
        // Éliminer seulement si thème vraiment incompatible (ex: VAT vs eligibility)
        const isIncompatible = isThemeIncompatible(context.themes, chunk.themes)
        if (isIncompatible) {
          shouldEliminate = true
          eliminationReason = `Thème incompatible: question=${context.themes.join(',')} doc=${chunk.themes.join(',')}`
        }
      }
    }

    if (shouldEliminate) {
      eliminated.push(chunk)
      reason.set(index, eliminationReason)
    } else {
      filtered.push(chunk)
    }
  })

  return { filtered, eliminated, reason }
}

/**
 * Normalise nom pavillon (Malta/MALTA/malta → malta)
 */
function normalizeFlag(flag: string): string {
  const normalized = flag.toLowerCase().trim()
  
  // Mapping aliases
  const aliases: Record<string, string> = {
    'cayman': 'cayman',
    'cayman islands': 'cayman',
    'malta': 'malta',
    'marshall': 'marshall',
    'marshall islands': 'marshall',
    'monaco': 'monaco',
    'red ensign': 'uk',
    'uk': 'uk',
    'british': 'uk',
    'france': 'france',
    'french': 'france',
    'italy': 'italy',
    'italian': 'italy',
  }
  
  return aliases[normalized] || normalized
}

/**
 * Détecte si document est générique (pas spécifique à un pavillon)
 */
function isGenericDocument(title: string): boolean {
  const genericKeywords = [
    'comparison',
    'overview',
    'guide général',
    'international',
    'comparative',
    'multiple flags',
  ]
  
  const lowerTitle = title.toLowerCase()
  return genericKeywords.some(keyword => lowerTitle.includes(keyword))
}

/**
 * Vérifie si thèmes sont incompatibles (ex: VAT vs eligibility)
 */
function isThemeIncompatible(contextThemes: string[], docThemes: string[]): boolean {
  // Groupes de thèmes incompatibles
  const incompatibleGroups = [
    ['vat', 'tax', 'taxation'],
    ['insurance', 'assurance'],
    ['charter', 'affrètement'],
    ['sale', 'purchase', 'vente'],
  ]
  
  // Si question sur eligibility/inspection/manning → éliminer VAT/insurance/etc
  const registrationThemes = ['eligibility', 'inspection', 'manning', 'registration', 'immatriculation']
  const isRegistrationQuestion = contextThemes.some(t => registrationThemes.includes(t.toLowerCase()))
  
  if (isRegistrationQuestion) {
    const isTaxOrInsuranceDoc = docThemes.some(t => 
      ['vat', 'tax', 'taxation', 'insurance', 'assurance'].includes(t.toLowerCase())
    )
    if (isTaxOrInsuranceDoc) return true
  }
  
  // Vérifier incompatibilité stricte entre groupes
  for (const group of incompatibleGroups) {
    const contextInGroup = contextThemes.some(t => group.includes(t.toLowerCase()))
    const docInOtherGroup = incompatibleGroups
      .filter(g => g !== group)
      .some(otherGroup => docThemes.some(t => otherGroup.includes(t.toLowerCase())))
    
    if (contextInGroup && docInOtherGroup) return true
  }
  
  return false
}

/**
 * Logger éliminations pour debug
 */
export function logEliminatedDocuments(result: FilterResult): void {
  if (result.eliminated.length === 0) return
  
  console.log('\n🗑️ Documents éliminés (anti-bruit):')
  result.eliminated.forEach((chunk) => {
    const originalIndex = result.reason.keys().next().value as number | undefined
    const reason = originalIndex !== undefined ? (result.reason.get(originalIndex) || 'unknown') : 'unknown'
    console.log(`  - [${chunk.flag || 'N/A'}] ${chunk.title.substring(0, 60)}...`)
    console.log(`    Raison: ${reason}`)
  })
  console.log(`\nTotal: ${result.eliminated.length} éliminé(s), ${result.filtered.length} conservé(s)\n`)
}
