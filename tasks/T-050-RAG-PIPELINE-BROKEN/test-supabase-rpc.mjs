#!/usr/bin/env node
/**
 * 🔬 T-050: Test Supabase RPC search_documents
 * Teste la fonction search_documents avec un embedding réel
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variables manquantes:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL)
  console.error('  - SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

console.log('🧪 Test Supabase RPC search_documents\n')

async function testDatabase() {
  console.log('1️⃣ Vérification comptage DB...\n')
  
  // Test 1: Comptage documents
  const { count: docsCount, error: docsError } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
  
  if (docsError) {
    console.error('❌ Erreur comptage documents:', docsError)
  } else {
    console.log(`✅ Documents: ${docsCount}`)
  }
  
  // Test 2: Comptage chunks
  const { count: chunksCount, error: chunksError } = await supabase
    .from('document_chunks')
    .select('*', { count: 'exact', head: true })
  
  if (chunksError) {
    console.error('❌ Erreur comptage chunks:', chunksError)
  } else {
    console.log(`✅ Chunks: ${chunksCount}`)
  }
  
  // Test 3: Chunks avec vector NULL
  const { data: nullVectorChunks, error: nullError } = await supabase
    .from('document_chunks')
    .select('chunk_id')
    .is('chunk_vector', null)
  
  if (nullError) {
    console.error('❌ Erreur vérification NULL vectors:', nullError)
  } else {
    const nullCount = nullVectorChunks?.length || 0
    if (nullCount > 0) {
      console.log(`⚠️ Chunks avec vector NULL: ${nullCount}`)
    } else {
      console.log(`✅ Chunks avec vector NULL: 0`)
    }
  }
  
  // Test 4: Échantillon chunks avec vecteur
  const { data: sampleChunks, error: sampleError } = await supabase
    .from('document_chunks')
    .select('chunk_id, document_id, chunk_text, chunk_vector')
    .not('chunk_vector', 'is', null)
    .limit(1)
  
  if (sampleError) {
    console.error('❌ Erreur échantillon chunks:', sampleError)
  } else if (!sampleChunks || sampleChunks.length === 0) {
    console.error('⚠️ Aucun chunk avec vector trouvé!')
  } else {
    console.log(`✅ Échantillon chunk avec vector:`)
    console.log(`   - chunk_id: ${sampleChunks[0].chunk_id}`)
    console.log(`   - document_id: ${sampleChunks[0].document_id}`)
    console.log(`   - chunk_text length: ${sampleChunks[0].chunk_text?.length || 0}`)
    console.log(`   - chunk_vector type: ${typeof sampleChunks[0].chunk_vector}`)
  }
  
  console.log('\n2️⃣ Test fonction search_documents...\n')
  
  // Génération embedding test
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY manquante')
    return
  }
  
  const testQuery = "What are the obligations of the seller?"
  console.log(`📝 Query: "${testQuery}"`)
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: testQuery }] },
          taskType: 'RETRIEVAL_QUERY',
          outputDimensionality: 768
        })
      }
    )
    
    if (!response.ok) {
      throw new Error(`Gemini API error ${response.status}`)
    }
    
    const result = await response.json()
    const embedding = result.embedding.values
    
    console.log(`✅ Embedding généré: ${embedding.length} dimensions\n`)
    
    // Test RPC avec threshold très bas
    const { data: searchData, error: searchError } = await supabase.rpc('search_documents', {
      query_embedding: embedding,
      match_threshold: 0.1,  // Très bas pour maximiser résultats
      match_count: 5,
      filter_category: null
    })
    
    if (searchError) {
      console.error('❌ Erreur RPC search_documents:', searchError)
      console.error('   Code:', searchError.code)
      console.error('   Message:', searchError.message)
      console.error('   Details:', searchError.details)
    } else if (!searchData || searchData.length === 0) {
      console.error('⚠️ RPC search_documents retourne 0 résultats!')
      console.log('   → PROBLÈME DÉTECTÉ: Pipeline RAG cassé ici')
    } else {
      console.log(`✅ RPC search_documents retourne ${searchData.length} résultats`)
      console.log('\n📊 Échantillon résultats:')
      searchData.slice(0, 3).forEach((row, idx) => {
        console.log(`\n   [${idx + 1}] ${row.document_name} (${row.category})`)
        console.log(`       Similarity: ${row.similarity?.toFixed(4)}`)
        console.log(`       Chunk: ${row.chunk_text?.substring(0, 100)}...`)
      })
    }
    
  } catch (error) {
    console.error('❌ Exception test RPC:', error.message)
  }
}

testDatabase()
