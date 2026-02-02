#!/usr/bin/env npx tsx
/**
 * Vérifier la dimension des embeddings dans la DB
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hmbattewtlmjbufiwuxt.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtYmF0dGV3dGxtamJ1Zml3dXh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI0NTM3OSwiZXhwIjoyMDgzODIxMzc5fQ.k3BjmaOykZ5t0gYqO0H2bj34AMXyOk0a2H5k3Gv3mWI'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  console.log('🔍 Checking vector dimensions in DB...\n')
  
  // Get one chunk with vector
  const { data, error } = await supabase
    .from('document_chunks')
    .select('id, chunk_index, chunk_text, chunk_vector')
    .not('chunk_vector', 'is', null)
    .limit(1)
    .single()
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  if (!data) {
    console.log('❌ No chunks found with vectors')
    return
  }
  
  console.log('✅ Sample chunk found:')
  console.log('  ID:', data.id)
  console.log('  Text preview:', data.chunk_text?.substring(0, 80))
  console.log('  Vector dimension:', data.chunk_vector ? data.chunk_vector.length : 0)
  console.log('  Expected dimension: 768 (Gemini)')
  
  if (data.chunk_vector) {
    const dim = data.chunk_vector.length
    if (dim === 768) {
      console.log('\n✅ CORRECT: Vectors are 768-dimensional')
    } else if (dim === 1536) {
      console.log('\n❌ ERROR: Vectors are 1536-dimensional (OpenAI format)')
      console.log('   → Need to re-ingest all documents with Gemini embeddings')
    } else {
      console.log(`\n⚠️ UNEXPECTED: Vectors are ${dim}-dimensional`)
    }
  }
  
  // Check function definition
  console.log('\n🔍 Checking search_documents function configuration...')
  const testEmbedding768 = new Array(768).fill(0.001)
  
  const { data: searchData768, error: searchError768 } = await supabase.rpc('search_documents', {
    query_embedding: testEmbedding768,
    match_threshold: 0.1,
    match_count: 3,
    filter_category: null
  })
  
  if (searchError768) {
    console.log('❌ search_documents with 768-dim vector:', searchError768.message)
  } else {
    console.log(`✅ search_documents with 768-dim vector: OK (${searchData768?.length || 0} results)`)
  }
}

main().catch(console.error)
