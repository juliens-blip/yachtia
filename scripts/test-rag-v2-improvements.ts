/**
 * Tests E2E - RAG V2 Improvements
 * 
 * Valide les améliorations apportées:
 * 1. Ranking priorité codes/lois
 * 2. Diversité sources (15 chunks, 8+ docs)
 * 3. Filtrage pavillon
 * 4. Contexte yacht (taille, âge) pris en compte
 * 5. Anti-faux négatifs (listing docs)
 * 6. Citations codes prioritaires
 */

import { retrieveRelevantChunks } from '../lib/rag-pipeline'
import { generateAnswer } from '../lib/gemini'
import { formatChunksForContext } from '../lib/rag-pipeline'

type TestResult = {
  passed: boolean
  message: string
  metrics?: Record<string, number | string>
}

async function testCodesPriority(): Promise<TestResult> {
  console.log('\n🧪 TEST 1: Codes cités prioritaires')
  
  const query = "Selon LY3 et le REG Yacht Code, quelles sont les obligations de manning pour un yacht de 50m commercial ?"
  const chunks = await retrieveRelevantChunks(query, undefined, 15)
  
  const ly3Count = chunks.filter(c => /ly3/i.test(c.documentName)).length
  const regCount = chunks.filter(c => /reg.*yacht.*code/i.test(c.documentName)).length
  const uniqueDocs = new Set(chunks.map(c => c.documentId)).size
  
  const passed = ly3Count >= 2 && regCount >= 2 && uniqueDocs >= 8
  
  return {
    passed,
    message: passed 
      ? `✅ Codes prioritaires OK: LY3=${ly3Count}, REG=${regCount}, ${uniqueDocs} docs uniques`
      : `❌ FAIL: LY3=${ly3Count}/3+, REG=${regCount}/3+, docs=${uniqueDocs}/8+`,
    metrics: { ly3Count, regCount, uniqueDocs }
  }
}

async function testSourceDiversity(): Promise<TestResult> {
  console.log('\n🧪 TEST 2: Diversité sources')
  
  const query = "Quelles sont les conditions d'éligibilité pour immatriculer un yacht commercial à Malta ?"
  const chunks = await retrieveRelevantChunks(query, undefined, 15)
  
  const uniqueDocs = new Set(chunks.map(c => c.documentId)).size
  const docCounts = chunks.reduce((acc, c) => {
    acc[c.documentId] = (acc[c.documentId] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const docsWithManyChunks = Object.values(docCounts).filter(count => count > 2).length
  
  const passed = uniqueDocs >= 8 && docsWithManyChunks === 0
  
  return {
    passed,
    message: passed
      ? `✅ Diversité OK: ${uniqueDocs} docs uniques, ${docsWithManyChunks} docs avec >2 chunks`
      : `❌ FAIL: ${uniqueDocs}/8+ docs uniques, ${docsWithManyChunks}/0 docs surreprésentés`,
    metrics: { uniqueDocs, docsWithManyChunks }
  }
}

async function testFlagFiltering(): Promise<TestResult> {
  console.log('\n🧪 TEST 3: Filtrage pavillon')
  
  const query = "Malta yacht registration process for 45m vessel built in 2000"
  const chunks = await retrieveRelevantChunks(query, undefined, 15)
  
  const maltaDocs = chunks.filter(c => 
    /malta/i.test(c.documentName + ' ' + c.category)
  ).length
  
  const otherFlags = chunks.filter(c =>
    /(cayman|monaco|panama|marshall|bahamas)/i.test(c.documentName + ' ' + c.category)
  ).length
  
  const passed = maltaDocs >= 10 && otherFlags === 0
  
  return {
    passed,
    message: passed
      ? `✅ Filtrage pavillon OK: ${maltaDocs}/15 Malta docs, ${otherFlags} autres pavillons`
      : `❌ FAIL: ${maltaDocs}/10+ Malta docs, ${otherFlags}/0 autres pavillons`,
    metrics: { maltaDocs, otherFlags }
  }
}

async function testContextAwareness(): Promise<TestResult> {
  console.log('\n🧪 TEST 4: Contexte yacht (taille, âge)')
  
  const query = "Quelles sont les obligations pour un yacht de 50m construit en 2000 à Malta ?"
  const chunks = await retrieveRelevantChunks(query, undefined, 15)
  const context = formatChunksForContext(chunks)
  const answer = await generateAnswer(query, context)
  
  const mentionsSolas = /solas|500\s*gt|>500/i.test(answer.answer)
  const mentionsAge = /inspection|âge|age|20\s*ans|25\s*ans/i.test(answer.answer)
  const mentionsMalta = /malta/i.test(answer.answer)
  
  const passed = mentionsSolas && mentionsAge && mentionsMalta
  
  return {
    passed,
    message: passed
      ? `✅ Contexte OK: SOLAS=${mentionsSolas}, âge=${mentionsAge}, Malta=${mentionsMalta}`
      : `❌ FAIL: SOLAS=${mentionsSolas}, âge=${mentionsAge}, Malta=${mentionsMalta}`,
    metrics: { 
      solas: mentionsSolas ? 1 : 0,
      age: mentionsAge ? 1 : 0,
      malta: mentionsMalta ? 1 : 0
    }
  }
}

async function testAntiFalseNegatives(): Promise<TestResult> {
  console.log('\n🧪 TEST 5: Anti-faux négatifs (listing docs)')
  
  // Question difficile pour forcer potentiel "info manquante"
  const query = "Quelle est la procédure exacte pour obtenir un waiver d'inspection à Malta pour yacht de 30 ans ?"
  const chunks = await retrieveRelevantChunks(query, undefined, 15)
  const context = formatChunksForContext(chunks)
  const answer = await generateAnswer(query, context)
  
  const hasInfoMissing = /non trouvé|pas d'information|information.*manquante/i.test(answer.answer)
  
  if (hasInfoMissing) {
    const listsDocs = /j'ai analysé|documents suivants|chunks|vérifié.*documents/i.test(answer.answer)
    const hasJustification = answer.answer.length > 300 // réponse détaillée
    
    const passed = listsDocs && hasJustification
    
    return {
      passed,
      message: passed
        ? `✅ Anti-faux négatifs OK: Liste docs=${listsDocs}, justification=${hasJustification}`
        : `❌ FAIL: Déclare "info manquante" sans listing=${listsDocs} ou justification=${hasJustification}`,
      metrics: { listsDocs: listsDocs ? 1 : 0, justification: hasJustification ? 1 : 0 }
    }
  } else {
    return {
      passed: true,
      message: `✅ Info trouvée (pas de déclaration "manquante")`,
      metrics: { infoFound: 1 }
    }
  }
}

async function testCodesCitation(): Promise<TestResult> {
  console.log('\n🧪 TEST 6: Citations codes prioritaires')

  const query = "Selon LY3 et le REG Yacht Code, quelles sont les obligations de manning pour un 50m commercial ?"
  const chunks = await retrieveRelevantChunks(query, undefined, 15)
  const context = formatChunksForContext(chunks)
  const answer = await generateAnswer(query, context)

  const citesLY3 = /\[Source:.*LY3/i.test(answer.answer)
  const citesREG = /\[Source:.*REG.*Yacht.*Code/i.test(answer.answer)
  const citationCount = (answer.answer.match(/\[Source:/gi) || []).length

  const passed = citesLY3 && citesREG && citationCount >= 3

  return {
    passed,
    message: passed
      ? `✅ Citations codes OK: LY3=${citesLY3}, REG=${citesREG}, total=${citationCount} citations`
      : `❌ FAIL: LY3=${citesLY3}, REG=${citesREG}, citations=${citationCount}/3+`,
    metrics: { citesLY3: citesLY3 ? 1 : 0, citesREG: citesREG ? 1 : 0, citationCount }
  }
}

async function testYachtAgeContext(): Promise<TestResult> {
  console.log('\n🧪 TEST 7: Âge yacht pris en compte')

  const query = "Immatriculation Malta yacht 45m construit 2000"
  const chunks = await retrieveRelevantChunks(query, undefined, 15)
  const context = formatChunksForContext(chunks)
  const answer = await generateAnswer(query, context)

  // Vérifier que l'âge est mentionné (24-26 ans selon 2024-2026)
  const mentionsAge = /2[456]\s*ans|>?\s*20\s*ans|plus de 20/i.test(answer.answer)
  const mentionsInspection = /inspection|survey|contrôle|vérification/i.test(answer.answer)

  const passed = mentionsAge && mentionsInspection

  return {
    passed,
    message: passed
      ? `✅ Âge yacht OK: mention âge=${mentionsAge}, inspection=${mentionsInspection}`
      : `❌ FAIL: mention âge=${mentionsAge}, inspection=${mentionsInspection}`,
    metrics: { mentionsAge: mentionsAge ? 1 : 0, mentionsInspection: mentionsInspection ? 1 : 0 }
  }
}

async function testYachtSizeInference(): Promise<TestResult> {
  console.log('\n🧪 TEST 8: Taille yacht → SOLAS/MLC')

  const query = "Obligations manning yacht commercial 52m Cayman"
  const chunks = await retrieveRelevantChunks(query, undefined, 15)
  const context = formatChunksForContext(chunks)
  const answer = await generateAnswer(query, context)

  // Vérifier que SOLAS/MLC est mentionné pour yacht >50m
  const mentionsSolas = /solas/i.test(answer.answer)
  const mentionsMlc = /mlc|maritime labour/i.test(answer.answer)
  const mentionsSize = /50\s*m|>?\s*500\s*gt|large yacht/i.test(answer.answer)

  const passed = (mentionsSolas || mentionsMlc) && mentionsSize

  return {
    passed,
    message: passed
      ? `✅ Taille→SOLAS OK: SOLAS=${mentionsSolas}, MLC=${mentionsMlc}, size=${mentionsSize}`
      : `❌ FAIL: SOLAS=${mentionsSolas}, MLC=${mentionsMlc}, size=${mentionsSize}`,
    metrics: {
      mentionsSolas: mentionsSolas ? 1 : 0,
      mentionsMlc: mentionsMlc ? 1 : 0,
      mentionsSize: mentionsSize ? 1 : 0
    }
  }
}

async function testStrictFlagFiltering(): Promise<TestResult> {
  console.log('\n🧪 TEST 9: Filtrage strict pavillon')

  const query = "Conditions registration Malta yacht 40m"
  const chunks = await retrieveRelevantChunks(query, undefined, 15)

  const nonMaltaDocs = chunks.filter(c => {
    const haystack = (c.documentName + ' ' + c.category).toLowerCase()
    const hasMalta = /malta/.test(haystack)
    const hasOtherFlag = /(cayman|monaco|panama|marshall|bahamas|jersey|gibraltar|isle of man)/i.test(haystack)
    return !hasMalta && hasOtherFlag
  })

  const passed = nonMaltaDocs.length === 0

  return {
    passed,
    message: passed
      ? `✅ Filtrage strict pavillon OK: ${nonMaltaDocs.length} docs hors Malta`
      : `❌ FAIL: ${nonMaltaDocs.length} docs hors Malta détectés (${nonMaltaDocs.map(c => c.documentName).slice(0, 3).join(', ')})`,
    metrics: { nonMaltaDocs: nonMaltaDocs.length }
  }
}

async function testMultiPassRetrieval(): Promise<TestResult> {
  console.log('\n🧪 TEST 10: Multi-pass questions complexes')

  const query = "Selon LY3 et REG, obligations manning et safety 50m"
  const chunks = await retrieveRelevantChunks(query, undefined, 15)

  const ly3Chunks = chunks.filter(c => /ly3/i.test(c.documentName))
  const regChunks = chunks.filter(c => /reg.*yacht|red ensign/i.test(c.documentName))

  // Pour une question citant 2 codes, on attend au moins 2 chunks de chaque
  const passed = ly3Chunks.length >= 2 && regChunks.length >= 2

  return {
    passed,
    message: passed
      ? `✅ Multi-pass OK: LY3=${ly3Chunks.length} chunks, REG=${regChunks.length} chunks`
      : `❌ FAIL: LY3=${ly3Chunks.length}/2+, REG=${regChunks.length}/2+`,
    metrics: { ly3Chunks: ly3Chunks.length, regChunks: regChunks.length }
  }
}

async function runAllTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 TESTS E2E - RAG V2 IMPROVEMENTS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  const tests = [
    { name: 'Codes prioritaires', fn: testCodesPriority },
    { name: 'Diversité sources', fn: testSourceDiversity },
    { name: 'Filtrage pavillon', fn: testFlagFiltering },
    { name: 'Contexte yacht', fn: testContextAwareness },
    { name: 'Anti-faux négatifs', fn: testAntiFalseNegatives },
    { name: 'Citations codes', fn: testCodesCitation },
    { name: 'Âge yacht', fn: testYachtAgeContext },
    { name: 'Taille → SOLAS', fn: testYachtSizeInference },
    { name: 'Filtrage strict pavillon', fn: testStrictFlagFiltering },
    { name: 'Multi-pass retrieval', fn: testMultiPassRetrieval }
  ]
  
  const results: TestResult[] = []
  let passedCount = 0
  
  for (const test of tests) {
    try {
      const result = await test.fn()
      results.push(result)
      if (result.passed) passedCount++
      console.log(result.message)
    } catch (error) {
      console.error(`❌ ERROR in ${test.name}:`, error)
      results.push({
        passed: false,
        message: `❌ ERROR: ${error instanceof Error ? error.message : String(error)}`
      })
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 RÉSULTATS: ${passedCount}/${tests.length} tests réussis (${Math.round(passedCount/tests.length*100)}%)`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  if (passedCount === tests.length) {
    console.log('🎉 TOUS LES TESTS RÉUSSIS (10/10) - RAG V3 VALIDÉ')
  } else {
    console.log(`⚠️ ${tests.length - passedCount} tests échoués - Ajustements nécessaires`)
  }
  
  return { results, passedCount, totalTests: tests.length }
}

// Run if executed directly
if (require.main === module) {
  runAllTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { runAllTests }
