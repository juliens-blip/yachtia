/**
 * Script d'ingestion des NOUVELLES categories uniquement
 *
 * Categories ajoutees en janvier 2026:
 * - DROIT_MER_INTERNATIONAL (UNCLOS, COLREG, Paris MoU)
 * - PAVILLON_MARSHALL (RMI Yacht Code)
 * - PAVILLON_MALTA (CYC 2020/2025)
 * - PAVILLON_CAYMAN_REG (LY3, REG Yacht Code)
 * - MANNING_STCW (certificats equipage)
 * - GUIDES_PAVILLONS (comparatifs registres)
 *
 * Usage: npm run ingest:new
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') })

import { REFERENCE_DOCS, type ReferenceDocument } from './reference-urls'
import { extractTextFromPDF } from '../lib/pdf-parser'
import { scrapeWebPage, downloadPDF } from '../lib/web-scraper'
import { chunkText } from '../lib/chunker'
import { generateEmbedding } from '../lib/gemini'
import { supabaseAdmin } from '../lib/supabase'

// Nouvelles categories a ingerer
const NEW_CATEGORIES = [
  'DROIT_MER_INTERNATIONAL',
  'PAVILLON_MARSHALL',
  'PAVILLON_MALTA',
  'PAVILLON_CAYMAN_REG',
  'MANNING_STCW',
  'GUIDES_PAVILLONS'
]

// Configuration
const BATCH_SIZE = 10
const DELAY_BETWEEN_BATCHES = 2000
const RETRY_ATTEMPTS = 3
const RETRY_DELAY = 5000

// Stats
let stats = {
  totalDocuments: 0,
  totalChunks: 0,
  totalErrors: 0,
  skipped: 0,
  categoriesProcessed: new Set<string>(),
  startTime: Date.now()
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Verifie si un document existe deja dans la base
 */
async function documentExists(url: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('documents')
    .select('id')
    .or(`file_url.eq.${url},source_url.eq.${url}`)
    .limit(1)

  return data !== null && data.length > 0
}

/**
 * Ingestion d'un document
 */
async function ingestDocument(
  doc: ReferenceDocument,
  category: string,
  retryCount = 0
): Promise<{ success: boolean; chunks: number; skipped: boolean }> {
  try {
    // Check if already exists
    if (await documentExists(doc.url)) {
      console.log(`   [SKIP] Document deja present: ${doc.name}`)
      stats.skipped++
      return { success: true, chunks: 0, skipped: true }
    }

    console.log(`\n[${category}] ${doc.name}`)
    console.log(`   URL: ${doc.url}`)

    // ETAPE 1: Telecharger et extraire texte
    let text: string
    let pages: number | undefined

    if (doc.type === 'pdf') {
      const buffer = await downloadPDF(doc.url)
      const parsed = await extractTextFromPDF(buffer)
      text = parsed.text
      pages = parsed.pages
      console.log(`   PDF: ${pages} pages`)
    } else {
      text = await scrapeWebPage(doc.url)
      console.log(`   HTML: article scrape`)
    }

    if (!text || text.length < 100) {
      throw new Error('Texte trop court (< 100 chars)')
    }

    console.log(`   Texte: ${text.length} caracteres`)

    // ETAPE 2: Insert document
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        name: doc.name,
        category,
        pages: pages || null,
        file_url: doc.url,
        source_url: doc.url,
        is_public: true,
        metadata: {
          source: doc.url,
          type: doc.type,
          language: doc.language || 'en',
          ingested_at: new Date().toISOString(),
          batch: 'new_categories_2026_01'
        }
      })
      .select('id')
      .single()

    if (docError || !document) {
      throw new Error(`Insert failed: ${docError?.message || 'Unknown'}`)
    }

    console.log(`   Document ID: ${document.id}`)

    // ETAPE 3: Chunking
    const chunks = chunkText(text, 500, 100)
    console.log(`   Chunks: ${chunks.length}`)

    if (chunks.length === 0) {
      return { success: true, chunks: 0, skipped: false }
    }

    // ETAPE 4: Embeddings
    const chunkRecords: Array<{
      document_id: string
      chunk_index: number
      chunk_text: string
      chunk_vector: number[]
      page_number: number | null
      token_count: number
    }> = []

    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE)

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1

      console.log(`   Batch ${batchNum}/${totalBatches}...`)

      const embeddings = await Promise.all(
        batch.map(chunk => generateEmbedding(chunk.text))
      )

      batch.forEach((chunk, j) => {
        chunkRecords.push({
          document_id: document.id,
          chunk_index: i + j,
          chunk_text: chunk.text,
          chunk_vector: embeddings[j],
          page_number: null,
          token_count: chunk.tokenCount
        })
      })

      if (i + BATCH_SIZE < chunks.length) {
        await sleep(DELAY_BETWEEN_BATCHES)
      }
    }

    // ETAPE 5: Insert chunks
    const { error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .insert(chunkRecords)

    if (chunksError) {
      throw new Error(`Chunks insert failed: ${chunksError.message}`)
    }

    console.log(`   OK: ${chunkRecords.length} chunks inseres`)

    stats.totalDocuments++
    stats.totalChunks += chunkRecords.length
    stats.categoriesProcessed.add(category)

    return { success: true, chunks: chunkRecords.length, skipped: false }

  } catch (error) {
    console.error(`   ERREUR:`, error instanceof Error ? error.message : error)

    if (retryCount < RETRY_ATTEMPTS) {
      console.log(`   Retry ${retryCount + 1}/${RETRY_ATTEMPTS}...`)
      await sleep(RETRY_DELAY)
      return ingestDocument(doc, category, retryCount + 1)
    }

    stats.totalErrors++
    return { success: false, chunks: 0, skipped: false }
  }
}

/**
 * Main
 */
async function main() {
  console.log('=' .repeat(60))
  console.log('  INGESTION DES NOUVELLES CATEGORIES')
  console.log('=' .repeat(60))
  console.log('')
  console.log('Categories a ingerer:')

  let totalDocs = 0
  for (const cat of NEW_CATEGORIES) {
    const docs = REFERENCE_DOCS[cat]
    if (docs) {
      console.log(`  - ${cat}: ${docs.length} documents`)
      totalDocs += docs.length
    }
  }
  console.log(`\nTotal: ${totalDocs} documents a traiter`)
  console.log('')

  stats.startTime = Date.now()

  for (const category of NEW_CATEGORIES) {
    const docs = REFERENCE_DOCS[category]

    if (!docs) {
      console.warn(`Categorie ${category} non trouvee!`)
      continue
    }

    console.log('\n' + '-'.repeat(60))
    console.log(`CATEGORIE: ${category} (${docs.length} docs)`)
    console.log('-'.repeat(60))

    for (let i = 0; i < docs.length; i++) {
      console.log(`\n[${i + 1}/${docs.length}]`)
      await ingestDocument(docs[i], category)
    }
  }

  // Rapport
  const duration = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1)

  console.log('\n\n' + '='.repeat(60))
  console.log('  RAPPORT FINAL')
  console.log('='.repeat(60))
  console.log(`Documents ingeres: ${stats.totalDocuments}`)
  console.log(`Chunks crees: ${stats.totalChunks}`)
  console.log(`Documents ignores (deja presents): ${stats.skipped}`)
  console.log(`Erreurs: ${stats.totalErrors}`)
  console.log(`Duree: ${duration} minutes`)
  console.log(`Categories: ${Array.from(stats.categoriesProcessed).join(', ')}`)

  if (stats.totalErrors > 0) {
    console.warn(`\n${stats.totalErrors} erreurs rencontrees. Verifiez les logs.`)
  } else {
    console.log('\nIngestion terminee avec succes!')
  }

  console.log('\nProchaine etape: npm run ingest:verify')
}

main().catch(error => {
  console.error('ERREUR FATALE:', error)
  process.exit(1)
})
