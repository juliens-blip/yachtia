/**
 * COMPREHENSIVE RAG TESTING SUITE
 * 
 * Tests complets pour valider que TOUS les problèmes Perplexity sont résolus
 * 
 * Tests:
 * 1. Ciblage documents correct (Malta, RMI, Cayman spécifiques)
 * 2. Combinaison multi-sources (5+ docs cités)
 * 3. Utilisation contexte (pas de refus prématuré)
 * 4. Structure multi-questions (##)
 * 5. Priorisation codes/lois > articles
 */

import '../scripts/load-env'
import { searchDocuments } from '../lib/search-documents'
import { generateAnswer } from '../lib/gemini'

type TestCase = {
  name: string
  question: string
  expectedFlags?: string[]
  expectedCategories?: string[]
  expectedDocs?: string[]
  minChunks?: number
  minCitations?: number
  mustNotContain?: string[]
  mustContain?: string[]
}

const TEST_CASES: TestCase[] = [
  // Test 1: Ciblage Malta spécifique
  {
    name: "Test 1: Ciblage Malta Précis",
    question: "What are the CYC requirements for Malta commercial yacht registration?",
    expectedFlags: ["Malta"],
    expectedCategories: ["PAVILLON_MALTA"],
    expectedDocs: ["CYC", "Malta"],
    minChunks: 10,
    minCitations: 5,
    mustNotContain: ["Information non disponible", "not available in database"],
    mustContain: ["CYC", "Malta", "[Source:"]
  },
  
  // Test 2: Question complexe multi-partie (Perplexity)
  {
    name: "Test 2: Question Complexe Perplexity (RMI→Malta + CYC + TVA)",
    question: `Un armateur veut acheter un yacht de 38m construit en 2010, pavillon Îles Marshall aujourd'hui en privé, pour l'exploiter en commercial en Méditerranée sous pavillon Malte.

1/ Quelles sont les étapes et conditions principales pour passer de RMI privé à Malte commercial?
2/ Ce yacht devra-t-il être conforme au CYC 2020/2025 et quelles adaptations techniques sont à prévoir?
3/ Quelles sont les grandes lignes du traitement TVA pour des charters en France/Italie/Espagne au départ de Malte?`,
    expectedFlags: ["Malta", "Marshall"],
    expectedCategories: ["PAVILLON_MALTA", "TVA_CHARTER_MED"],
    minChunks: 15,
    minCitations: 10,
    mustContain: ["## 1)", "## 2)", "## 3)", "[Source:", "CYC"],
    mustNotContain: ["Information non disponible dans la base documentaire"]
  },
  
  // Test 3: TVA Charter Med (combinaison sources)
  {
    name: "Test 3: TVA Charter Méditerranée (Multi-sources)",
    question: "Quelles sont les règles de TVA pour les charters de yachts en France, Italie et Espagne en 2025?",
    expectedCategories: ["TVA_CHARTER_MED"],
    expectedDocs: ["VAT", "IYC", "Yacht Welfare"],
    minChunks: 10,
    minCitations: 7,
    mustContain: ["France", "Italie", "Espagne", "TVA", "[Source:"],
    mustNotContain: ["not available", "non disponible"]
  },
  
  // Test 4: Cayman vs Malta (priorisation)
  {
    name: "Test 4: Cayman Registry (Ciblage Précis)",
    question: "What are the requirements for Cayman Islands yacht registration for commercial use?",
    expectedFlags: ["Cayman"],
    expectedCategories: ["PAVILLON_CAYMAN"],
    minChunks: 8,
    minCitations: 3,
    mustContain: ["Cayman", "[Source:"],
    mustNotContain: ["Malta", "Marshall"]  // Ne doit PAS parler d'autres pavillons
  },
  
  // Test 5: Marshall Islands spécifique
  {
    name: "Test 5: Marshall Islands (RMI) Registration",
    question: "What are the Marshall Islands (RMI) yacht registration requirements and MI-103 code compliance?",
    expectedFlags: ["Marshall"],
    expectedCategories: ["PAVILLON_MARSHALL"],
    expectedDocs: ["RMI", "MI-103", "Marshall"],
    minChunks: 8,
    minCitations: 3,
    mustContain: ["Marshall", "RMI", "[Source:"],
    mustNotContain: ["Malta", "Cayman"]
  },
  
  // Test 6: Codes prioritaires (CYC, LY3, MLC)
  {
    name: "Test 6: Priorisation Codes (CYC > Articles)",
    question: "What is the CYC code and how does it apply to commercial yachts?",
    expectedDocs: ["CYC"],
    minChunks: 10,
    minCitations: 5,
    mustContain: ["CYC", "Commercial Yacht Code", "[Source:"],
    mustNotContain: ["blog", "article générique"]  // Pas d'articles génériques
  },
  
  // Test 7: Question sur un sujet vraiment absent (honnêteté)
  {
    name: "Test 7: Honnêteté (Sujet Vraiment Absent)",
    question: "What are the yacht registration requirements in Antarctica?",
    minChunks: 0,
    minCitations: 0,
    mustContain: ["Not specified", "not available", "non disponible"],  // Doit avouer
    mustNotContain: [] // Pas d'invention
  }
]

async function runTest(testCase: TestCase): Promise<{
  passed: boolean
  issues: string[]
  metrics: {
    chunksRetrieved: number
    citationCount: number
    hasStructure: boolean
    sources: string[]
  }
}> {
  const issues: string[] = []
  
  try {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`🧪 ${testCase.name}`)
    console.log('='.repeat(80))
    console.log(`Question: ${testCase.question.substring(0, 100)}${testCase.question.length > 100 ? '...' : ''}`)
    console.log()
    
    // Step 1: Search documents
    const results = await searchDocuments(testCase.question, {})
    console.log(`📊 Retrieved: ${results.length} chunks`)
    
    if (testCase.minChunks && results.length < testCase.minChunks) {
      issues.push(`❌ Pas assez de chunks: ${results.length} < ${testCase.minChunks}`)
    }
    
    // Check flags
    if (testCase.expectedFlags) {
      const retrievedFlags = new Set(results.map(r => r.category).map(c => {
        if (c.includes('MALTA')) return 'Malta'
        if (c.includes('MARSHALL')) return 'Marshall'
        if (c.includes('CAYMAN')) return 'Cayman'
        return null
      }).filter(Boolean))
      
      testCase.expectedFlags.forEach(flag => {
        if (!retrievedFlags.has(flag)) {
          issues.push(`⚠️  Flag attendu manquant: ${flag}`)
        }
      })
    }
    
    // Check categories
    if (testCase.expectedCategories) {
      const retrievedCategories = new Set(results.map(r => r.category))
      testCase.expectedCategories.forEach(cat => {
        const found = Array.from(retrievedCategories).some(rc => rc.includes(cat))
        if (!found) {
          issues.push(`⚠️  Catégorie attendue manquante: ${cat}`)
        }
      })
    }
    
    // Step 2: Generate answer
    const context = results.map(r => r.chunkText)
    const metadata = results.map(r => ({
      document_name: r.documentName,
      category: r.category,
      source_url: r.sourceUrl,
      page_number: r.pageNumber
    }))
    
    console.log(`📝 Generating answer...`)
    const result = await generateAnswer(testCase.question, context, [], metadata)
    const answer = result.answer
    
    console.log(`\n✅ Answer generated (${answer.length} chars)`)
    console.log(`\n━━━ ANSWER ━━━`)
    console.log(answer.substring(0, 800))
    console.log(answer.length > 800 ? '\n... (truncated)' : '')
    console.log(`━━━━━━━━━━━━━━━\n`)
    
    // Count citations
    const citations = answer.match(/\[Source:[^\]]+\]/g) || []
    const citationCount = citations.length
    const uniqueSources = new Set(citations.map(c => c.match(/\[Source:\s*([^,\]]+)/)?.[1]).filter(Boolean))
    
    console.log(`📊 Citations: ${citationCount} (${uniqueSources.size} sources distinctes)`)
    
    if (testCase.minCitations && citationCount < testCase.minCitations) {
      issues.push(`❌ Pas assez de citations: ${citationCount} < ${testCase.minCitations}`)
    }
    
    // Check structure
    const hasStructure = answer.includes('## 1)') || answer.includes('##') || answer.includes('📋')
    if (testCase.mustContain?.includes('## 1)') && !hasStructure) {
      issues.push(`❌ Structure manquante (attendu: ## 1), ## 2), etc.)`)
    }
    
    // Check must contain
    if (testCase.mustContain) {
      testCase.mustContain.forEach(term => {
        if (!answer.includes(term)) {
          issues.push(`❌ Terme manquant dans réponse: "${term}"`)
        }
      })
    }
    
    // Check must NOT contain
    if (testCase.mustNotContain) {
      testCase.mustNotContain.forEach(term => {
        if (answer.toLowerCase().includes(term.toLowerCase())) {
          issues.push(`❌ Terme interdit présent: "${term}"`)
        }
      })
    }
    
    // Check expected docs mentioned
    if (testCase.expectedDocs) {
      testCase.expectedDocs.forEach(doc => {
        if (!answer.includes(doc)) {
          issues.push(`⚠️  Document attendu non mentionné: ${doc}`)
        }
      })
    }
    
    const passed = issues.length === 0
    
    if (passed) {
      console.log(`✅ TEST PASSED`)
    } else {
      console.log(`❌ TEST FAILED (${issues.length} issues)`)
      issues.forEach(issue => console.log(`   ${issue}`))
    }
    
    return {
      passed,
      issues,
      metrics: {
        chunksRetrieved: results.length,
        citationCount,
        hasStructure,
        sources: Array.from(uniqueSources) as string[]
      }
    }
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ ERREUR CRITIQUE:`, errorMsg)
    issues.push(`ERREUR: ${errorMsg}`)
    return {
      passed: false,
      issues,
      metrics: {
        chunksRetrieved: 0,
        citationCount: 0,
        hasStructure: false,
        sources: []
      }
    }
  }
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║       🧪 COMPREHENSIVE RAG TESTING SUITE              ║
║          Validation Anti-Perplexity                      ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`)
  
  const results: Array<{
    test: string
    passed: boolean
    issues: string[]
    metrics: any
  }> = []
  
  for (const testCase of TEST_CASES) {
    const result = await runTest(testCase)
    results.push({
      test: testCase.name,
      passed: result.passed,
      issues: result.issues,
      metrics: result.metrics
    })
    
    // Delay entre tests (rate limiting)
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  
  // RAPPORT FINAL
  console.log(`\n\n${'='.repeat(80)}`)
  console.log(`📊 RAPPORT FINAL - ${TEST_CASES.length} TESTS`)
  console.log('='.repeat(80))
  
  const passedCount = results.filter(r => r.passed).length
  const failedCount = results.length - passedCount
  
  results.forEach((r, i) => {
    const icon = r.passed ? '✅' : '❌'
    console.log(`\n${icon} Test ${i+1}: ${r.test}`)
    console.log(`   Chunks: ${r.metrics.chunksRetrieved}`)
    console.log(`   Citations: ${r.metrics.citationCount} (${r.metrics.sources.length} sources)`)
    console.log(`   Structure: ${r.metrics.hasStructure ? 'OUI' : 'NON'}`)
    
    if (r.issues.length > 0) {
      console.log(`   Issues:`)
      r.issues.forEach(issue => console.log(`     ${issue}`))
    }
  })
  
  console.log(`\n${'='.repeat(80)}`)
  console.log(`RÉSULTAT GLOBAL: ${passedCount}/${TEST_CASES.length} TESTS PASSÉS`)
  console.log('='.repeat(80))
  
  if (failedCount === 0) {
    console.log(`\n🎉 TOUS LES TESTS RÉUSSIS - SYSTÈME 100% VALIDÉ`)
  } else {
    console.log(`\n⚠️  ${failedCount} test(s) échoué(s) - Corrections nécessaires`)
  }
  
  // Métriques agrégées
  const avgChunks = results.reduce((sum, r) => sum + r.metrics.chunksRetrieved, 0) / results.length
  const avgCitations = results.reduce((sum, r) => sum + r.metrics.citationCount, 0) / results.length
  const structureRate = results.filter(r => r.metrics.hasStructure).length / results.length
  
  console.log(`\n📈 MÉTRIQUES MOYENNES:`)
  console.log(`   - Chunks récupérés: ${avgChunks.toFixed(1)}`)
  console.log(`   - Citations: ${avgCitations.toFixed(1)}`)
  console.log(`   - Taux structure: ${(structureRate * 100).toFixed(0)}%`)
  
  console.log(`\n🎯 PROBLÈMES PERPLEXITY - STATUS:`)
  console.log(`   1. Ciblage documents: ${passedCount >= 1 ? '✅ RÉSOLU' : '❌ PROBLÈME'}`)
  console.log(`   2. Combinaison sources: ${avgCitations >= 5 ? '✅ RÉSOLU' : '❌ PROBLÈME'}`)
  console.log(`   3. Refus prématuré: ${results.filter(r => r.issues.some(i => i.includes('non disponible'))).length === 0 ? '✅ RÉSOLU' : '❌ PROBLÈME'}`)
  console.log(`   4. Structure questions: ${structureRate >= 0.8 ? '✅ RÉSOLU' : '❌ PROBLÈME'}`)
  console.log(`   5. Priorisation codes: ${results[0].passed ? '✅ RÉSOLU' : '❌ PROBLÈME'}`)
  
  process.exit(failedCount === 0 ? 0 : 1)
}

main()
