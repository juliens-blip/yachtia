/**
 * Sources API Route
 * GET /api/sources
 * Returns all documents in the database grouped by category
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getSupabaseProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    const host = new URL(url).host
    const ref = host.split('.')[0]
    return ref || null
  } catch {
    return null
  }
}

function getSupabaseUrlHost() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    // Build query
    let query = supabaseAdmin
      .from('documents')
      .select('id, name, category, pages, source_url, file_url, created_at')
      .eq('is_public', true)
      .order('category')
      .order('name')

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category)
    }

    const { data: documents, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    // Group by category
    const grouped: Record<string, typeof documents> = {}
    documents?.forEach(doc => {
      if (!grouped[doc.category]) {
        grouped[doc.category] = []
      }
      grouped[doc.category].push(doc)
    })

    // Calculate stats
    const stats = {
      totalDocuments: documents?.length || 0,
      totalCategories: Object.keys(grouped).length,
      byCategory: Object.fromEntries(
        Object.entries(grouped).map(([cat, docs]) => [cat, docs.length])
      )
    }

    return NextResponse.json(
      {
        documents: grouped,
        stats,
        supabaseProjectRef: getSupabaseProjectRef(),
        supabaseUrlHost: getSupabaseUrlHost(),
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    )

  } catch (error: unknown) {
    console.error('Sources API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to fetch sources',
        details: process.env.NODE_ENV === 'development' ? message : undefined
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    )
  }
}
