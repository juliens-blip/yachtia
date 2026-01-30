/**
 * Test script: Ingest ONE document only to verify chunking + embedding pipeline
 * 
 * Purpose: Validate that:
 * 1. Document extraction works
 * 2. Chunking produces valid chunks
 * 3. Embeddings are generated (dim 768)
 * 4. Chunks are inserted into DB
 * 
 * Usage: npm run test:ingest:single
 */

// CRITICAL: Load env FIRST
import './load-env'

import { extractTextFromPDF } from '../lib/pdf-parser'
import { downloadPDF } from '../lib/web-scraper'
import { chunkText } from '../lib/chunker'
import { generateEmbedding } from '../lib/gemini'
import { supabaseAdmin } from '../lib/supabase'

const TEST_DOC = {
  name: 'CYC Code - Complete 2020/2025 Edition',
  url: 'https://www.yachtmca.com/wp-content/uploads/2020/09/CYC-Code-Complete-2020-Edition.pdf',
  type: 'pdf' as const,
  category: 'PAVILLON_MALTA'
}

async function main() {
  console.log('🧪 Test d\'ingestion d\'un seul document\n')
  console.log(`📄 Document: ${TEST_DOC.name}`)
  console.log(`🔗 URL: ${TEST_DOC.url}`)
  console.log(`📂 Catégorie: ${TEST_DOC.category}\n`)

  try {
    // ──────────────────────────────────────────────────────
    // STEP 1: Download PDF
    // ──────────────────────────────────────────────────────
    console.log('⬇️  Step 1/5: Downloading PDF...')
    const buffer = await downloadPDF(TEST_DOC.url)
    console.log(`   ✅ Downloaded ${(buffer.length / 1024).toFixed(1)} KB\n`)

    // ──────────────────────────────────────────────────────
    // STEP 2: Extract text
    // ──────────────────────────────────────────────────────
    console.log('📖 Step 2/5: Extracting text from PDF...')
    const parsed = await extractTextFromPDF(buffer)
    const text = parsed.text.replace(/\u0000/g, '').replace(/[\uD800-\uDFFF]/g, '')
    console.log(`   ✅ Extracted ${parsed.pages} pages`)
    console.log(`   ✅ Text length: ${text.length} characters\n`)

    // ──────────────────────────────────────────────────────
    // STEP 3: Chunk text
    // ──────────────────────────────────────────────────────
    console.log('✂️  Step 3/5: Chunking text...')
    const chunks = chunkText(text, 500, 200)
    console.log(`   ✅ Created ${chunks.length} chunks`)
    
    if (chunks.length > 0) {
      console.log(`   📊 First chunk:`)
      console.log(`      - Index: ${chunks[0].index}`)
      console.log(`      - Token count: ${chunks[0].tokenCount}`)
      console.log(`      - Section: ${chunks[0].metadata.section}`)
      console.log(`      - Headers: ${chunks[0].metadata.headers.join(', ')}`)
      console.log(`      - Preview: "${chunks[0].text.slice(0, 100)}..."\n`)
    }

    // ──────────────────────────────────────────────────────
    // STEP 4: Generate embeddings (test on first 3 chunks only)
    // ──────────────────────────────────────────────────────
    console.log('🧮 Step 4/5: Generating embeddings (first 3 chunks)...')
    const testChunks = chunks.slice(0, 3)
    
    const embeddings = await Promise.all(
      testChunks.map(chunk => generateEmbedding(chunk.text))
    )
    
    console.log(`   ✅ Generated ${embeddings.length} embeddings`)
    embeddings.forEach((emb, i) => {
      console.log(`      - Embedding ${i}: dim=${emb.length}, first 5 values=[${emb.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`)
    })
    console.log()

    // ──────────────────────────────────────────────────────
    // STEP 5: Insert into DB (test with first 3 chunks)
    // ──────────────────────────────────────────────────────
    console.log('💾 Step 5/5: Inserting into database...')
    
    // First, insert document
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        name: `[TEST] ${TEST_DOC.name}`,
        category: TEST_DOC.category,
        pages: parsed.pages,
        file_url: TEST_DOC.url,
        source_url: TEST_DOC.url,
        is_public: true,
        metadata: {
          source: TEST_DOC.url,
          type: TEST_DOC.type,
          language: 'en',
          ingested_at: new Date().toISOString(),
          test_run: true
        }
      })
      .select('id')
      .single()

    if (docError || !document) {
      throw new Error(`Failed to insert document: ${docError?.message || 'Unknown error'}`)
    }

    console.log(`   ✅ Document inserted with ID: ${document.id}`)

    // Then, insert chunks
    const chunkRecords = testChunks.map((chunk, i) => ({
      document_id: document.id,
      chunk_index: i,
      chunk_text: chunk.text,
      chunk_vector: embeddings[i],
      page_number: chunk.metadata.page,
      token_count: chunk.tokenCount
    }))

    const { error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .insert(chunkRecords)

    if (chunksError) {
      throw new Error(`Failed to insert chunks: ${chunksError.message}`)
    }

    console.log(`   ✅ ${chunkRecords.length} chunks inserted into database\n`)

    // ──────────────────────────────────────────────────────
    // VERIFICATION
    // ──────────────────────────────────────────────────────
    console.log('🔍 Verification...')
    
    const { count, error: countError } = await supabaseAdmin
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', document.id)

    if (!countError) {
      console.log(`   ✅ Confirmed: ${count} chunks in database for this document\n`)
    }

    console.log('✅ TEST COMPLETED SUCCESSFULLY\n')
    console.log('📋 Summary:')
    console.log(`   - Document pages: ${parsed.pages}`)
    console.log(`   - Text extracted: ${text.length} chars`)
    console.log(`   - Total chunks created: ${chunks.length}`)
    console.log(`   - Test chunks inserted: ${testChunks.length}`)
    console.log(`   - Embedding dimension: ${embeddings[0]?.length}`)
    console.log('\n💡 Next step: Run full ingestion with `npm run ingest:all`\n')

    process.exit(0)

  } catch (error) {
    console.error('\n❌ TEST FAILED\n')
    console.error(error)
    process.exit(1)
  }
}

main()
