/**
 * T27 - Validation prompt Gemini
 * Tests des règles strictes de citations (min 3) et edge cases
 */

import assert from 'node:assert/strict'

// Types
interface ValidationResult {
  valid: boolean
  citationCount: number
  issues: string[]
  sourcesFound: string[]
}

interface EdgeCaseTest {
  name: string
  response: string
  expectedValid: boolean
  expectedIssues?: string[]
}

// Règles de validation
const MIN_CITATIONS = 3
const CITATION_PATTERN = /\[Source:\s*([^,\]]+)(?:,\s*page\s*(\d+))?(?:,\s*section\s*([^\]]+))?\]/gi
const WEB_CITATION_PATTERN = /\[Web:[^\]]+\]/gi
const VAGUE_PATTERNS = [
  /selon\s+les\s+documents/i,
  /d'après\s+les\s+sources/i,
  /généralement/i,
  /typiquement/i,
  /dans\s+la\s+plupart\s+des\s+cas/i,
  /il\s+est\s+recommandé/i,
]

// Validation des citations
function extractCitations(response: string): string[] {
  const citations: string[] = []
  let match: RegExpExecArray | null

  const regex = new RegExp(CITATION_PATTERN.source, 'gi')
  while ((match = regex.exec(response)) !== null) {
    const sourceName = match[1]?.trim()
    if (sourceName) {
      citations.push(sourceName)
    }
  }

  return [...new Set(citations)]
}

function validateResponse(response: string): ValidationResult {
  const issues: string[] = []
  const sourcesFound = extractCitations(response)
  const citationCount = sourcesFound.length

  // Règle 1: Minimum 3 citations
  if (citationCount < MIN_CITATIONS) {
    issues.push(`Citations insuffisantes: ${citationCount}/${MIN_CITATIONS} minimum`)
  }

  // Règle 2: Pas de citations web si contexte fourni
  const webCitations = response.match(WEB_CITATION_PATTERN) || []
  if (webCitations.length > 0) {
    issues.push(`Citations web détectées alors que contexte fourni: ${webCitations.length}`)
  }

  // Règle 3: Pas de formulations vagues
  for (const pattern of VAGUE_PATTERNS) {
    if (pattern.test(response)) {
      issues.push(`Formulation vague détectée: "${pattern.source}"`)
    }
  }

  // Règle 4: Si "information non trouvée" => doit lister les docs analysés
  const notFoundPattern = /information\s+non\s+trouv[ée]e/i
  if (notFoundPattern.test(response)) {
    const docListPattern = /documents?\s+analys[ée]s?.*:/i
    if (!docListPattern.test(response)) {
      issues.push('Déclaration "info non trouvée" sans liste des documents analysés')
    }
  }

  // Règle 5: Vérifier format citations (nom, page, section)
  const partialCitationPattern = /\[Source:\s*[^,\]]+\]/gi
  const fullCitationPattern = /\[Source:\s*[^,\]]+,\s*page\s*\d+/gi
  const partialMatches = response.match(partialCitationPattern) || []
  const fullMatches = response.match(fullCitationPattern) || []

  if (partialMatches.length > fullMatches.length) {
    const incomplete = partialMatches.length - fullMatches.length
    issues.push(`${incomplete} citation(s) sans numéro de page`)
  }

  return {
    valid: issues.length === 0,
    citationCount,
    issues,
    sourcesFound
  }
}

// Edge cases tests
const EDGE_CASES: EdgeCaseTest[] = [
  {
    name: 'Réponse avec 3 citations valides',
    response: `
      Pour l'immatriculation à Malta:
      [Source: Malta CYC 2020, page 12, section 3.1] Les yachts commerciaux doivent respecter les normes.
      [Source: Malta OGSR Part III, page 15, section 12.2] L'éligibilité propriétaire est définie.
      [Source: LY3 Large Yacht Code, page 8, section 2.4] Les inspections sont obligatoires.
    `,
    expectedValid: true
  },
  {
    name: 'Réponse avec citations insuffisantes (2)',
    response: `
      Pour l'immatriculation:
      [Source: Malta CYC 2020, page 12] Les normes s'appliquent.
      [Source: Malta OGSR, page 15] L'éligibilité est requise.
    `,
    expectedValid: false,
    expectedIssues: ['Citations insuffisantes']
  },
  {
    name: 'Documents contradictoires - doit prioriser codes',
    response: `
      Les sources présentent des informations contradictoires:
      [Source: LY3 Large Yacht Code, page 32, section 5.1] Le code exige un équipage minimum de 5 personnes.
      [Source: Guide cabinet maritime, page 8] Suggère 3 personnes minimum.
      [Source: Malta CYC 2020, page 45, section 8.2] Confirme l'exigence LY3 de 5 personnes.
      Priorité donnée aux codes officiels (LY3, CYC) sur les guides.
    `,
    expectedValid: true
  },
  {
    name: 'Réponse avec citation web (interdit)',
    response: `
      Pour l'immatriculation:
      [Source: Malta CYC 2020, page 12, section 3.1] Les normes s'appliquent.
      [Source: Malta OGSR, page 15, section 2] L'éligibilité est requise.
      [Source: LY3, page 8, section 1] Inspections obligatoires.
      [Web: IMO - https://imo.org] Informations complémentaires.
    `,
    expectedValid: false,
    expectedIssues: ['Citations web détectées']
  },
  {
    name: 'Formulation vague (généralement)',
    response: `
      Généralement, les yachts doivent respecter certaines normes.
      [Source: Malta CYC 2020, page 12, section 3.1] Les normes s'appliquent.
      [Source: Malta OGSR, page 15, section 2] L'éligibilité est requise.
      [Source: LY3, page 8, section 1] Inspections obligatoires.
    `,
    expectedValid: false,
    expectedIssues: ['Formulation vague']
  },
  {
    name: 'Info non trouvée sans liste docs',
    response: `
      Information non trouvée dans les documents fournis.
    `,
    expectedValid: false,
    expectedIssues: ['Citations insuffisantes', 'sans liste des documents']
  },
  {
    name: 'Info non trouvée avec liste docs (valide)',
    response: `
      J'ai analysé les documents suivants pour répondre à votre question:

      Documents analysés (8 chunks):
      - [Malta CYC 2020, pages 4-8] → couvre inspections initiales
      - [Malta OGSR Part III, pages 12-15] → couvre éligibilité
      - [Malta Registration Process, pages 2-3] → couvre procédure

      Information non trouvée dans les documents fournis concernant les waivers spécifiques.

      [Source: Malta CYC 2020, page 4, section 1.1] Inspections standard couvertes.
      [Source: Malta OGSR Part III, page 12, section 2] Éligibilité générale.
      [Source: Malta Registration Process, page 2, section 1] Procédure standard.
    `,
    expectedValid: true
  },
  {
    name: 'Citations partielles (sans page)',
    response: `
      Pour l'immatriculation:
      [Source: Malta CYC 2020] Les normes s'appliquent.
      [Source: Malta OGSR] L'éligibilité est requise.
      [Source: LY3] Inspections obligatoires.
    `,
    expectedValid: false,
    expectedIssues: ['citation(s) sans numéro de page']
  },
  {
    name: '5+ sources différentes (optimal)',
    response: `
      Pour un yacht commercial de 50m construit en 2005:

      [Source: Malta CYC 2020, page 12, section 3.1] Exigences SOLAS applicables.
      [Source: LY3 Large Yacht Code, page 8, section 2.4] Inspections renforcées pour >24m.
      [Source: Malta OGSR Part III, page 15, section 12.2] Éligibilité propriétaire.
      [Source: Malta Merchant Shipping Act, page 23, section 34] Cadre légal.
      [Source: MLC 2006, page 44, section A2.3] Exigences manning.
      [Source: Malta Ship Registry Procedures, page 6, section 4.1] Documents requis.
    `,
    expectedValid: true
  }
]

// Exécution des tests
async function runTests(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  T27 - Test Validation Prompt Gemini')
  console.log('═══════════════════════════════════════════════════════════\n')

  let passed = 0
  let failed = 0

  for (const testCase of EDGE_CASES) {
    const result = validateResponse(testCase.response)
    const testPassed = result.valid === testCase.expectedValid

    if (testCase.expectedIssues && !result.valid) {
      const issuesMatch = testCase.expectedIssues.every(expected =>
        result.issues.some(issue => issue.toLowerCase().includes(expected.toLowerCase()))
      )
      if (!issuesMatch) {
        console.log(`❌ ${testCase.name}`)
        console.log(`   Expected issues: ${testCase.expectedIssues.join(', ')}`)
        console.log(`   Got issues: ${result.issues.join(', ')}`)
        failed++
        continue
      }
    }

    if (testPassed) {
      console.log(`✅ ${testCase.name}`)
      console.log(`   Citations: ${result.citationCount} | Sources: ${result.sourcesFound.join(', ') || 'aucune'}`)
      passed++
    } else {
      console.log(`❌ ${testCase.name}`)
      console.log(`   Expected valid: ${testCase.expectedValid}, Got: ${result.valid}`)
      console.log(`   Issues: ${result.issues.join(', ')}`)
      failed++
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log(`  Résultats: ${passed}/${passed + failed} tests passés`)
  console.log('═══════════════════════════════════════════════════════════\n')

  if (failed > 0) {
    process.exit(1)
  }
}

// Export pour utilisation dans d'autres modules
export { validateResponse, extractCitations }
export type { ValidationResult }

// Exécution si appelé directement
runTests().catch(error => {
  console.error('❌ Test execution failed:', error)
  process.exit(1)
})
