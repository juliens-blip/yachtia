#!/usr/bin/env tsx
/**
 * Test Answer Quality
 * 
 * Vérifie qu'une réponse générée respecte les critères de qualité:
 * 1. Sections titrées si question multi-parties
 * 2. Citations [Source: ...] présentes
 * 3. Pas de chunks bruts copiés-collés
 */

interface QualityCheckResult {
  valid: boolean
  issues: string[]
  details: {
    hasSections: boolean
    hasCitations: boolean
    hasRawChunks: boolean
    citationCount: number
    sectionCount: number
  }
}

function detectMultiPartQuestion(question: string): boolean {
  // Détecte si la question contient plusieurs parties numérotées
  const patterns = [
    /\d+[.)\/]\s+/g,           // 1. ou 1) ou 1/
    /[•\-*]\s+.+[?]/g,         // bullet points avec question
    /(?:et|ou)\s+.+\?/gi,      // "... et ... ?" ou "... ou ... ?"
  ]
  
  return patterns.some(pattern => {
    const matches = question.match(pattern)
    return matches && matches.length >= 2
  })
}

function extractSections(answer: string): string[] {
  // Extrait les titres de section (## ou ###)
  const sectionMatches = answer.match(/^#{2,3}\s+.+$/gm)
  return sectionMatches || []
}

function extractCitations(answer: string): string[] {
  // Extrait les citations [Source: ...]
  const citationMatches = answer.match(/\[Source:[^\]]+\]/gi)
  return citationMatches || []
}

function detectRawChunks(answer: string, chunks: string[]): boolean {
  // Vérifie si des chunks entiers (>100 chars) sont copiés-collés verbatim
  const MIN_CHUNK_SIZE = 100
  
  for (const chunk of chunks) {
    if (chunk.length < MIN_CHUNK_SIZE) continue
    
    // Nettoie le chunk pour comparaison
    const cleanChunk = chunk.replace(/\s+/g, ' ').trim()
    const cleanAnswer = answer.replace(/\s+/g, ' ').trim()
    
    // Cherche des correspondances exactes de >80 chars
    for (let i = 0; i < cleanChunk.length - 80; i++) {
      const snippet = cleanChunk.substring(i, i + 80)
      if (cleanAnswer.includes(snippet)) {
        console.log(`⚠️ Raw chunk detected: "${snippet.slice(0, 50)}..."`)
        return true
      }
    }
  }
  
  return false
}

export function checkAnswerQuality(
  question: string,
  answer: string,
  contextChunks: string[]
): QualityCheckResult {
  const issues: string[] = []
  
  // Check 1: Sections si question multi-parties
  const isMultiPart = detectMultiPartQuestion(question)
  const sections = extractSections(answer)
  const hasSections = sections.length > 0
  
  if (isMultiPart && !hasSections) {
    issues.push('Question multi-parties détectée mais pas de sections titrées (## ou ###)')
  }
  
  // Check 2: Citations présentes
  const citations = extractCitations(answer)
  const hasCitations = citations.length >= 3
  
  if (!hasCitations) {
    issues.push(`Nombre de citations insuffisant: ${citations.length}/3 minimum`)
  }
  
  // Check 3: Pas de chunks bruts
  const hasRawChunks = detectRawChunks(answer, contextChunks)
  
  if (hasRawChunks) {
    issues.push('Chunks bruts copiés-collés détectés (copier-coller verbatim interdit)')
  }
  
  return {
    valid: issues.length === 0,
    issues,
    details: {
      hasSections,
      hasCitations,
      hasRawChunks,
      citationCount: citations.length,
      sectionCount: sections.length
    }
  }
}

// Test CLI
if (require.main === module) {
  const testCases = [
    {
      name: 'Question simple avec citations',
      question: 'Quelles sont les obligations du capitaine?',
      answer: `Le capitaine a plusieurs obligations principales [Source: Code maritime, page 12]. Il doit assurer la sécurité du navire [Source: SOLAS Convention, page 45] et tenir un journal de bord [Source: Règlement EU 123, page 8].

⚖️ **Disclaimer**: Les informations fournies sont à titre informatif uniquement.`,
      chunks: ['Le capitaine doit...', 'Obligations maritimes...'],
      expected: { valid: true }
    },
    {
      name: 'Question multi-parties SANS sections',
      question: '1/ Obligations du capitaine 2/ Responsabilités du propriétaire 3/ Documents requis',
      answer: `Le capitaine doit tenir un journal [Source: Doc1, page 1]. Le propriétaire a des responsabilités [Source: Doc2, page 2]. Les documents incluent [Source: Doc3, page 3].`,
      chunks: [],
      expected: { valid: false, issue: 'pas de sections' }
    },
    {
      name: 'Question multi-parties AVEC sections',
      question: '1/ Obligations du capitaine 2/ Responsabilités du propriétaire',
      answer: `## 1. Obligations du Capitaine

Le capitaine doit tenir un journal [Source: Doc1, page 1].

## 2. Responsabilités du Propriétaire

Le propriétaire est responsable [Source: Doc2, page 2] et [Source: Doc3, page 3].`,
      chunks: [],
      expected: { valid: true }
    },
    {
      name: 'Chunks bruts copiés-collés',
      question: 'Que dit le code?',
      answer: `Article 123: Le propriétaire d'un navire de plaisance à usage personnel doit souscrire une assurance responsabilité civile couvrant les dommages corporels et matériels causés aux tiers conformément aux dispositions de la loi maritime en vigueur. [Source: Code, page 1]`,
      chunks: [
        'Article 123: Le propriétaire d\'un navire de plaisance à usage personnel doit souscrire une assurance responsabilité civile couvrant les dommages corporels et matériels causés aux tiers conformément aux dispositions de la loi maritime en vigueur.'
      ],
      expected: { valid: false, issue: 'raw chunks' }
    },
    {
      name: 'Pas assez de citations',
      question: 'Expliquez la réglementation',
      answer: `La réglementation exige [Source: Doc1, page 1] certaines obligations.

⚖️ **Disclaimer**: Informations à titre informatif.`,
      chunks: [],
      expected: { valid: false, issue: 'citations insuffisantes' }
    }
  ]

  console.log('🧪 Test Answer Quality\n' + '═'.repeat(80))

  let passed = 0
  let failed = 0

  for (const testCase of testCases) {
    const result = checkAnswerQuality(testCase.question, testCase.answer, testCase.chunks)
    
    const expectedValid = testCase.expected.valid
    const actualValid = result.valid
    const testPassed = expectedValid === actualValid

    if (testPassed) {
      console.log(`✅ ${testCase.name}`)
      passed++
    } else {
      console.log(`❌ ${testCase.name}`)
      console.log(`   Expected: ${expectedValid ? 'VALID' : 'INVALID'}`)
      console.log(`   Got: ${actualValid ? 'VALID' : 'INVALID'}`)
      console.log(`   Issues: ${result.issues.join(', ')}`)
      console.log(`   Details:`, result.details)
      failed++
    }
  }

  console.log('\n' + '═'.repeat(80))
  console.log(`📊 Results: ${passed}/${testCases.length} passed, ${failed} failed`)
  
  if (failed > 0) {
    process.exit(1)
  }
}
