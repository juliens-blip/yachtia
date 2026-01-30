#!/usr/bin/env npx tsx
/**
 * Test SQL direct - Simple version
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hmbattewtlmjbufiwuxt.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtYmF0dGV3dGxtamJ1Zml3dXh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI0NTM3OSwiZXhwIjoyMDgzODIxMzc5fQ.k3BjmaOykZ5t0gYqO0H2bj34AMXyOk0a2H5k3Gv3mWI'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  console.log('🔬 Test SQL Direct\n')
  
  // Test 1: Total chunks
  const { count, error: countError } = await supabase
    .from('document_chunks')
    .select('*', { count: 'exact', head: true })
  
  console.log('Total chunks:', count)
  if (countError) console.error('Error:', countError)
  
  // Test 2: Sample chunks avec embeddings
  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('chunk_id, chunk_text, chunk_vector')
    .limit(3)
  
  console.log('\nSample chunks:')
  if (error) {
    console.error('Error:', error)
  } else {
    chunks?.forEach((c: any, i: number) => {
      console.log(`Chunk ${i + 1}:`)
      console.log('  ID:', c.chunk_id)
      console.log('  Has vector:', !!c.chunk_vector)
      console.log('  Vector dim:', c.chunk_vector ? c.chunk_vector.length : 0)
      console.log('  Text:', c.chunk_text?.substring(0, 80) + '...')
    })
  }
  
  // Test 3: Vérifier si search_documents existe
  console.log('\n🔍 Test search_documents function...')
  const dummyEmbedding = new Array(1536).fill(0.001)
  
  const { data: searchData, error: searchError } = await supabase.rpc('search_documents', {
    query_embedding: dummyEmbedding,
    match_threshold: 0.1,
    match_count: 5,
    filter_category: null
  })
  
  if (searchError) {
    console.error('❌ search_documents ERROR:', searchError.message)
    console.error('Code:', searchError.code)
  } else {
    console.log('✅ search_documents OK - Results:', searchData?.length || 0)
    if (searchData && searchData.length > 0) {
      console.log('First result:', {
        doc: searchData[0].document_name,
        similarity: searchData[0].similarity,
        category: searchData[0].category
      })
    }
  }
}

main().catch(console.error)
