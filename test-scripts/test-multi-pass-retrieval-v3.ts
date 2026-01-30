import assert from 'node:assert/strict'
import { isComplexQuery, multiPassRetrieval } from '../lib/multi-pass-retrieval'
import type { RelevantChunk } from '../lib/rag-pipeline'

assert.equal(
  isComplexQuery('Quelles sont les obligations de SOLAS et MLC pour un yacht commercial ?'),
  true
)
assert.equal(isComplexQuery('Quel pavillon pour un yacht de 30m ?'), false)

const queries: string[] = []
const searchFn = async (query: string, _category?: string, topK: number = 5): Promise<RelevantChunk[]> => {
  queries.push(query)
  return Array.from({ length: topK }).map((_, idx) => ({
    chunkId: `${query}-${idx}`,
    documentId: `doc-${idx}`,
    documentName: `Doc ${idx}`,
    category: 'TEST',
    chunkText: `Content ${idx}`,
    similarity: 0.9 - idx * 0.01,
    pageNumber: idx,
    chunkIndex: idx
  }))
}

const run = async () => {
  const results = await multiPassRetrieval('inspection malta yacht', 2, {
    pass1TopK: 3,
    pass2TopK: 2,
    finalTopK: 4,
    searchFn
  })

  assert.equal(queries.length, 2)
  assert.ok(queries[0].includes('inspection malta yacht'))
  assert.ok(queries[1].includes('inspection malta yacht'))
  assert.equal(results.length, 4)

  console.log('✅ test-multi-pass-retrieval-v3 OK')
}

run().catch(error => {
  console.error('❌ test-multi-pass-retrieval-v3 FAILED', error)
  process.exit(1)
})
