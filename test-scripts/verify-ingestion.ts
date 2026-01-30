/**
 * Script de vérification de l'ingestion
 * Affiche les statistiques de la base documentaire
 */

import { getCorpusStats } from '../lib/rag-pipeline'
import { supabaseAdmin } from '../lib/supabase'

async function verify() {
  console.log('╔' + '═'.repeat(58) + '╗')
  console.log('║' + ' '.repeat(58) + '║')
  console.log('║     📊 VÉRIFICATION BASE DOCUMENTAIRE                 ║')
  console.log('║' + ' '.repeat(58) + '║')
  console.log('╚' + '═'.repeat(58) + '╝\n')
  
  // Get stats
  const stats = await getCorpusStats()
  
  console.log('📈 Statistiques Globales:')
  console.log('─'.repeat(60))
  console.log(`Documents totaux: ${stats.totalDocuments}`)
  console.log(`Chunks totaux: ${stats.totalChunks}`)
  
  if (stats.totalDocuments === 0) {
    console.log('\n❌ PROBLÈME: Aucun document trouvé!')
    console.log('   Solution: Lancez `npm run ingest:all` pour ingérer les documents.\n')
    process.exit(1)
  }
  
  console.log(`\n📂 Par catégorie: (${Object.keys(stats.categoryBreakdown).length} catégories)`)
  console.log('─'.repeat(60))
  
  for (const [category, count] of Object.entries(stats.categoryBreakdown)) {
    console.log(`  ${category.padEnd(20)} : ${count} documents`)
  }
  
  // Get average chunks per document
  const avgChunks = (stats.totalChunks / stats.totalDocuments).toFixed(1)
  console.log(`\n📊 Moyenne: ${avgChunks} chunks par document`)
  
  // Test vector search
  console.log('\n🔍 Test Recherche Vectorielle...')
  console.log('─'.repeat(60))
  
  try {
    const { data, error } = await supabaseAdmin
      .rpc('search_documents', {
        query_embedding: Array(768).fill(0),  // Dummy embedding
        match_threshold: 0.1,
        match_count: 1,
        filter_category: null
      })
    
    if (error) {
      console.error('❌ Erreur recherche vectorielle:', error.message)
    } else if (data && data.length > 0) {
      console.log('✅ Fonction search_documents() opérationnelle')
      console.log(`   Exemple de chunk trouvé:`)
      console.log(`   - Document: ${data[0].document_name}`)
      console.log(`   - Catégorie: ${data[0].category}`)
      console.log(`   - Texte: ${data[0].chunk_text.substring(0, 100)}...`)
    } else {
      console.warn('⚠️  Aucun chunk trouvé (normal si base vide)')
    }
  } catch (error) {
    console.error('❌ Erreur test:', error instanceof Error ? error.message : error)
  }
  
  // Validation finale
  console.log('\n✅ Validation Finale:')
  console.log('─'.repeat(60))
  
  const expectedDocs = 70  // Expected minimum
  
  if (stats.totalDocuments >= expectedDocs) {
    console.log(`✅ Ingestion complète (${stats.totalDocuments}/${expectedDocs}+ documents)`)
  } else {
    console.warn(`⚠️  Ingestion partielle (${stats.totalDocuments}/${expectedDocs} documents)`)
    console.warn(`   Il manque ${expectedDocs - stats.totalDocuments} documents`)
    console.warn(`   Relancez 'npm run ingest:all' pour compléter.`)
  }
  
  if (stats.totalChunks > 0) {
    console.log(`✅ Chunks présents (${stats.totalChunks} chunks)`)
  } else {
    console.error(`❌ Aucun chunk trouvé!`)
  }
  
  // Show disk usage estimate
  const embeddingSize = 768 * 4  // 768 floats × 4 bytes
  const totalEmbeddingsSize = (stats.totalChunks * embeddingSize / 1024 / 1024).toFixed(2)
  console.log(`\n💾 Espace utilisé (estimé): ${totalEmbeddingsSize} MB (embeddings seuls)`)
  
  console.log('\n🎉 Vérification terminée!\n')
}

verify().catch(error => {
  console.error('\n💥 Erreur:', error)
  process.exit(1)
})
