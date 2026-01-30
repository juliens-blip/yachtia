#!/usr/bin/env tsx
/**
 * Test Phase C: Threshold adaptatif + boost official docs
 */

import dotenv from 'dotenv'
const result = dotenv.config({ path: '.env.local' })
if (!result.parsed) {
  console.error('❌ Failed to load .env.local')
  process.exit(1)
}

import { searchDocuments } from '../lib/search-documents'

async function testThresholdBoost() {
  console.log('\n🧪 TEST PHASE C: Threshold Adaptatif + Boost Official Docs\n')
  console.log('=' .repeat(70))

  // Test 1: RMI deregistration (should boost MI-103, MI-100, MI-107)
  console.log('\n📋 Test 1: RMI deregistration query')
  console.log('-'.repeat(70))
  
  const results = await searchDocuments('RMI deregistration', undefined, 10, 0.65)
  
  console.log(`✅ Retrieved ${results.length} chunks\n`)
  
  console.log('Top 5 documents:')
  results.slice(0, 5).forEach((r, i) => {
    const isOfficial = r.category === 'Official Law' || r.category === 'Maritime Code' ||
                      r.documentName?.match(/MI-\d+|CYC \d+|OGSR|Merchant Shipping Act|VAT.*Guide/i)
    const marker = isOfficial ? '⭐' : '  '
    
    console.log(`${marker} ${i + 1}. ${r.documentName}`)
    console.log(`   Category: ${r.category}`)
    console.log(`   Similarity: ${r.similarity.toFixed(3)}`)
    console.log()
  })

  // Check success criteria
  const top3 = results.slice(0, 3)
  const officialInTop3 = top3.filter(r => 
    r.documentName?.match(/MI-\d+/i)
  ).length

  console.log('=' .repeat(70))
  console.log('\n📊 Success Criteria Check:')
  console.log(`✓ Official docs in top 3: ${officialInTop3}/3 (target: 2+)`)
  console.log(`✓ MI-103 similarity: ${results.find(r => r.documentName?.includes('MI-103'))?.similarity.toFixed(3) || 'N/A'} (target: >= 0.75)`)
  
  const hasHighBoost = results.some(r => 
    r.documentName?.includes('MI-103') && r.similarity >= 0.75
  )

  if (officialInTop3 >= 2 && hasHighBoost) {
    console.log('\n✅ PHASE C SUCCESS: Boost system working correctly\n')
    return true
  } else {
    console.log('\n⚠️  PHASE C PARTIAL: Boost may need adjustment\n')
    return false
  }
}

testThresholdBoost()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('❌ Test failed:', err)
    process.exit(1)
  })
