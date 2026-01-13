/**
 * Document Signed URL API Route
 *
 * POST /api/document-url
 * Body: { documentId: string, expiresInSeconds?: number }
 * Returns: { url: string, expiresInSeconds: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logDownloadAudit } from '@/lib/audit-logger'

const DEFAULT_EXPIRY = 600 // 10 minutes
const MIN_EXPIRY = 60
const MAX_EXPIRY = 3600

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { documentId, expiresInSeconds } = body || {}

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid documentId. Please provide a valid identifier.' },
        { status: 400 }
      )
    }

    const expiry = Math.min(Math.max(parseInt(expiresInSeconds ?? DEFAULT_EXPIRY, 10), MIN_EXPIRY), MAX_EXPIRY)

    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      return NextResponse.json(
        { error: 'Document not found.' },
        { status: 404 }
      )
    }

    const { data, error } = await supabaseAdmin
      .storage
      .from('documents')
      .createSignedUrl(doc.file_path, expiry)

    if (error || !data?.signedUrl) {
      console.error('Signed URL error:', error)
      return NextResponse.json(
        { error: 'Failed to generate signed URL.' },
        { status: 500 }
      )
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    await logDownloadAudit({
      documentId,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      url: data.signedUrl,
      expiresInSeconds: expiry
    })
  } catch (error: unknown) {
    console.error('Document URL error:', error)
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
