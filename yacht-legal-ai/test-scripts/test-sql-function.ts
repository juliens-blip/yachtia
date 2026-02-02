#!/usr/bin/env npx tsx
/**
 * Test direct de la fonction SQL search_documents
 */

import { supabaseAdmin } from '../lib/supabase'
import { generateEmbedding } from '../lib/gemini'

async function main() {
  console.log('🔬 Test SQL Function search_documents\n')
  
  // Générer embedding
  const query = "yacht sale contract obligations seller"
  console.log(`Query: "${query}"`)
  
  const embedding = await generateEmbedding(query)
  console.log(`✅ Embedding: ${embedding.length} dims\n`)
  
  // Test 1: RPC avec threshold bas
  console.log('Test 1: RPC avec threshold=0.1, count=10')
  const { data: d1, error: e1 } = await supabaseAdmin.rpc('search_documents', {
    query_embedding: embedding,
    match_threshold: 0.1,
    match_count: 10,
    filter_category: null
  })
  console.log('  Error:', e1?.message || 'none')
  console.log('  Results:', d1?.length || 0)
  if (d1 && d1.length > 0) {
    console.log('  Top result:', {
      doc: d1[0].document_name,
      similarity: d1[0].similarity,
      chunk: d1[0].chunk_text?.substring(0, 60)
    })
  }
  
  // Test 2: Query manuelle sans fonction (direct pgvector)
  console.log('\nTest 2: Query manuelle direct (sans fonction)')
  const { data: d2, error: e2 } = await supabaseAdmin
    .rpc('raw_similarity_search', {
      query_text: `
        SELECT
          dc.id,
          d.name,
          d.category,
          1 - (dc.chunk_vector <=> $1::vector(768)) as similarity
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE (1 - (dc.chunk_vector <=> $1::vector(768))) > 0.1
        ORDER BY dc.chunk_vector <=> $1::vector(768)
        LIMIT 5
      `,
      embedding_param: embedding
    })
  
  console.log('  Error:', e2?.message || 'none')
  console.log('  Results:', d2?.length || 0)
  
  // Test 3: Compter chunks qui matcheraient avec threshold=0.0
  console.log('\nTest 3: Count total chunks avec similarité > 0')
  const embeddingStr = `[${embedding.join(',')}]`
  
  // Tester si l'opérateur <=> fonctionne
  const { data: d3 } = await supabaseAdmin
    .from('document_chunks')
    .select('id')
    .not('chunk_vector', 'is', null)
    .limit(1)
  
  console.log('  Chunks avec vector non-null:', d3?.length || 0)
  
  if (d3 && d3.length > 0) {
    // Si chunks existent, problème est dans la fonction SQL ou l'opérateur <=>
    console.log('\n❌ DIAGNOSTIC:')
    console.log('   - Chunks existent avec vectors')
    console.log('   - Embedding généré OK')
    console.log('   - Fonction RPC retourne 0')
    console.log('   → Problème probable: WHERE clause dans search_documents')
    console.log('   → Vérifier: extension pgvector activée?')
    console.log('   → Vérifier: opérateur <=> défini pour vector(768)?')
  }
}

main()
