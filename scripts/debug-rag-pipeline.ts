#!/usr/bin/env npx tsx
/**
 * 🔬 T-050: Debug RAG Pipeline
 * Teste toutes les étapes du pipeline pour identifier où il casse
 */

import { supabaseAdmin } from '../lib/supabase'
import { generateEmbedding } from '../lib/gemini'
import { searchDocuments } from '../lib/search-documents'
import { retrieveRelevantChunks } from '../lib/rag-pipeline'

console.log('🧪 Debug RAG Pipeline - T-050\n')
console.log('═'.repeat(60))

async function main() {
  try {
    // ÉTAPE 1: Vérifier DB
    console.log('\n1️⃣ VÉRIFICATION BASE DE DONNÉES')
    console.log('─'.repeat(60))
    
    const { count: docsCount } = await supabaseAdmin
      .from('documents')
      .select('*', { count: 'exact', head: true })
    
    const { count: chunksCount } = await supabaseAdmin
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
    
    console.log(`✅ Documents: ${docsCount}`)
    console.log(`✅ Chunks: ${chunksCount}`)
    
    // Vérifier chunks avec vector NULL
    const { data: nullVectorChunks } = await supabaseAdmin
      .from('document_chunks')
      .select('chunk_id')
      .is('chunk_vector', null)
    
    const nullCount = nullVectorChunks?.length || 0
    if (nullCount > 0) {
      console.log(`⚠️  Chunks avec vector NULL: ${nullCount} (${((nullCount / (chunksCount || 1)) * 100).toFixed(1)}%)`)
    } else {
      console.log(`✅ Chunks avec vector NULL: 0`)
    }
    
    // Échantillon chunk avec vector
    const { data: sampleChunks } = await supabaseAdmin
      .from('document_chunks')
      .select(`
        chunk_id,
        document_id,
        chunk_text,
        documents!inner(name, category)
      `)
      .not('chunk_vector', 'is', null)
      .limit(1)
    
    if (!sampleChunks || sampleChunks.length === 0) {
      console.error('❌ PROBLÈME CRITIQUE: Aucun chunk avec vector trouvé!')
      console.log('   → Cause probable: Ingestion échouée ou embeddings non générés')
      process.exit(1)
    } else {
      console.log(`✅ Échantillon chunk valide trouvé`)
    }
    
    // ÉTAPE 2: Test génération embedding
    console.log('\n2️⃣ TEST GÉNÉRATION EMBEDDING')
    console.log('─'.repeat(60))
    
    const testQuery = "What are the obligations of the seller in a yacht sale contract?"
    console.log(`📝 Query: "${testQuery}"`)
    
    const embedding = await generateEmbedding(testQuery)
    console.log(`✅ Embedding généré: ${embedding.length} dimensions`)
    
    if (embedding.length !== 768) {
      console.error(`⚠️  WARNING: Dimension mismatch! Expected 768, got ${embedding.length}`)
    }
    
    // ÉTAPE 3: Test RPC direct
    console.log('\n3️⃣ TEST RPC search_documents DIRECT')
    console.log('─'.repeat(60))
    
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('search_documents', {
      query_embedding: embedding,
      match_threshold: 0.1,  // Très bas
      match_count: 10,
      filter_category: null
    })
    
    if (rpcError) {
      console.error('❌ Erreur RPC search_documents:', rpcError)
      console.error('   Code:', rpcError.code)
      console.error('   Message:', rpcError.message)
      process.exit(1)
    }
    
    if (!rpcData || rpcData.length === 0) {
      console.error('❌ PROBLÈME DÉTECTÉ: RPC retourne 0 résultats')
      console.log('   → Vérifier:')
      console.log('     - Migration SQL appliquée?')
      console.log('     - Fonction search_documents existe?')
      console.log('     - Threshold trop strict?')
      process.exit(1)
    }
    
    console.log(`✅ RPC retourne ${rpcData.length} résultats`)
    console.log('\n   Top 3 résultats:')
    rpcData.slice(0, 3).forEach((row: any, idx: number) => {
      console.log(`   [${idx + 1}] ${row.document_name} (similarity: ${row.similarity?.toFixed(4)})`)
    })
    
    // ÉTAPE 4: Test searchDocuments wrapper
    console.log('\n4️⃣ TEST searchDocuments() WRAPPER')
    console.log('─'.repeat(60))
    
    const chunks = await searchDocuments(
      testQuery,
      undefined,  // no category filter
      10,
      0.6,
      false  // no reranking for simplicity
    )
    
    if (chunks.length === 0) {
      console.error('❌ PROBLÈME DÉTECTÉ: searchDocuments() retourne 0 chunks')
      console.log('   → Vérifier lib/search-documents.ts line 199-244 (fallback logic)')
      process.exit(1)
    }
    
    console.log(`✅ searchDocuments() retourne ${chunks.length} chunks`)
    
    // ÉTAPE 5: Test retrieveRelevantChunks (pipeline complet)
    console.log('\n5️⃣ TEST retrieveRelevantChunks() PIPELINE COMPLET')
    console.log('─'.repeat(60))
    
    const ragChunks = await retrieveRelevantChunks(
      testQuery,
      undefined,
      10,
      0.6,
      false
    )
    
    if (ragChunks.length === 0) {
      console.error('❌ PROBLÈME DÉTECTÉ: retrieveRelevantChunks() retourne 0 chunks')
      console.log('   → Vérifier lib/rag-pipeline.ts (query expansion, dedup)')
      process.exit(1)
    }
    
    console.log(`✅ retrieveRelevantChunks() retourne ${ragChunks.length} chunks`)
    console.log('\n   Détails:')
    ragChunks.slice(0, 3).forEach((chunk, idx) => {
      console.log(`   [${idx + 1}] ${chunk.documentName}`)
      console.log(`       Category: ${chunk.category}`)
      console.log(`       Similarity: ${chunk.similarity.toFixed(4)}`)
      console.log(`       Text: ${chunk.chunkText.substring(0, 100)}...`)
    })
    
    // RÉSUMÉ FINAL
    console.log('\n═'.repeat(60))
    console.log('🎉 DIAGNOSTIC COMPLET')
    console.log('═'.repeat(60))
    console.log('✅ Tous les tests réussis - Pipeline RAG fonctionne!')
    console.log('\n💡 Si l\'IA répond "Information non disponible", vérifier:')
    console.log('   1. Logs production de /api/chat')
    console.log('   2. Valeurs threshold/topK trop strictes')
    console.log('   3. Variables d\'environnement en production')
    
  } catch (error) {
    console.error('\n❌ ERREUR CRITIQUE:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
    process.exit(1)
  }
}

main()
