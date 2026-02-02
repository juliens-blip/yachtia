/**
 * Search API Route (Vector Search)
 *
 * POST /api/search
 * Body: { query: string, category?: string, topK?: number, threshold?: number }
 * Returns: { results: [...], count: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { retrieveRelevantChunks } from '@/lib/rag-pipeline'
import { logSearchAudit } from '@/lib/audit-logger'

const MAX_TOP_K = 20
const MIN_THRESHOLD = 0.1
const MAX_THRESHOLD = 0.95

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, category, topK, threshold } = body || {}

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid query. Please provide a non-empty string.' },
        { status: 400 }
      )
    }

    const safeTopK = Math.min(Math.max(parseInt(topK ?? 5, 10), 1), MAX_TOP_K)
    const safeThresholdRaw = typeof threshold === 'number' ? threshold : 0.7
    const safeThreshold = Math.min(Math.max(safeThresholdRaw, MIN_THRESHOLD), MAX_THRESHOLD)

    const chunks = await retrieveRelevantChunks(query, category, safeTopK, safeThreshold)

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    await logSearchAudit({
      query,
      category,
      resultsCount: chunks.length,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      results: chunks.map(chunk => ({
        chunkId: chunk.chunkId,
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        category: chunk.category,
        similarity: Math.round(chunk.similarity * 100),
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex
      })),
      count: chunks.length
    })
  } catch (error: unknown) {
    console.error('Search API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Internal server error. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? message : undefined
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
