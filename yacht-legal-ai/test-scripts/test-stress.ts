import { config } from 'dotenv'
config({ path: '.env.local' })

import { retrieveRelevantChunks, formatChunksForContext } from '../lib/rag-pipeline'
import { generateAnswer } from '../lib/gemini'

const questions = [
  "Quelles sont les obligations du vendeur?",
  "Comment enregistrer un yacht à Malte?",
  "Procédure pour un litige maritime?",
  "Documents nécessaires pour immatriculation?",
  "Responsabilités du capitaine?"
]

async function testStress() {
  console.log('🧪 Stress Test - 5 questions parallèles\n')
  const start = Date.now()

  const results = await Promise.all(
    questions.map(async (q, i) => {
      const qStart = Date.now()
      try {
        const chunks = await retrieveRelevantChunks(q, undefined, 8, 0.6)
        const context = formatChunksForContext(chunks)
        const result = await generateAnswer(q, context)
        const latency = Date.now() - qStart
        
        const citations = (result.answer.match(/\[Source:/g) || []).length
        const fallback = /mode simplifié|surchargé/i.test(result.answer)
        
        console.log(`${i+1}. ${q.slice(0, 40)}...`)
        console.log(`   ✓ Citations: ${citations}, Latency: ${latency}ms, Fallback: ${fallback ? '❌' : '✅'}`)
        
        return { success: !fallback && citations >= 3, latency, fallback }
      } catch (err) {
        console.log(`${i+1}. ${q.slice(0, 40)}... ❌ ERROR:`, (err as Error).message)
        return { success: false, latency: Date.now() - qStart, fallback: true }
      }
    })
  )

  const total = Date.now() - start
  const passed = results.filter(r => r.success).length
  const fallbackRate = results.filter(r => r.fallback).length / results.length * 100
  const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length

  console.log(`\n📊 Résultats:`)
  console.log(`   Passed: ${passed}/5`)
  console.log(`   Fallback rate: ${fallbackRate.toFixed(1)}%`)
  console.log(`   Avg latency: ${avgLatency.toFixed(0)}ms`)
  console.log(`   Total time: ${(total/1000).toFixed(1)}s`)
  console.log(`\n${passed >= 4 && fallbackRate < 20 ? '✅ STRESS TEST PASSED' : '❌ STRESS TEST FAILED'}`)
}

testStress().catch(console.error)
