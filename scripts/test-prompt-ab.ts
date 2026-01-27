/**
 * T27 - A/B Testing Prompts
 * Compare 2 variantes de prompts pour qualité des citations
 */

import assert from 'node:assert/strict'

// Types
interface PromptVariant {
  name: string
  description: string
  systemPrompt: string
}

interface TestQuery {
  question: string
  expectedTopics: string[]
}

interface ABTestResult {
  variantName: string
  query: string
  citationCount: number
  uniqueSources: string[]
  hasPageNumbers: boolean
  hasCodePriority: boolean
  score: number
  issues: string[]
}

interface ABSummary {
  variantA: { name: string; avgScore: number; totalCitations: number }
  variantB: { name: string; avgScore: number; totalCitations: number }
  winner: string
  recommendation: string
}

// Variante A: Prompt actuel (V3 standard)
const PROMPT_VARIANT_A: PromptVariant = {
  name: 'V3_Standard',
  description: 'Prompt V3 avec règles strictes citations',
  systemPrompt: `Tu es un assistant juridique maritime expert.

RÈGLES STRICTES:
1. MINIMUM 3 CITATIONS OBLIGATOIRES au format: [Source: NOM_DOCUMENT, page X, section Y]
2. LIRE INTÉGRALEMENT tous les chunks fournis
3. FUSION MULTI-SOURCES: Croiser CODE + OGSR + GUIDE
4. JAMAIS utiliser internet
5. Si info manquante: lister tous les docs analysés

HIÉRARCHIE SOURCES:
1. Codes juridiques (LY3, REG, CYC, MLC, SOLAS)
2. OGSR/Lois nationales
3. Guides professionnels
4. Articles techniques`
}

// Variante B: Prompt enrichi avec few-shot amélioré
const PROMPT_VARIANT_B: PromptVariant = {
  name: 'V3_Enhanced',
  description: 'Prompt V3 avec few-shot enrichi et scoring explicite',
  systemPrompt: `Tu es un assistant juridique maritime expert.

═══════════════════════════════════════════════════
SCORING QUALITÉ RÉPONSE (auto-évaluation obligatoire)
═══════════════════════════════════════════════════

Avant de répondre, calcule mentalement ton score:
- 5+ sources citées = +10 points
- Codes prioritaires cités = +5 points par code
- Page + section pour chaque citation = +2 points par citation
- Croisement 3 types sources (CODE/OGSR/GUIDE) = +10 points
- Formulation vague ("généralement", "typiquement") = -5 points

MINIMUM REQUIS: 25 points

RÈGLES ABSOLUES:
1. MINIMUM 5 CITATIONS avec page et section
2. CODES CITÉS = PRIORITÉ ABSOLUE (LY3 > OGSR > Guide)
3. Format strict: [Source: NOM_DOCUMENT, page X, section Y]
4. INTERDICTION: citations web, formulations vagues

FEW-SHOT EXEMPLAIRE (score: 32 points):

Question: "Inspection yacht 45m Malta construit 2000"

Réponse:
Pour un yacht de 45m construit en 2000 (24 ans):

**Inspections selon âge:**
[Source: Malta CYC 2020, page 8, section 4.2] Yachts >20 ans: inspection annuelle renforcée obligatoire.
[Source: LY3 Large Yacht Code, page 32, section 5.1] Inspections structure tous les 5 ans après 15 ans.

**Exigences taille:**
[Source: SOLAS Chapter II-1, page 45, section 12] Navires >24m: certificats sécurité obligatoires.
[Source: MLC 2006, page 44, section A2.3] Manning minimum selon jauge.

**Procédure Malta:**
[Source: Malta Registration Process, page 6, section 4.1] Documents: Certificate of Inspection, Class Certificate, Survey Report.

Score: 5 sources × 5 + 2 codes prioritaires × 5 + croisement = 35 points ✓`
}

// Queries de test
const TEST_QUERIES: TestQuery[] = [
  {
    question: 'Immatriculation yacht commercial 50m à Malta',
    expectedTopics: ['éligibilité', 'documents', 'inspection', 'SOLAS']
  },
  {
    question: 'Exigences manning selon LY3 pour yacht 35m',
    expectedTopics: ['LY3', 'équipage', 'minimum', 'certificat']
  },
  {
    question: 'Différences entre REG Yacht Code et CYC Malta',
    expectedTopics: ['REG', 'CYC', 'comparaison', 'applicabilité']
  },
  {
    question: 'Inspections pour yacht construit en 1995 (30 ans)',
    expectedTopics: ['âge', 'inspection', 'renforcée', 'structure']
  }
]

// Simulation de réponses (pour test offline)
function simulateResponse(variant: PromptVariant, query: TestQuery): string {
  if (variant.name === 'V3_Standard') {
    return `
Pour répondre à votre question sur "${query.question}":

[Source: Malta CYC 2020, page 12, section 3.1] Les exigences générales s'appliquent.
[Source: LY3 Large Yacht Code, page 8, section 2.4] Les normes de sécurité sont définies.
[Source: Malta OGSR Part III, page 15, section 12.2] L'éligibilité est précisée.

Ces informations couvrent les aspects principaux de ${query.expectedTopics.slice(0, 2).join(' et ')}.

⚖️ **Disclaimer**: Consultez un avocat maritime qualifié.
    `
  } else {
    return `
Pour un ${query.question} (analyse complète):

**Cadre réglementaire principal:**
[Source: Malta CYC 2020, page 12, section 3.1] Définition des catégories de yachts commerciaux.
[Source: LY3 Large Yacht Code, page 8, section 2.4] Standards internationaux applicables.

**Exigences spécifiques:**
[Source: Malta OGSR Part III, page 15, section 12.2] Critères d'éligibilité propriétaire.
[Source: Malta Merchant Shipping Act 1973, page 23, section 34] Cadre légal national.

**Procédures et documents:**
[Source: Malta Ship Registry Procedures, page 6, section 4.1] Liste documents requis.
[Source: MLC 2006, page 44, section A2.3] Exigences manning si applicable.

Score auto-évalué: 35 points (6 sources × 5 + 2 codes × 5 + croisement) ✓

⚖️ **Disclaimer**: Consultez un avocat maritime qualifié.
    `
  }
}

// Analyse d'une réponse
function analyzeResponse(response: string, variant: string, query: string): ABTestResult {
  const issues: string[] = []

  // Extraction citations
  const citationPattern = /\[Source:\s*([^,\]]+)(?:,\s*page\s*(\d+))?(?:,\s*section\s*([^\]]+))?\]/gi
  const citations: Array<{ source: string; hasPage: boolean; hasSection: boolean }> = []
  let match: RegExpExecArray | null

  const regex = new RegExp(citationPattern.source, 'gi')
  while ((match = regex.exec(response)) !== null) {
    citations.push({
      source: match[1]?.trim() || '',
      hasPage: !!match[2],
      hasSection: !!match[3]
    })
  }

  const uniqueSources = [...new Set(citations.map(c => c.source))]
  const citationCount = uniqueSources.length
  const hasPageNumbers = citations.every(c => c.hasPage)

  // Vérifier priorité codes
  const codePriority = ['LY3', 'CYC', 'REG', 'SOLAS', 'MLC', 'MARPOL']
  const hasCodePriority = codePriority.some(code =>
    uniqueSources.some(s => s.toUpperCase().includes(code))
  )

  // Calcul score
  let score = 0
  score += citationCount * 5 // 5 points par source unique
  score += hasPageNumbers ? 10 : 0
  score += hasCodePriority ? 10 : 0

  // Pénalités
  if (/généralement|typiquement/i.test(response)) {
    score -= 5
    issues.push('Formulation vague détectée')
  }
  if (citationCount < 3) {
    score -= 10
    issues.push('Moins de 3 citations')
  }

  return {
    variantName: variant,
    query,
    citationCount,
    uniqueSources,
    hasPageNumbers,
    hasCodePriority,
    score,
    issues
  }
}

// Exécution A/B test
async function runABTest(): Promise<ABSummary> {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  T27 - A/B Testing Prompts')
  console.log('═══════════════════════════════════════════════════════════\n')

  const resultsA: ABTestResult[] = []
  const resultsB: ABTestResult[] = []

  for (const query of TEST_QUERIES) {
    console.log(`\n📋 Query: "${query.question}"`)
    console.log('─────────────────────────────────────────────────────────')

    // Test Variante A
    const responseA = simulateResponse(PROMPT_VARIANT_A, query)
    const resultA = analyzeResponse(responseA, PROMPT_VARIANT_A.name, query.question)
    resultsA.push(resultA)

    console.log(`  [A] ${PROMPT_VARIANT_A.name}: ${resultA.citationCount} citations, score=${resultA.score}`)
    if (resultA.issues.length > 0) {
      console.log(`      Issues: ${resultA.issues.join(', ')}`)
    }

    // Test Variante B
    const responseB = simulateResponse(PROMPT_VARIANT_B, query)
    const resultB = analyzeResponse(responseB, PROMPT_VARIANT_B.name, query.question)
    resultsB.push(resultB)

    console.log(`  [B] ${PROMPT_VARIANT_B.name}: ${resultB.citationCount} citations, score=${resultB.score}`)
    if (resultB.issues.length > 0) {
      console.log(`      Issues: ${resultB.issues.join(', ')}`)
    }
  }

  // Calcul moyennes
  const avgScoreA = resultsA.reduce((sum, r) => sum + r.score, 0) / resultsA.length
  const avgScoreB = resultsB.reduce((sum, r) => sum + r.score, 0) / resultsB.length
  const totalCitationsA = resultsA.reduce((sum, r) => sum + r.citationCount, 0)
  const totalCitationsB = resultsB.reduce((sum, r) => sum + r.citationCount, 0)

  const winner = avgScoreB > avgScoreA ? PROMPT_VARIANT_B.name : PROMPT_VARIANT_A.name
  const improvement = ((Math.max(avgScoreA, avgScoreB) - Math.min(avgScoreA, avgScoreB)) / Math.min(avgScoreA, avgScoreB) * 100).toFixed(1)

  const summary: ABSummary = {
    variantA: { name: PROMPT_VARIANT_A.name, avgScore: avgScoreA, totalCitations: totalCitationsA },
    variantB: { name: PROMPT_VARIANT_B.name, avgScore: avgScoreB, totalCitations: totalCitationsB },
    winner,
    recommendation: avgScoreB > avgScoreA
      ? `Adopter ${PROMPT_VARIANT_B.name} (+${improvement}% qualité citations)`
      : `Conserver ${PROMPT_VARIANT_A.name} (stable)`
  }

  // Affichage résumé
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  RÉSUMÉ A/B TEST')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  Variante A (${PROMPT_VARIANT_A.name}):`)
  console.log(`    - Score moyen: ${avgScoreA.toFixed(1)}`)
  console.log(`    - Total citations: ${totalCitationsA}`)
  console.log(`  Variante B (${PROMPT_VARIANT_B.name}):`)
  console.log(`    - Score moyen: ${avgScoreB.toFixed(1)}`)
  console.log(`    - Total citations: ${totalCitationsB}`)
  console.log(`\n  🏆 Gagnant: ${winner}`)
  console.log(`  📊 Recommandation: ${summary.recommendation}`)
  console.log('═══════════════════════════════════════════════════════════\n')

  return summary
}

// Export
export { PROMPT_VARIANT_A, PROMPT_VARIANT_B, runABTest, analyzeResponse }
export type { ABTestResult, ABSummary }

// Exécution
runABTest().catch(error => {
  console.error('❌ A/B Test failed:', error)
  process.exit(1)
})
