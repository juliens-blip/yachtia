/**
 * Chat API Route with RAG
 *
 * POST /api/chat
 * Body: { message: string, conversationId?: string, category?: string }
 * Returns: { answer: string, conversationId: string, sources: [...] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { retrieveRelevantChunks, formatChunksForContext, getUniqueDocumentIds } from '@/lib/rag-pipeline'
import { generateAnswer } from '@/lib/gemini'
import { logChatAudit } from '@/lib/audit-logger'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_REQUESTS_PER_MINUTE = parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '10')

// Simple in-memory rate limiting (production: use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 }) // 1 minute
    return true
  }

  if (record.count >= MAX_REQUESTS_PER_MINUTE) {
    return false
  }

  record.count++
  return true
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 10 requests per minute.' },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { message, conversationId, category } = body

    // Validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid message. Please provide a non-empty string.' },
        { status: 400 }
      )
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 2000 characters.' },
        { status: 400 }
      )
    }

    // Step 1: Retrieve relevant chunks via RAG
    const chunks = await retrieveRelevantChunks(message, category, 5, 0.7)

    // Step 2: Generate answer with Gemini + Grounding
    const context = formatChunksForContext(chunks)
    const { answer, groundingMetadata } = await generateAnswer(message, context, undefined)

    // Extract web sources from grounding metadata
    const webSources = (groundingMetadata?.webSearchQueries as Array<{ searchQuery?: string; url?: string }> | undefined)?.map((query, idx: number) => ({
      title: query.searchQuery || 'Recherche web',
      url: query.url || '#',
      category: 'WEB_SEARCH',
      similarity: 95 - (idx * 5) // Simulated relevance
    })) || []

    // Step 3: Store or update conversation
    let convId = conversationId

    if (!convId) {
      // Create new conversation
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .insert({
          messages: [
            { role: 'user', content: message, timestamp: new Date().toISOString() },
            { role: 'assistant', content: answer, timestamp: new Date().toISOString() }
          ],
          document_ids: getUniqueDocumentIds(chunks),
          title: message.substring(0, 100) // First 100 chars as title
        })
        .select('id')
        .single()

      if (!error && data) {
        convId = data.id
      }
    } else {
      // Update existing conversation
      const { data: existingConv } = await supabaseAdmin
        .from('conversations')
        .select('messages, document_ids')
        .eq('id', conversationId)
        .single()

      if (existingConv) {
        const updatedMessages = [
          ...existingConv.messages,
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: answer, timestamp: new Date().toISOString() }
        ]

        const updatedDocIds = Array.from(new Set([
          ...(existingConv.document_ids || []),
          ...getUniqueDocumentIds(chunks)
        ]))

        await supabaseAdmin
          .from('conversations')
          .update({
            messages: updatedMessages,
            document_ids: updatedDocIds,
            last_message_at: new Date().toISOString()
          })
          .eq('id', conversationId)
      }
    }

    // Step 4: Audit log
    const responseTime = Date.now() - startTime
    await logChatAudit({
      conversationId: convId,
      query: message,
      chunksUsed: chunks.length,
      responseTime,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined
    })

    // Step 5: Combine internal docs + web sources
    const internalSources = chunks.map(c => ({
      documentName: c.documentName,
      category: c.category,
      similarity: Math.round(c.similarity * 100),
      pageNumber: c.pageNumber
    }))

    const allSources = [...internalSources, ...webSources]

    // Step 6: Return response
    return NextResponse.json({
      answer,
      conversationId: convId,
      sources: allSources,
      groundingUsed: webSources.length > 0,
      responseTime
    })

  } catch (error: unknown) {
    console.error('Chat API error:', error)
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

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
