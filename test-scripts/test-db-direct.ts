#!/usr/bin/env npx tsx
/**
 * Test DB direct avec query SQL brute
 */

import { supabaseAdmin } from '../lib/supabase'

async function main() {
  console.log('🔬 Test DB Direct\n')
  
  // Test 1: Count total
  const { data: countData, error: countError } = await supabaseAdmin
    .rpc('execute_sql', {
      query: 'SELECT COUNT(*) as total, COUNT(chunk_vector) as with_vector FROM document_chunks'
    })
    .single()
  
  console.log('Count:', countData, countError)
  
  // Test 2: Sample chunks
  const { data: sample, error: sampleError } = await supabaseAdmin
    .from('document_chunks')
    .select('chunk_id, chunk_text, chunk_vector')
    .limit(5)
  
  console.log('\nSample chunks:')
  console.log('Error:', sampleError)
  console.log('Data:', sample?.map((c: any) => ({
    id: c.chunk_id,
    has_vector: !!c.chunk_vector,
    vector_type: typeof c.chunk_vector,
    text_preview: c.chunk_text?.substring(0, 50)
  })))
  
  // Test 3: Direct query check if chunk_vector column exists
  const { data: schema } = await supabaseAdmin
    .from('document_chunks')
    .select('*')
    .limit(1)
  
  console.log('\nSchema check:')
  if (schema && schema.length > 0) {
    console.log('Columns:', Object.keys(schema[0]))
  }
}

main()
