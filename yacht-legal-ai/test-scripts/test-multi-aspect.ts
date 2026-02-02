/**
 * Test Multi-Aspect Retrieval
 * 
 * Tests retrieval for complex multi-aspect query: "RMI → Malta transfer"
 * Expected: 4 aspects (Exit_RMI, Entry_Malta, Technical, Fiscal)
 * Target: >= 8 unique docs, >= 12 chunks, balanced distribution
 */

// CRITICAL: Load environment variables BEFORE any imports
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env.local.backup' })

import { expandQueryMultiAspect, type ExpandedQueryMultiAspect } from '../lib/question-processor'
import { retrieveRelevantChunks } from '../lib/rag-pipeline'

interface AspectStats {
  aspect: string
  chunks: number
  uniqueDocs: number
  docNames: string[]
  percentage: string
}

async function testMultiAspect() {
  console.log('🧪 Test Multi-Aspect Retrieval\n')
  console.log('═'.repeat(60))
  
  const testQuery = 'Comment transférer un yacht de RMI vers Malte?'
  console.log(`\n📝 Question: "${testQuery}"\n`)
  
  // Step 1: Detect aspects
  console.log('🔍 Step 1: Aspect Detection')
  console.log('-'.repeat(60))
  
  const expanded = await expandQueryMultiAspect(testQuery)
  const isMultiAspect = 'aspects' in expanded && expanded.aspects.length >= 2
  
  if (!isMultiAspect) {
    console.log('❌ FAIL: Query not detected as multi-aspect')
    console.log('Detected aspects:', (expanded as any).aspects?.length || 0)
    process.exit(1)
  }
  
  const multiExpanded = expanded as ExpandedQueryMultiAspect
  console.log(`✅ Multi-aspect detected: ${multiExpanded.aspects.length} aspects\n`)
  
  multiExpanded.aspects.forEach((aspect, i) => {
    console.log(`${i + 1}. ${aspect.name} (weight: ${aspect.weight})`)
    console.log(`   Keywords: ${aspect.keywords.slice(0, 5).join(', ')}`)
  })
  
  // Step 2: Retrieve per aspect (simulate route logic)
  console.log('\n\n🔎 Step 2: Retrieval per Aspect')
  console.log('-'.repeat(60))
  
  const aspectResults = await Promise.all(
    multiExpanded.queries.map(async ({ aspect, query }) => {
      const chunks = await retrieveRelevantChunks(query, undefined, 5, 0.55)
      return { aspect, chunks, query }
    })
  )
  
  // Simulate route's round-robin selection logic
  const aspectCounts = new Map<string, number>()
  const aspectStats = new Map<string, { count: number; docs: Set<string> }>()
  for (const aspect of multiExpanded.aspects.map(a => a.name)) {
    aspectCounts.set(aspect, 0)
    aspectStats.set(aspect, { count: 0, docs: new Set() })
  }
  
  const selected: typeof aspectResults[0]['chunks'] = []
  const selectedIds = new Set<string>()
  const targetPerAspect = Math.ceil(15 / multiExpanded.aspects.length)
  
  // First pass: fill each aspect to target
  for (const { aspect, chunks: aspectChunks } of aspectResults) {
    for (const chunk of aspectChunks) {
      const currentCount = aspectCounts.get(aspect) || 0
      if (currentCount >= targetPerAspect) break
      if (selectedIds.has(chunk.chunkId)) continue
      const docChunks = selected.filter(c => c.documentName === chunk.documentName)
      if (docChunks.length >= 2) continue
      
      selected.push(chunk)
      selectedIds.add(chunk.chunkId)
      aspectCounts.set(aspect, currentCount + 1)
      const stats = aspectStats.get(aspect)!
      stats.count++
      stats.docs.add(chunk.documentName)
    }
  }
  
  // Second pass: fill remaining slots (max 15 total)
  for (const { aspect, chunks: aspectChunks } of aspectResults) {
    for (const chunk of aspectChunks) {
      if (selected.length >= 15) break
      if (selectedIds.has(chunk.chunkId)) continue
      const docChunks = selected.filter(c => c.documentName === chunk.documentName)
      if (docChunks.length >= 2) continue
      
      selected.push(chunk)
      selectedIds.add(chunk.chunkId)
      aspectCounts.set(aspect, (aspectCounts.get(aspect) || 0) + 1)
      const stats = aspectStats.get(aspect)!
      stats.count++
      stats.docs.add(chunk.documentName)
    }
  }
  
  // Build stats map
  const aspectStatsMap = new Map<string, AspectStats>()
  const totalChunks = selected.length
  const allDocs = new Set(selected.map(c => c.documentName))
  
  aspectStats.forEach((stats, aspect) => {
    aspectStatsMap.set(aspect, {
      aspect,
      chunks: stats.count,
      uniqueDocs: stats.docs.size,
      docNames: [...stats.docs],
      percentage: totalChunks > 0 ? `${((stats.count / totalChunks) * 100).toFixed(1)}%` : '0%'
    })
  })
  
  console.log(`\nSelected ${selected.length} chunks (target: 15)`)
  console.log(`Target per aspect: ${targetPerAspect}`)
  console.log('\nRetrieval Results:')
  aspectStatsMap.forEach(stats => {
    console.log(`\n${stats.aspect}:`)
    console.log(`  Chunks: ${stats.count} (${stats.percentage})`)
    console.log(`  Unique docs: ${stats.uniqueDocs}`)
    console.log(`  Top docs: ${stats.docNames.slice(0, 3).join(', ')}`)
  })
  
  // Step 3: Validate success criteria
  console.log('\n\n✅ Step 3: Success Criteria Validation')
  console.log('-'.repeat(60))
  
  const criteria = [
    {
      name: '4 aspects detected',
      expected: 4,
      actual: multiExpanded.aspects.length,
      pass: multiExpanded.aspects.length === 4
    },
    {
      name: '>= 8 unique docs',
      expected: 8,
      actual: allDocs.size,
      pass: allDocs.size >= 8
    },
    {
      name: '>= 12 total chunks (target: 15)',
      expected: 12,
      actual: selected.length,
      pass: selected.length >= 12
    }
  ]
  
  let allPassed = true
  criteria.forEach(({ name, expected, actual, pass }) => {
    const status = pass ? '✅' : '❌'
    console.log(`${status} ${name}: ${actual} (target: ${expected})`)
    if (!pass) allPassed = false
  })
  
  // Balance check (4 aspects: ~25% each, allow 10-40% variance)
  console.log('\n📊 Balance Check (target: 10-40% per aspect for 4 aspects):')
  const balanceOK = Array.from(aspectStatsMap.values()).every(stats => {
    const pct = parseFloat(stats.percentage)
    const balanced = pct >= 10 && pct <= 40
    const status = balanced ? '✅' : '⚠️'
    console.log(`${status} ${stats.aspect}: ${stats.percentage}`)
    return balanced
  })
  
  // Final summary
  console.log('\n\n' + '═'.repeat(60))
  console.log('📊 SUMMARY')
  console.log('═'.repeat(60))
  console.log(`Aspects detected: ${multiExpanded.aspects.map(a => a.name).join(', ')}`)
  console.log(`Total unique docs: ${allDocs.size}`)
  console.log(`Total unique chunks: ${totalChunks}`)
  console.log(`Balance: ${balanceOK ? '✅ Balanced' : '⚠️ Unbalanced'}`)
  
  if (allPassed && balanceOK) {
    console.log('\n🎉 ALL TESTS PASSED')
    process.exit(0)
  } else {
    console.log('\n❌ SOME TESTS FAILED')
    process.exit(1)
  }
}

testMultiAspect().catch(err => {
  console.error('❌ Test error:', err)
  process.exit(1)
})
