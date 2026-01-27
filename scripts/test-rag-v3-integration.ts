import assert from 'node:assert/strict'
import type { RelevantChunk } from '../lib/rag-pipeline'

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

const run = async () => {
  if (!process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = 'test-key'
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
  }

  const { formatChunksForContext } = await import('../lib/rag-pipeline')
  const { multiPassRetrieval } = await import('../lib/multi-pass-retrieval')

  const chunks = await multiPassRetrieval('inspection malta yacht', 2, {
    pass1TopK: 2,
    pass2TopK: 2,
    finalTopK: 3,
    searchFn
  })

  const formatted = formatChunksForContext(chunks)
  assert.equal(formatted.length, 3)
  assert.ok(formatted[0].includes('[Document:'))

  console.log('✅ test-rag-v3-integration OK')
}

run().catch(error => {
  console.error('❌ test-rag-v3-integration FAILED', error)
  process.exit(1)
})
