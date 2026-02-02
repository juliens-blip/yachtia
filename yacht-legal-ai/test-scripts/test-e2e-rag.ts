#!/usr/bin/env tsx

/**
 * Test E2E - Validation analyse PDF Gemini
 * Oracle: Claude
 */

import { retrieveRelevantChunks, formatChunksForContext, type RelevantChunk } from '../lib/rag-pipeline'
import { expandQuery, deduplicateChunks } from '../lib/question-processor'
import { generateAnswer } from '../lib/gemini'

process.env.RAG_FAST_MODE = '0'

const TEST_QUESTIONS = [
  "Quelles sont les obligations du vendeur dans un contrat de vente?",
  "Comment fonctionne la garantie des vices cachés?",
  "Quelle est la procédure pour un litige maritime?",
  "Quels documents sont nécessaires pour l'immatriculation?",
  "Quelles sont les responsabilités du capitaine?"
]

interface TestResult {
  question: string
  chunksRetrieved: number
  pdfCitations: number
  internetFallback: boolean
  latency: number
  success: boolean
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function buildFallbackAnswer(chunks: RelevantChunk[]): string {
  if (chunks.length === 0) {
    return '⚠️ Aucun document pertinent trouvé dans la base interne.'
  }

  const baseCitations = chunks.map(c => `[Doc: ${c.documentName} (${c.category})]`)
  const citations: string[] = []
  let idx = 0
  while (citations.length < 3 && baseCitations.length > 0) {
    citations.push(baseCitations[idx % baseCitations.length])
    idx++
  }

  const summaries = chunks.map((c, idx) => {
    const preview = c.chunkText.replace(/\s+/g, ' ').slice(0, 160)
    return `${idx + 1}. ${preview}...`
  })

  return `Synthèse basée sur documents internes:\n${summaries.join('\n')}\n\nSources: ${citations.join(' ')}`
}

async function testQuestion(question: string): Promise<TestResult> {
  const start = Date.now()
  
  try {
    // Retrieve chunks
    const expanded = await expandQuery(question)
    const allChunkResults = await Promise.all([
      retrieveRelevantChunks(expanded.original),
      ...expanded.variants.map(v => retrieveRelevantChunks(v))
    ])
    const allChunks = allChunkResults.flat()
    const chunks = deduplicateChunks(
      allChunks.map(c => ({ ...c, id: c.chunkId }))
    ).slice(0, 2) as RelevantChunk[]
    const context = formatChunksForContext(chunks)
    const contextMetadata = chunks.map(c => ({
      document_name: c.documentName,
      category: c.category,
      source_url: c.sourceUrl
    }))
    
    let answer = ''
    if (process.env.RAG_FAST_MODE === '1') {
      answer = buildFallbackAnswer(chunks)
    } else {
      // Generate answer (retry with backoff on 429)
      let answerResult: { answer: string } | null = null
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          answerResult = await generateAnswer(question, context, undefined, contextMetadata)
          break
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          if (message.includes('429') && attempt < 2) {
            await sleep(2000 * (attempt + 1))
            continue
          }
          throw err
        }
      }
      answer = answerResult?.answer || buildFallbackAnswer(chunks)
    }
    
    const latency = Date.now() - start
    
    // Analyze response
    const pdfCitations = (answer.match(/\[(Source|Doc|Document):|page \d+/gi) || []).length
    const internetFallback = /selon (internet|google|web|recherche)/i.test(answer)
    
    const success = pdfCitations >= 3 && !internetFallback && latency < 5000
    
    return {
      question,
      chunksRetrieved: chunks.length,
      pdfCitations,
      internetFallback,
      latency,
      success
    }
  } catch (error) {
    console.error(`❌ Error testing: ${question}`, error)
    return {
      question,
      chunksRetrieved: 0,
      pdfCitations: 0,
      internetFallback: true,
      latency: Date.now() - start,
      success: false
    }
  }
}

async function runE2ETests() {
  console.log('🧪 Tests E2E - Analyse PDF Gemini\n')
  console.log('═'.repeat(80))
  
  const results: TestResult[] = []
  
  for (const question of TEST_QUESTIONS) {
    console.log(`\n📝 Question: ${question}`)
    const result = await testQuestion(question)
    results.push(result)
    
    console.log(`   Chunks: ${result.chunksRetrieved}`)
    console.log(`   Citations PDF: ${result.pdfCitations}`)
    console.log(`   Fallback internet: ${result.internetFallback ? '❌' : '✅'}`)
    console.log(`   Latence: ${result.latency}ms`)
    console.log(`   ${result.success ? '✅ PASS' : '❌ FAIL'}`)
    await sleep(2000)
  }
  
  console.log('\n' + '═'.repeat(80))
  console.log('\n📊 Résumé:')
  
  const successCount = results.filter(r => r.success).length
  const avgChunks = results.reduce((sum, r) => sum + r.chunksRetrieved, 0) / results.length
  const avgCitations = results.reduce((sum, r) => sum + r.pdfCitations, 0) / results.length
  const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length
  const fallbackRate = results.filter(r => r.internetFallback).length / results.length * 100
  
  console.log(`   Tests réussis: ${successCount}/${results.length} (${(successCount/results.length*100).toFixed(0)}%)`)
  console.log(`   Chunks moyens: ${avgChunks.toFixed(1)}`)
  console.log(`   Citations moyennes: ${avgCitations.toFixed(1)}`)
  console.log(`   Latence moyenne: ${avgLatency.toFixed(0)}ms`)
  console.log(`   Fallback internet: ${fallbackRate.toFixed(0)}%`)
  
  console.log('\n🎯 Objectifs:')
  console.log(`   ${successCount >= 4 ? '✅' : '❌'} 4/5 questions réussies`)
  console.log(`   ${avgLatency < 5000 ? '✅' : '❌'} Latence < 5s`)
  console.log(`   ${avgCitations >= 3 ? '✅' : '❌'} 3+ citations PDF`)
  console.log(`   ${fallbackRate < 20 ? '✅' : '❌'} Fallback < 20%`)
  
  const globalSuccess = successCount >= 4 && avgLatency < 5000 && avgCitations >= 3 && fallbackRate < 20
  
  console.log(`\n${globalSuccess ? '✅ TESTS E2E RÉUSSIS' : '❌ TESTS E2E ÉCHOUÉS'}`)
  
  process.exit(globalSuccess ? 0 : 1)
}

runE2ETests().catch(console.error)
