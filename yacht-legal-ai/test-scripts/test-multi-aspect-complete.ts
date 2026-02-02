#!/usr/bin/env tsx
/**
 * Test Phase D: Multi-aspect structure + multi-sources validation
 */

import dotenv from 'dotenv'
const result = dotenv.config({ path: '.env.local' })
if (!result.parsed) {
  console.error('❌ Failed to load .env.local')
  process.exit(1)
}

import { retrieveRelevantChunks } from '../lib/rag-pipeline'
import { generateAnswer } from '../lib/gemini'

async function testMultiAspect() {
  console.log('\n🧪 TEST PHASE D: Multi-Aspect Structure + Multi-Sources\n')
  console.log('=' .repeat(70))

  const question = "Comment transférer un yacht de RMI vers Malte?"
  
  console.log(`📋 Question: ${question}\n`)
  console.log('Retrieving chunks...')
  
  const chunks = await retrieveRelevantChunks(question, undefined, 20, 0.6)
  
  console.log(`✅ Retrieved ${chunks.length} chunks`)
  console.log(`📚 Unique documents: ${new Set(chunks.map(c => c.documentName)).size}\n`)
  
  console.log('Top 10 chunks:')
  chunks.slice(0, 10).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.documentName} (${c.category}) - sim: ${c.similarity.toFixed(3)}`)
  })

  console.log('\n' + '='.repeat(70))
  console.log('Generating answer...\n')
  
  const context = chunks.map(c => c.chunkText)
  const metadata = chunks.map(c => ({
    document_name: c.documentName,
    category: c.category,
    source_url: c.sourceUrl,
    page_number: c.pageNumber
  }))

  const { answer } = await generateAnswer(question, context, undefined, metadata)
  
  console.log('ANSWER:')
  console.log('-'.repeat(70))
  console.log(answer)
  console.log('-'.repeat(70))

  // Validate structure
  console.log('\n📊 Validation:')
  
  const hasSection1 = answer.match(/##\s*1\.\s*Sortie/i)
  const hasSection2 = answer.match(/##\s*2\.\s*Entr[ée]/i)
  const hasSection3 = answer.match(/##\s*3\.\s*Conformit[ée]/i)
  const hasSection4 = answer.match(/##\s*4\.\s*Implication.*Fiscal/i)
  
  console.log(`✓ Section 1 (Exit): ${hasSection1 ? '✅' : '❌'}`)
  console.log(`✓ Section 2 (Entry): ${hasSection2 ? '✅' : '❌'}`)
  console.log(`✓ Section 3 (Technical): ${hasSection3 ? '✅' : '❌'}`)
  console.log(`✓ Section 4 (Fiscal): ${hasSection4 ? '✅' : '❌'}`)

  const citations = (answer.match(/\[Source:[^\]]+\]/g) || [])
  const uniqueSources = new Set(
    citations.map(c => c.match(/\[Source:\s*([^,\]]+)/)?.[1]).filter(Boolean)
  )

  console.log(`✓ Total citations: ${citations.length}`)
  console.log(`✓ Unique sources: ${uniqueSources.size}`)

  const officialSources = Array.from(uniqueSources).filter(s =>
    s?.match(/MI-\d+|OGSR|CYC|Merchant Shipping Act|VAT.*Guide/i)
  )
  
  console.log(`✓ Official sources cited: ${officialSources.length}`)
  console.log(`   ${officialSources.slice(0, 5).join(', ')}`)

  const success = 
    hasSection1 && hasSection2 && hasSection3 && hasSection4 &&
    uniqueSources.size >= 5 &&
    officialSources.length >= 3

  console.log('\n' + '='.repeat(70))
  if (success) {
    console.log('\n✅ PHASE D SUCCESS: 4 sections + 5+ sources + official priority\n')
    return true
  } else {
    console.log('\n⚠️  PHASE D PARTIAL: Some criteria not met\n')
    return false
  }
}

testMultiAspect()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('❌ Test failed:', err)
    process.exit(1)
  })
