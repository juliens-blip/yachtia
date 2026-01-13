/**
 * Document Upload API Route
 *
 * POST /api/upload-doc (multipart/form-data)
 * FormData: { file: File, category: string, sourceUrl?: string }
 * Returns: { success: boolean, documentId: string, chunksCount: number, pages: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { extractTextFromPDF, isValidPDF } from '@/lib/pdf-parser'
import { chunkText } from '@/lib/chunker'
import { generateEmbedding } from '@/lib/gemini'
import { supabaseAdmin } from '@/lib/supabase'
import { logUploadAudit } from '@/lib/audit-logger'

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024 // 10MB
const VALID_CATEGORIES = ['MYBA', 'AML', 'MLC', 'PAVILION', 'INSURANCE', 'CREW', 'REGISTRATION', 'ENVIRONMENTAL', 'CORPORATE', 'CHARTER']

export async function POST(req: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as string
    const sourceUrl = formData.get('sourceUrl') as string | null

    // Validation: File required
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please upload a PDF file.' },
        { status: 400 }
      )
    }

    // Validation: Category required
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validation: File type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are allowed.' },
        { status: 400 }
      )
    }

    // Validation: File size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Validate PDF signature
    if (!isValidPDF(buffer)) {
      return NextResponse.json(
        { error: 'Invalid PDF file. File appears to be corrupted or not a valid PDF.' },
        { status: 400 }
      )
    }

    // Step 1: Upload to Supabase Storage
    const docId = uuidv4()
    const filePath = `documents/${docId}.pdf`

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('documents')
      .upload(filePath, buffer, { contentType: 'application/pdf' })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage.' },
        { status: 500 }
      )
    }

    // Step 2: Extract text from PDF
    const { text, pages, metadata } = await extractTextFromPDF(buffer)

    if (!text || text.trim().length === 0) {
      // Cleanup uploaded file
      await supabaseAdmin.storage.from('documents').remove([filePath])
      return NextResponse.json(
        { error: 'PDF appears to be empty or contains no extractable text.' },
        { status: 400 }
      )
    }

    // Step 3: Chunk text
    const chunks = chunkText(text)

    if (chunks.length === 0) {
      // Cleanup
      await supabaseAdmin.storage.from('documents').remove([filePath])
      return NextResponse.json(
        { error: 'Failed to chunk document text.' },
        { status: 500 }
      )
    }

    // Step 4: Generate embeddings and store chunks
    // Process in batches to avoid overwhelming Gemini API
    const BATCH_SIZE = 10
    const chunkBatches = []

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      chunkBatches.push(chunks.slice(i, i + BATCH_SIZE))
    }

    const allChunkData = []

    for (const batch of chunkBatches) {
      const batchEmbeddings = await Promise.all(
        batch.map(chunk => generateEmbedding(chunk.text))
      )

      const batchData = batch.map((chunk, idx) => ({
        document_id: docId,
        chunk_text: chunk.text,
        chunk_vector: batchEmbeddings[idx],
        chunk_index: chunk.index,
        token_count: chunk.tokenCount
      }))

      allChunkData.push(...batchData)
    }

    // Step 5: Store document metadata
    const { error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        id: docId,
        name: file.name,
        category,
        source_url: sourceUrl,
        file_path: filePath,
        metadata: {
          pages,
          file_size: file.size,
          ...metadata
        },
        is_public: true // Make public by default
      })

    if (docError) {
      console.error('Document insert error:', docError)
      // Cleanup storage
      await supabaseAdmin.storage.from('documents').remove([filePath])
      return NextResponse.json(
        { error: 'Failed to store document metadata.' },
        { status: 500 }
      )
    }

    // Step 6: Store chunks
    const { error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .insert(allChunkData)

    if (chunksError) {
      console.error('Chunks insert error:', chunksError)
      // Cleanup document and storage
      await supabaseAdmin.from('documents').delete().eq('id', docId)
      await supabaseAdmin.storage.from('documents').remove([filePath])
      return NextResponse.json(
        { error: 'Failed to store document chunks.' },
        { status: 500 }
      )
    }

    // Step 7: Audit log
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    await logUploadAudit({
      documentId: docId,
      filename: file.name,
      category,
      fileSize: file.size,
      pagesCount: pages,
      chunksCount: chunks.length,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined
    })

    // Step 8: Return success
    return NextResponse.json({
      success: true,
      documentId: docId,
      chunksCount: chunks.length,
      pages
    })

  } catch (error: unknown) {
    console.error('Upload API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Internal server error during upload.',
        details: process.env.NODE_ENV === 'development' ? message : undefined
      },
      { status: 500 }
    )
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
