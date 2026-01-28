#!/usr/bin/env tsx
/**
 * Tests E2E pour le pipeline RAG V3
 * Vérifie:
 * 1. Context extraction pour yachts <50m (sans SOLAS)
 * 2. Context extraction pour yachts >=50m (avec SOLAS)
 * 3. Filtrage docs par pavillon
 * 4. Multi-pass vs single-pass
 * 5. Doc-filter filtrage par seuil
 */

import { extractYachtContext, buildContextPrompt } from '../lib/context-extractor'
import { isComplexQuery, multiPassRetrieval } from '../lib/multi-pass-retrieval'
import { filterByDocType, filterByFlag } from '../lib/doc-filter'
import { retrieveRelevantChunks } from '../lib/rag-pipeline'
import type { RelevantChunk } from '../lib/rag-pipeline'
import type { DocFilterChunk } from '../lib/doc-filter'

type TestResult = {
  name: string
  passed: boolean
  details: string
  error?: string
}

const results: TestResult[] = []

function logTest(name: string, passed: boolean, details: string, error?: string) {
  results.push({ name, passed, details, error })
  const icon = passed ? '✅' : '❌'
  console.log(`\n${icon} ${name}`)
  console.log(`   ${details}`)
  if (error) console.log(`   Error: ${error}`)
}

// ============================================================
// TEST 1: Query simple (yacht <50m) - pas de SOLAS
// ============================================================
async function test1_simpleQueryNoSOLAS() {
  try {
    const query = "Quelles sont les obligations pour un yacht de 35m sous pavillon Malta?"
    const context = extractYachtContext(query)
    const prompt = buildContextPrompt(context)

    const hasSize = context.size === 35
    const noSOLAS = !prompt.includes('SOLAS') && !prompt.includes('MLC')
    const hasMalta = context.flag === 'Malta'

    const passed = hasSize && noSOLAS && hasMalta

    logTest(
      'Test 1: Query simple yacht <50m',
      passed,
      `Size: ${context.size}m, Flag: ${context.flag}, No SOLAS: ${noSOLAS}`,
      passed ? undefined : 'Context extraction failed'
    )
  } catch (err) {
    logTest('Test 1: Query simple yacht <50m', false, 'Exception', String(err))
  }
}

// ============================================================
// TEST 2: Query complexe (yacht >=50m) - avec SOLAS
// ============================================================
async function test2_complexQueryWithSOLAS() {
  try {
    const query = "Yacht de 65m construit en 2020, pavillon Cayman, SOLAS et MLC applicables?"
    const context = extractYachtContext(query)
    const prompt = buildContextPrompt(context)

    const hasSize = context.size === 65
    const hasSOLAS = prompt.includes('SOLAS') || prompt.includes('MLC')
    const hasCayman = context.flag === 'Cayman'
    const hasAge = context.age !== undefined && context.buildYear === 2020

    const passed = hasSize && hasSOLAS && hasCayman && hasAge

    logTest(
      'Test 2: Query complexe yacht >=50m',
      passed,
      `Size: ${context.size}m, SOLAS: ${hasSOLAS}, Flag: ${context.flag}, Year: ${context.buildYear}`,
      passed ? undefined : 'SOLAS not detected for yacht >=50m'
    )
  } catch (err) {
    logTest('Test 2: Query complexe yacht >=50m', false, 'Exception', String(err))
  }
}

// ============================================================
// TEST 3: Query avec pavillon - filtrage docs
// ============================================================
async function test3_flagFiltering() {
  try {
    const query = "Immatriculation yacht sous pavillon UK"
    const context = extractYachtContext(query)

    const mockChunks: DocFilterChunk[] = [
      { score: 0.85, documentName: 'REG_Yacht_Code_UK.pdf', category: 'PAVILLON_UK' },
      { score: 0.82, documentName: 'Malta_Registry_Guide.pdf', category: 'PAVILLON_MALTA' },
      { score: 0.78, documentName: 'UK_Registration_Process.pdf', category: 'PAVILLON_UK' }
    ]

    const result = filterByFlag(mockChunks, context.flag, 'STRICT')

    const ukCount = result.filtered.filter(c => 
      c.documentName?.includes('UK') || c.category?.includes('UK')
    ).length

    const maltaEliminated = result.eliminated.some(e => 
      e.chunk.documentName?.includes('Malta')
    )

    const passed = ukCount === 2 && maltaEliminated && result.filtered.length === 2

    logTest(
      'Test 3: Filtrage docs par pavillon',
      passed,
      `Flag: ${context.flag}, UK docs: ${ukCount}/2, Malta eliminated: ${maltaEliminated}`,
      passed ? undefined : 'Flag filtering not working correctly'
    )
  } catch (err) {
    logTest('Test 3: Filtrage docs par pavillon', false, 'Exception', String(err))
  }
}

// ============================================================
// TEST 4: Multi-pass vs single-pass
// ============================================================
async function test4_multiPassDetection() {
  try {
    const simpleQuery = "Quelles sont les obligations du capitaine?"
    const complexQuery = "Yacht de 75m, pavillon Malta, LY3 et SOLAS applicables, quelles obligations pour le capitaine concernant la sécurité et la conformité MLC?"

    const isSimple = isComplexQuery(simpleQuery)
    const isComplex = isComplexQuery(complexQuery)

    const simpleWordCount = simpleQuery.trim().split(/\s+/).length
    const complexWordCount = complexQuery.trim().split(/\s+/).length

    const passed = !isSimple && isComplex

    logTest(
      'Test 4: Multi-pass detection',
      passed,
      `Simple (${simpleWordCount} words): ${!isSimple}, Complex (${complexWordCount} words): ${isComplex}`,
      passed ? undefined : 'Multi-pass detection not working'
    )
  } catch (err) {
    logTest('Test 4: Multi-pass detection', false, 'Exception', String(err))
  }
}

// ============================================================
// TEST 5: Doc-filter filtrage par seuil
// ============================================================
async function test5_docFilterThreshold() {
  try {
    const mockChunks: DocFilterChunk[] = [
      { score: 0.85, documentName: 'LY3_Code.pdf', category: 'MARITIME_CODE' },
      { score: 0.65, documentName: 'MCA_Guidance.pdf', category: 'MARITIME_CODE' },
      { score: 0.88, documentName: 'SOLAS_Article.pdf', category: 'ARTICLE' },
      { score: 0.75, documentName: 'Maritime_Blog.pdf', category: 'ARTICLE' },
      { score: 0.50, documentName: 'Generic_Article.pdf', category: 'ARTICLE' }
    ]

    const result = filterByDocType(mockChunks, 'STRICT')

    // CODE min score: 0.7
    // ARTICLE min score: 0.8
    const codeFiltered = result.filtered.filter(c => c.category === 'MARITIME_CODE')
    const articleFiltered = result.filtered.filter(c => c.category === 'ARTICLE')
    const codeEliminatedCount = result.eliminated.filter(e => 
      e.chunk.category === 'MARITIME_CODE'
    ).length
    const articleEliminatedCount = result.eliminated.filter(e => 
      e.chunk.category === 'ARTICLE'
    ).length

    // Expected with new thresholds: CODE min=0.45, ARTICLE min=0.6
    // CODE 0.85 kept, 0.65 kept (> 0.45)
    // ARTICLE 0.88 kept, 0.75 kept (> 0.6), 0.50 eliminated (< 0.6)
    const passed =
      codeFiltered.length === 2 &&
      codeEliminatedCount === 0 &&
      articleFiltered.length === 2 &&
      articleEliminatedCount === 1 &&
      result.filtered.length === 4

    logTest(
      'Test 5: Doc-filter seuils',
      passed,
      `CODE kept: ${codeFiltered.length}/1, eliminated: ${codeEliminatedCount}/1 | ARTICLE kept: ${articleFiltered.length}/1, eliminated: ${articleEliminatedCount}/2`,
      passed ? undefined : 'Doc-filter thresholds not working correctly'
    )
  } catch (err) {
    logTest('Test 5: Doc-filter seuils', false, 'Exception', String(err))
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🧪 Tests E2E - Pipeline RAG V3')
  console.log('=' .repeat(60))

  await test1_simpleQueryNoSOLAS()
  await test2_complexQueryWithSOLAS()
  await test3_flagFiltering()
  await test4_multiPassDetection()
  await test5_docFilterThreshold()

  console.log('\n' + '='.repeat(60))
  console.log('📊 RÉSULTATS FINAUX')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.passed).length
  const total = results.length

  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌'
    console.log(`${icon} ${r.name}`)
  })

  console.log('\n' + '='.repeat(60))
  if (passed === total) {
    console.log(`🎉 TOUS LES TESTS RÉUSSIS: ${passed}/${total}`)
    process.exit(0)
  } else {
    console.log(`⚠️  TESTS ÉCHOUÉS: ${total - passed}/${total}`)
    console.log('\nDétails des échecs:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n❌ ${r.name}`)
      console.log(`   ${r.details}`)
      if (r.error) console.log(`   Error: ${r.error}`)
    })
    process.exit(1)
  }
}

main()
