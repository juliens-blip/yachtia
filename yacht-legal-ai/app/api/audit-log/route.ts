/**
 * Audit Log API Route
 *
 * POST /api/audit-log
 * Body: { action: string, metadata?: object }
 * Returns: { success: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { logAudit, AuditAction } from '@/lib/audit-logger'

const ALLOWED_ACTIONS: AuditAction[] = [
  'upload',
  'view',
  'search',
  'delete',
  'chat',
  'download',
  'consent'
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, metadata } = body || {}

    if (!action || !ALLOWED_ACTIONS.includes(action as AuditAction)) {
      return NextResponse.json(
        { error: 'Invalid action.' },
        { status: 400 }
      )
    }

    await logAudit({
      action: action as AuditAction,
      metadata: typeof metadata === 'object' && metadata ? metadata : {}
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Audit log error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Failed to write audit log.',
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
