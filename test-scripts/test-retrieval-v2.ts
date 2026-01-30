#!/usr/bin/env tsx

/**
 * Retrieval validation script for RAG V2 ranking/diversity
 * Oracle: APEX
 */

import { retrieveRelevantChunks } from '../lib/rag-pipeline'
import { extractFlag } from '../lib/doc-type-tagger'

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function testLy3Boost() {
  const query = 'selon LY3'
  const chunks = await retrieveRelevantChunks(query, undefined, 10, 0.6)
  const top3 = chunks.slice(0, 3)

  const ly3Hits = top3.filter(chunk => normalize(chunk.documentName).includes('ly3'))

  console.log('T011 - LY3 boost:')
  top3.forEach((chunk, idx) => {
    console.log(`  ${idx + 1}. ${chunk.documentName} (${chunk.category})`) 
  })

  return ly3Hits.length === 3
}

async function testFlagFiltering() {
  const query = 'Malta'
  const chunks = await retrieveRelevantChunks(query, undefined, 10, 0.6)

  const otherFlags = chunks.filter(chunk => {
    const flag = extractFlag(`${chunk.documentName} ${chunk.category}`)
    return flag && flag !== 'Malta'
  })

  console.log('\nT013 - Flag filtering (Malta):')
  chunks.forEach((chunk, idx) => {
    const flag = extractFlag(`${chunk.documentName} ${chunk.category}`) || 'N/A'
    console.log(`  ${idx + 1}. ${chunk.documentName} (${chunk.category}) -> ${flag}`)
  })

  return otherFlags.length === 0
}

async function testDiversity() {
  const query = 'immatriculation yacht obligations'
  const chunks = await retrieveRelevantChunks(query, undefined, 15, 0.6)
  const uniqueDocs = new Set(chunks.map(chunk => chunk.documentId || chunk.documentName))

  console.log('\nT012 - Multi-source diversity:')
  console.log(`  Chunks: ${chunks.length}`)
  console.log(`  Docs uniques: ${uniqueDocs.size}`)

  return uniqueDocs.size >= 8
}

async function testMultiFlagQueries() {
  const queries = [
    'Malta Gibraltar Netherlands',
    'Jersey Isle of Man pavillon'
  ]

  console.log('\nT021 - Multi-flag queries:')
  for (const query of queries) {
    const chunks = await retrieveRelevantChunks(query, undefined, 10, 0.6)
    const flags = chunks.map(chunk => extractFlag(`${chunk.documentName} ${chunk.category}`) || 'N/A')
    console.log(`  Query: ${query}`)
    flags.slice(0, 10).forEach((flag, idx) => {
      console.log(`    ${idx + 1}. ${flag}`)
    })
  }

  return true
}

async function testFlagCoverage() {
  const cases = [
    { query: 'Gibraltar', expected: 'GIBRALTAR' },
    { query: 'Netherlands', expected: 'NETHERLANDS' },
    { query: 'Jersey', expected: 'JERSEY' },
    { query: 'BVI', expected: 'BVI' },
    { query: 'France', expected: 'FRANCE' }
  ]

  console.log('\nT021 - Flag coverage:')
  let success = true

  for (const testCase of cases) {
    const chunks = await retrieveRelevantChunks(testCase.query, undefined, 10, 0.6)
    const flags = chunks.map(chunk => extractFlag(`${chunk.documentName} ${chunk.category}`) || 'N/A')
    const hit = (flags as string[]).includes(testCase.expected)
    console.log(`  Query: ${testCase.query} -> ${hit ? '✅' : '❌'} (${flags.slice(0, 5).join(', ')})`)
    if (!hit) success = false
  }

  return success
}

async function run() {
  const results: Array<{ name: string; ok: boolean }> = []

  results.push({ name: 'T011 LY3 boost', ok: await testLy3Boost() })
  results.push({ name: 'T013 Malta filtering', ok: await testFlagFiltering() })
  results.push({ name: 'T012 multi-source diversity', ok: await testDiversity() })
  results.push({ name: 'T021 multi-flag queries', ok: await testMultiFlagQueries() })
  results.push({ name: 'T021 flag coverage', ok: await testFlagCoverage() })

  console.log('\nRésumé:')
  results.forEach(result => {
    console.log(`  ${result.ok ? '✅' : '❌'} ${result.name}`)
  })

  const success = results.every(result => result.ok)
  process.exit(success ? 0 : 1)
}

run().catch(error => {
  console.error('Test retrieval v2 error:', error)
  process.exit(1)
})
