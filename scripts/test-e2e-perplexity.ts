/**
 * Tests E2E Perplexity - Validation Fixes RAG
 * 
 * Test cases réels signalés par Perplexity:
 * 1. Malta 45m built 2000: eligibility + inspections âge
 * 2. Cayman REG 50m: obligations LY3 + REG Yacht Code
 */

import { retrieveRelevantChunks, formatChunksForContext } from '../lib/rag-pipeline'
import { generateAnswer } from '../lib/gemini'

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

interface TestCase {
  id: string
  name: string
  query: string
  expectedSources: string[] // Sources qui DOIVENT être présentes
  forbiddenFlags: string[] // Pavillons qui NE DOIVENT PAS apparaître
  minDifferentDocs: number // Minimum documents distincts requis
  expectedKeywords: string[] // Mots-clés qui DOIVENT apparaître dans réponse
}

const testCases: TestCase[] = [
  {
    id: 'MALTA-45M-2000',
    name: 'Malta 45m construit 2000 - Eligibility + Inspections âge',
    query: 'Quelles sont les conditions d\'éligibilité et les inspections requises pour un yacht de 45 mètres construit en 2000 sous pavillon Malta?',
    expectedSources: ['OGSR', 'Malta', 'Merchant Shipping', 'Registration'],
    forbiddenFlags: ['Cayman', 'Monaco', 'Marshall'],
    minDifferentDocs: 5,
    expectedKeywords: ['éligibilité', 'ownership', 'inspection', 'âge', '25', 'survey']
  },
  {
    id: 'CAYMAN-REG-50M',
    name: 'Cayman REG 50m - Obligations LY3 + REG Yacht Code',
    query: 'Quelles sont les obligations selon LY3 et le REG Yacht Code pour un yacht commercial de 50 mètres sous pavillon Cayman?',
    expectedSources: ['LY3', 'REG Yacht Code', 'Cayman', 'Large Commercial'],
    forbiddenFlags: ['Malta', 'Monaco', 'Marshall'],
    minDifferentDocs: 5,
    expectedKeywords: ['LY3', 'REG', 'commercial', '500', 'GT', 'MLC', 'SOLAS', 'manning']
  }
]

async function runTest(testCase: TestCase): Promise<boolean> {
  console.log(`\n${COLORS.bright}${COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`)
  console.log(`${COLORS.bright}Test: ${testCase.id} - ${testCase.name}${COLORS.reset}`)
  console.log(`${COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`)
  console.log(`\n📝 Question: ${testCase.query}\n`)

  try {
    const startTime = Date.now()
    
    // Step 1: Retrieve chunks
    console.log('🔍 Récupération chunks...')
    const chunks = await retrieveRelevantChunks(testCase.query, undefined, 15, 0.6, true)
    console.log(`   ✓ ${chunks.length} chunks récupérés\n`)

    // Step 2: Analyze with Gemini
    console.log('🤖 Analyse Gemini...')
    const context = formatChunksForContext(chunks)
    const result = await generateAnswer(testCase.query, context)
    const response = result.answer
    const elapsed = Date.now() - startTime
    console.log(`   ✓ Réponse générée en ${elapsed}ms\n`)

    // Validation 1: Nombre documents distincts
    const uniqueDocs = new Set(chunks.map(c => c.documentName))
    console.log(`📊 Documents distincts: ${uniqueDocs.size} (min requis: ${testCase.minDifferentDocs})`)
    uniqueDocs.forEach(doc => console.log(`   - ${doc}`))
    
    if (uniqueDocs.size < testCase.minDifferentDocs) {
      console.log(`${COLORS.red}   ❌ ÉCHEC: Seulement ${uniqueDocs.size} documents distincts (requis: ${testCase.minDifferentDocs})${COLORS.reset}`)
      return false
    }
    console.log(`${COLORS.green}   ✓ OK${COLORS.reset}\n`)

    // Validation 2: Sources attendues présentes
    console.log(`📚 Sources attendues:`)
    let missingExpected = 0
    for (const expectedSource of testCase.expectedSources) {
      const found = Array.from(uniqueDocs).some(doc => 
        doc.toLowerCase().includes(expectedSource.toLowerCase())
      )
      if (found) {
        console.log(`${COLORS.green}   ✓ ${expectedSource} trouvé${COLORS.reset}`)
      } else {
        console.log(`${COLORS.red}   ❌ ${expectedSource} MANQUANT${COLORS.reset}`)
        missingExpected++
      }
    }
    if (missingExpected > 0) {
      console.log(`${COLORS.red}   ❌ ÉCHEC: ${missingExpected} source(s) attendue(s) manquante(s)${COLORS.reset}`)
      return false
    }
    console.log(`${COLORS.green}   ✓ OK${COLORS.reset}\n`)

    // Validation 3: Pas de bruit (pavillons interdits)
    console.log(`🗑️ Vérification bruit (pavillons interdits):`)
    let noisyChunks = 0
    for (const forbiddenFlag of testCase.forbiddenFlags) {
      const found = Array.from(uniqueDocs).filter(doc => 
        doc.toLowerCase().includes(forbiddenFlag.toLowerCase())
      )
      if (found.length > 0) {
        console.log(`${COLORS.red}   ❌ Bruit détecté: pavillon ${forbiddenFlag} présent dans:${COLORS.reset}`)
        found.forEach(doc => console.log(`      - ${doc}`))
        noisyChunks += found.length
      }
    }
    if (noisyChunks === 0) {
      console.log(`${COLORS.green}   ✓ 0% bruit (aucun pavillon interdit)${COLORS.reset}\n`)
    } else {
      console.log(`${COLORS.yellow}   ⚠️ ${noisyChunks} doc(s) avec pavillon interdit (acceptable si <10%)${COLORS.reset}\n`)
    }

    // Validation 4: Mots-clés dans réponse
    console.log(`🔎 Mots-clés attendus dans réponse:`)
    let missingKeywords = 0
    for (const keyword of testCase.expectedKeywords) {
      const found = response.toLowerCase().includes(keyword.toLowerCase())
      if (found) {
        console.log(`${COLORS.green}   ✓ "${keyword}" trouvé${COLORS.reset}`)
      } else {
        console.log(`${COLORS.yellow}   ⚠️ "${keyword}" manquant${COLORS.reset}`)
        missingKeywords++
      }
    }
    const keywordRate = ((testCase.expectedKeywords.length - missingKeywords) / testCase.expectedKeywords.length) * 100
    if (keywordRate < 60) {
      console.log(`${COLORS.red}   ❌ ÉCHEC: Seulement ${keywordRate.toFixed(0)}% mots-clés présents (requis: >60%)${COLORS.reset}`)
      return false
    }
    console.log(`${COLORS.green}   ✓ ${keywordRate.toFixed(0)}% mots-clés présents${COLORS.reset}\n`)

    // Validation 5: Nombre citations
    const citationMatches = response.match(/\[Source:[^\]]+\]/g)
    const citationCount = citationMatches ? citationMatches.length : 0
    console.log(`📖 Citations: ${citationCount} (min requis: 3)`)
    if (citationCount < 3) {
      console.log(`${COLORS.red}   ❌ ÉCHEC: Seulement ${citationCount} citations (requis: 3+)${COLORS.reset}`)
      return false
    }
    console.log(`${COLORS.green}   ✓ OK${COLORS.reset}\n`)

    // Afficher réponse
    console.log(`${COLORS.bright}📄 Réponse Gemini:${COLORS.reset}`)
    console.log('━'.repeat(70))
    console.log(response.substring(0, 500) + (response.length > 500 ? '...\n[TRONQUÉ]' : ''))
    console.log('━'.repeat(70))

    console.log(`\n${COLORS.green}${COLORS.bright}✅ TEST RÉUSSI${COLORS.reset}\n`)
    return true

  } catch (error) {
    console.error(`${COLORS.red}❌ Erreur test: ${error}${COLORS.reset}`)
    return false
  }
}

async function main() {
  console.log(`${COLORS.bright}${COLORS.blue}
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║       🧪 TESTS E2E - VALIDATION FIXES PERPLEXITY               ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
${COLORS.reset}`)

  const results: boolean[] = []

  for (const testCase of testCases) {
    const success = await runTest(testCase)
    results.push(success)
  }

  // Rapport final
  console.log(`\n${COLORS.bright}${COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`)
  console.log(`${COLORS.bright}📊 RAPPORT FINAL${COLORS.reset}`)
  console.log(`${COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}\n`)

  const passed = results.filter(r => r).length
  const total = results.length
  const passRate = (passed / total) * 100

  testCases.forEach((tc, idx) => {
    const icon = results[idx] ? `${COLORS.green}✅` : `${COLORS.red}❌`
    console.log(`${icon} ${tc.id}: ${tc.name}${COLORS.reset}`)
  })

  console.log(`\n${COLORS.bright}Résultat: ${passed}/${total} tests réussis (${passRate.toFixed(0)}%)${COLORS.reset}`)

  if (passRate === 100) {
    console.log(`\n${COLORS.green}${COLORS.bright}🎉 TOUS LES TESTS RÉUSSIS - FIXES PERPLEXITY VALIDÉS${COLORS.reset}\n`)
    process.exit(0)
  } else {
    console.log(`\n${COLORS.red}${COLORS.bright}❌ ÉCHEC - Certains tests ont échoué${COLORS.reset}\n`)
    process.exit(1)
  }
}

main()
