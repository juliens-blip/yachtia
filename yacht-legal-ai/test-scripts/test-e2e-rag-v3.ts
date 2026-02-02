#!/usr/bin/env tsx

/**
 * Tests E2E RAG V3 - context extraction, filtering, multi-pass
 */

import assert from 'node:assert/strict'
import { extractYachtContext } from '../lib/context-extractor-enhanced'
import { filterByContext } from '../lib/document-filter-enhanced'
import { multiPassRetrieval } from '../lib/multi-pass-retrieval'
import type { RelevantChunk } from '../lib/rag-pipeline'

function testContextExtraction() {
  const context = extractYachtContext('50m yacht built 2000 Malta 800 GT')

  assert.equal(context.size, 50)
  assert.equal(context.age, 26)
  assert.equal(context.flag, 'Malta')
  assert.equal(context.gt, 800)
  assert.ok(context.tags.includes('SOLAS/MLC applicable'))
  assert.ok(context.tags.includes('Enhanced inspections'))
}

function testFiltering() {
  const docs = [
    { documentName: 'Malta Deletion Certificate Guide', category: 'PAVILLON_MALTA' },
    { documentName: 'Cayman VAT Notice', category: 'PAVILLON_CAYMAN' },
    { documentName: 'LY3 Large Yacht Code', category: 'CODE' },
    { documentName: 'Monaco VAT Guide', category: 'PAVILLON_MONACO' }
  ]

  const filteredMalta = filterByContext('Malta deletion certificate', docs)
  assert.ok(filteredMalta.some(doc => doc.documentName?.includes('Malta Deletion')))
  assert.ok(!filteredMalta.some(doc => doc.documentName?.includes('LY3')))
  assert.ok(!filteredMalta.some(doc => doc.documentName?.includes('Monaco')))

  const filteredCrew = filterByContext('Cayman crew requirements', docs)
  assert.ok(!filteredCrew.some(doc => doc.documentName?.includes('VAT')))
}

async function testMultiPass() {
  const searchFn = async (query: string, _category?: string, topK: number = 5): Promise<RelevantChunk[]> => {
    return Array.from({ length: topK }).map((_, idx) => ({
      chunkId: `${query}-${idx}`,
      documentId: `doc-${idx}`,
      documentName: `Doc ${idx}`,
      category: 'TEST',
      chunkText: `Content ${idx}`,
      similarity: 0.8 - idx * 0.01,
      pageNumber: idx + 1,
      chunkIndex: idx
    }))
  }

  const chunks = await multiPassRetrieval('complex registration inspection query', 2, {
    pass1TopK: 5,
    pass2TopK: 5,
    finalTopK: 5,
    searchFn
  })

  assert.equal(chunks.length, 5)
}

async function run() {
  testContextExtraction()
  testFiltering()
  await testMultiPass()

  console.log('✅ test-e2e-rag-v3 OK')
}

run().catch(error => {
  console.error('❌ test-e2e-rag-v3 FAILED', error)
  process.exit(1)
})
