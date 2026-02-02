/**
 * Script d'ingestion automatique des documents de référence
 * 
 * Processus:
 * 1. Télécharge PDFs et scrape pages HTML
 * 2. Extrait le texte
 * 3. Chunke le texte (500 tokens, 200 overlap)
 * 4. Génère les embeddings (batch de 10)
 * 5. Stocke dans Supabase (documents + document_chunks)
 * 
 * Usage:
 *   npm run ingest:all          # Ingère tous les documents
 *   npm run ingest:category -- MYBA  # Ingère une catégorie
 */

// CRITICAL: Load env FIRST before any imports
import './load-env'

import { REFERENCE_DOCS, type ReferenceDocument, getReferenceStats } from './reference-urls'
import { extractTextFromPDF } from '../lib/pdf-parser'
import { scrapeWebPage, downloadPDF } from '../lib/web-scraper'
import { chunkText } from '../lib/chunker'
import { generateEmbedding } from '../lib/gemini'
import { supabaseAdmin } from '../lib/supabase'

// Configuration
const BATCH_SIZE = 10  // Embeddings par batch (rate limiting)
const DELAY_BETWEEN_BATCHES = 2000  // 2 secondes de délai
const RETRY_ATTEMPTS = 3
const RETRY_DELAY = 5000  // 5 secondes

// Statistiques globales
let stats = {
  totalDocuments: 0,
  totalChunks: 0,
  totalErrors: 0,
  categoriesProcessed: new Set<string>(),
  startTime: Date.now()
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function sanitizeText(input: string): string {
  return input
    .replace(/\u0000/g, '')
    .replace(/[\uD800-\uDFFF]/g, '')
}

/**
 * Ingestion d'un seul document avec retry logic
 */
async function ingestDocument(
  doc: ReferenceDocument,
  category: string,
  retryCount = 0
): Promise<{ success: boolean; chunks: number }> {
  try {
    console.log(`\n📄 [${category}] ${doc.name}`)
    console.log(`   URL: ${doc.url}`)
    
    // ──────────────────────────────────────────────────────
    // ÉTAPE 1: Télécharger et extraire texte
    // ──────────────────────────────────────────────────────
    let text: string
    let pages: number | undefined
    
    if (doc.type === 'pdf') {
      const buffer = await downloadPDF(doc.url)
      const parsed = await extractTextFromPDF(buffer)
      text = parsed.text
      pages = parsed.pages
      console.log(`   📖 ${pages} pages extraites`)
    } else {
      text = await scrapeWebPage(doc.url)
      console.log(`   📰 Article web extrait`)
    }
    
    text = sanitizeText(text)

    if (!text || text.length < 100) {
      console.warn('   ⚠️  Text too short, inserting placeholder')
      text = `${doc.name}\nSource: ${doc.url}\n[PDF content not extractable]`
    }
    
    console.log(`   ✂️  Texte total: ${text.length} caractères`)
    
    // ──────────────────────────────────────────────────────
    // ETAPE 2: Stocker document dans DB
    // ──────────────────────────────────────────────────────
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        name: doc.name,
        category,
        pages: pages || null,
        file_url: doc.url,
        source_url: doc.url,  // Also set source_url for compatibility
        is_public: true,      // Required for RAG search (RLS policy)
        metadata: {
          source: doc.url,
          type: doc.type,
          language: doc.language || 'en',
          ingested_at: new Date().toISOString()
        }
      })
      .select('id')
      .single()
    
    if (docError || !document) {
      throw new Error(`Failed to insert document: ${docError?.message || 'Unknown error'}`)
    }
    
    console.log(`   💾 Document ID: ${document.id}`)
    
    // ──────────────────────────────────────────────────────
    // ÉTAPE 3: Chunker le texte
    // ──────────────────────────────────────────────────────
    const chunks = chunkText(text, 500, 200)
    console.log(`   ✂️  ${chunks.length} chunks créés`)
    
    if (chunks.length === 0) {
      console.warn(`   ⚠️  No chunks created (empty text?)`)
      return { success: true, chunks: 0 }
    }
    
    // ──────────────────────────────────────────────────────
    // ETAPE 4: Generer embeddings (batch processing)
    // ──────────────────────────────────────────────────────
    const chunkRecords: Array<{
      document_id: string
      chunk_index: number
      chunk_text: string
      chunk_vector: number[]  // Correct column name from migration 003
      page_number: number | null
      token_count: number
    }> = []
    
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE)
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      
      console.log(`   🔢 Batch ${batchNumber}/${totalBatches} (${batch.length} chunks)`)
      
      try {
        // Generate embeddings in parallel for this batch
        const embeddings = await Promise.all(
          batch.map(chunk => generateEmbedding(chunk.text))
        )

        // Build records
        batch.forEach((chunk, j) => {
          chunkRecords.push({
            document_id: document.id,
            chunk_index: i + j,
            chunk_text: chunk.text,
            chunk_vector: embeddings[j],  // Correct column name
            page_number: null,  // Could be inferred from chunk position if needed
            token_count: chunk.tokenCount
          })
        })
        
        console.log(`   ✅ Batch ${batchNumber} embeddings generated`)
        
        // Delay between batches (rate limiting)
        if (i + BATCH_SIZE < chunks.length) {
          await sleep(DELAY_BETWEEN_BATCHES)
        }
        
      } catch (error) {
        console.error(`   ❌ Batch ${batchNumber} failed:`, error instanceof Error ? error.message : error)
        throw new Error(`Embedding generation failed at batch ${batchNumber}`)
      }
    }
    
    // ──────────────────────────────────────────────────────
    // ÉTAPE 5: Insérer chunks dans DB
    // ──────────────────────────────────────────────────────
    const { error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .insert(chunkRecords)
    
    if (chunksError) {
      throw new Error(`Failed to insert chunks: ${chunksError.message}`)
    }
    
    console.log(`   ✅ ${chunkRecords.length} chunks insérés dans Supabase`)
    console.log(`   ⏱️  Temps: ${((Date.now() - stats.startTime) / 1000).toFixed(1)}s`)
    
    // Update stats
    stats.totalDocuments++
    stats.totalChunks += chunkRecords.length
    stats.categoriesProcessed.add(category)
    
    return { success: true, chunks: chunkRecords.length }
    
  } catch (error) {
    console.error(`   ❌ Error:`, error instanceof Error ? error.message : error)
    
    // Retry logic
    if (retryCount < RETRY_ATTEMPTS) {
      console.log(`   🔄 Retrying (${retryCount + 1}/${RETRY_ATTEMPTS}) in ${RETRY_DELAY / 1000}s...`)
      await sleep(RETRY_DELAY)
      return ingestDocument(doc, category, retryCount + 1)
    }
    
    stats.totalErrors++
    return { success: false, chunks: 0 }
  }
}

/**
 * Ingestion d'une catégorie complète
 */
async function ingestCategory(categoryName: string) {
  const docs = REFERENCE_DOCS[categoryName]
  
  if (!docs) {
    console.error(`❌ Catégorie inconnue: ${categoryName}`)
    console.log(`   Catégories disponibles: ${Object.keys(REFERENCE_DOCS).join(', ')}`)
    return
  }
  
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`📁 CATÉGORIE: ${categoryName} (${docs.length} documents)`)
  console.log(`${'═'.repeat(60)}`)
  
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i]
    console.log(`\n[${i + 1}/${docs.length}]`)
    await ingestDocument(doc, categoryName)
  }
}

/**
 * Ingestion de toutes les catégories
 */
async function ingestAll() {
  console.log('╔' + '═'.repeat(58) + '╗')
  console.log('║' + ' '.repeat(58) + '║')
  console.log('║  🚀 INGESTION AUTOMATIQUE DES DOCUMENTS DE RÉFÉRENCE  ║')
  console.log('║' + ' '.repeat(58) + '║')
  console.log('╚' + '═'.repeat(58) + '╝\n')
  
  const docStats = getReferenceStats()
  console.log('📊 Statistiques:')
  console.log(`   Total: ${docStats.totalDocuments} documents`)
  console.log(`   PDFs: ${docStats.totalPDFs}`)
  console.log(`   Pages HTML: ${docStats.totalHTML}`)
  console.log(`   Catégories: ${docStats.categories}`)
  console.log('\n📋 Par catégorie:')
  for (const [cat, count] of Object.entries(docStats.breakdown)) {
    console.log(`   - ${cat}: ${count} documents`)
  }
  
  console.log('\n⏳ Début de l\'ingestion...\n')
  stats.startTime = Date.now()
  
  for (const categoryName of Object.keys(REFERENCE_DOCS)) {
    await ingestCategory(categoryName)
  }
  
  // ──────────────────────────────────────────────────────
  // RAPPORT FINAL
  // ──────────────────────────────────────────────────────
  const durationMinutes = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1)
  
  console.log('\n\n' + '╔' + '═'.repeat(58) + '╗')
  console.log('║' + ' '.repeat(58) + '║')
  console.log('║           ✅ INGESTION TERMINÉE !                     ║')
  console.log('║' + ' '.repeat(58) + '║')
  console.log('╚' + '═'.repeat(58) + '╝\n')
  
  console.log('📈 Résultats:')
  console.log(`   ✅ Documents ingérés: ${stats.totalDocuments}`)
  console.log(`   ✅ Chunks créés: ${stats.totalChunks}`)
  console.log(`   ✅ Catégories: ${stats.categoriesProcessed.size}`)
  console.log(`   ❌ Erreurs: ${stats.totalErrors}`)
  console.log(`   ⏱️  Durée totale: ${durationMinutes} minutes`)
  console.log(`   📊 Moyenne: ${(stats.totalChunks / stats.totalDocuments).toFixed(0)} chunks/document`)
  
  if (stats.totalErrors > 0) {
    console.warn(`\n⚠️  ${stats.totalErrors} erreurs rencontrées. Vérifiez les logs ci-dessus.`)
  } else {
    console.log('\n🎉 Aucune erreur ! Tous les documents ont été ingérés avec succès.')
  }
  
  console.log('\n💡 Prochaine étape: Lancez `npm run ingest:verify` pour vérifier la base de données.\n')
}

/**
 * Main CLI
 */
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    // No args: ingest all
    await ingestAll()
  } else {
    // Category specified
    const categoryName = args[0]
    await ingestCategory(categoryName)
    
    const durationMinutes = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1)
    console.log(`\n✅ Catégorie ${categoryName} ingérée en ${durationMinutes} minutes`)
    console.log(`   Documents: ${stats.totalDocuments}`)
    console.log(`   Chunks: ${stats.totalChunks}`)
    console.log(`   Erreurs: ${stats.totalErrors}`)
  }
}

// Run
main().catch(error => {
  console.error('\n💥 ERREUR FATALE:', error)
  process.exit(1)
})
