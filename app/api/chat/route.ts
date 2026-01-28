/**
 * Chat API Route with RAG
 *
 * POST /api/chat
 * Body: { message: string, conversationId?: string, category?: string }
 * Returns: { answer: string, conversationId: string, sources: [...] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { retrieveRelevantChunks, formatChunksForContext, getUniqueDocumentIds, RelevantChunk } from '@/lib/rag-pipeline'
import { generateAnswer } from '@/lib/gemini'
import { logChatAudit } from '@/lib/audit-logger'
import { supabaseAdmin } from '@/lib/supabase'
import { expandQuery, deduplicateChunks } from '@/lib/question-processor'
import { validateResponse } from '@/lib/response-validator'
import { countCitations, logMetricsDashboard, recordRagMetric } from '@/lib/metrics-logger'

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

    // Step 1: Expand query with variants and keywords
    const expanded = await expandQuery(message)
    console.log('[RAG] Query expansion:', {
      original: expanded.original,
      variants: expanded.variants.length,
      keywords: expanded.keywords.slice(0, 5)
    })

    // Step 2: Retrieve chunks with original + variants
    const allChunkResults = await Promise.all([
      retrieveRelevantChunks(expanded.original, category, 5, 0.7),
      ...expanded.variants.map(v => retrieveRelevantChunks(v, category, 3, 0.7))
    ])
    
    // Deduplicate and merge chunks
    const allChunks = allChunkResults.flat()
    const chunks = deduplicateChunks(
      allChunks.map(c => ({ ...c, id: c.chunkId }))
    ).slice(0, 8) as RelevantChunk[]
    
    console.log('[RAG] Chunks retrieved:', {
      total: allChunks.length,
      unique: chunks.length,
      topSimilarity: chunks[0]?.similarity || 0
    })

    // Step 3: Generate answer with Gemini + Grounding
    const context = formatChunksForContext(chunks)
    const contextMetadata = chunks.map(c => ({
      document_name: c.documentName,
      category: c.category,
      source_url: c.sourceUrl
    }))
    let answer: string = ''
    let geminiSources: Array<{ name: string; category: string; url?: string }> = []
    let groundingMetadata: Record<string, unknown> | undefined
    let fallbackUsed = false

    const buildFallbackAnswer = (reason: string) => {
    if (chunks.length === 0) {
      return `Je n'ai pas trouvé de documents pertinents pour répondre à cette question. Veuillez reformuler ou préciser votre demande.`
    }

    console.log(`[RAG] FALLBACK USED - Reason: ${reason}`)

    // Group chunks by document for a structured synthesis
      const docGroups = new Map<string, typeof chunks>()
      for (const chunk of chunks.slice(0, 8)) {
        const key = chunk.documentName
        if (!docGroups.has(key)) docGroups.set(key, [])
        docGroups.get(key)!.push(chunk)
      }

      // Build a structured answer organized by source document
      const sections: string[] = []
      for (const [docName, docChunks] of docGroups) {
        const category = docChunks[0].category
        const keyPoints = docChunks
          .slice(0, 3)
          .map(chunk => {
            const text = chunk.chunkText.replace(/\s+/g, ' ').trim()
            // Extract first meaningful sentence(s) instead of raw dump
            const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(0, 2)
            return sentences.length > 0
              ? `- ${sentences.map(s => s.trim()).join('. ')}.`
              : `- ${text.slice(0, 200).trim()}…`
          })
          .join('\n')

        const pageRefs = docChunks
          .filter(c => c.pageNumber)
          .map(c => `p.${c.pageNumber}`)
          .join(', ')

        sections.push(`### ${docName} (${category}${pageRefs ? `, ${pageRefs}` : ''})\n\n${keyPoints}`)
      }

      const allCitations = chunks
        .slice(0, 8)
        .map(chunk => `[Source: ${chunk.documentName}, page ${chunk.pageNumber ?? 'N/A'}]`)

      const uniqueCitations = [...new Set(allCitations)].join(' ')

      return `## Éléments de réponse\n\nD'après les documents internes analysés, voici les informations pertinentes concernant votre question :\n\n${sections.join('\n\n')}\n\n---\n\n${uniqueCitations}\n\n⚠️ *Réponse générée en mode simplifié (service temporairement surchargé). Pour une analyse complète et structurée, veuillez réessayer dans quelques instants.*\n\n⚖️ **Disclaimer**: Les informations fournies sont à titre informatif uniquement et ne constituent pas un avis juridique.`
    }

    let attempt = 0
    let questionForAttempt = message
    const maxAttempts = 3

    while (attempt < maxAttempts) {
      try {
        const result = await generateAnswer(questionForAttempt, context, undefined, contextMetadata)
        const validation = validateResponse(result.answer, chunks)

        answer = result.answer
        geminiSources = result.sources
        groundingMetadata = result.groundingMetadata

        if (validation.valid || attempt === maxAttempts - 1) {
          console.log(`[RAG] GEMINI ANSWER OK - attempt ${attempt + 1}/${maxAttempts}, valid=${validation.valid}, citations=${countCitations(answer)}`)
          break
        }

        console.log('[RAG] Response validation retry:', validation.issues)
        const retryInstruction = validation.retry || 'CITE AU MINIMUM 5 SOURCES DIFFÉRENTES'
        questionForAttempt = `${message}\n\nINSTRUCTIONS DE VALIDATION: ${retryInstruction}`
      } catch (error) {
        const status = (error as { status?: number })?.status
        const messageText = error instanceof Error ? error.message : String(error)
        const stack = error instanceof Error ? error.stack : undefined
        console.log('[RAG] GEMINI ERROR before fallback check', {
          attempt: attempt + 1,
          status,
          message: messageText,
          name: error instanceof Error ? error.name : typeof error,
          stack
        })
        const isRateLimit = status === 429 || messageText.includes('429') || messageText.includes('Resource exhausted')

        if (!isRateLimit) {
          throw error
        }

        const rateLimitReason = messageText.includes('429') ? 'Rate limit 429' : 'Resource exhausted'
        console.log(`[RAG] FALLBACK TRIGGERED after attempt ${attempt + 1}/${maxAttempts} - ${rateLimitReason}`)
        answer = buildFallbackAnswer(rateLimitReason)
        fallbackUsed = true
        break
      }

      attempt += 1
    }

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

    recordRagMetric({
      timestamp: new Date().toISOString(),
      query: message,
      latencyMs: responseTime,
      citations: countCitations(answer),
      fallbackUsed,
      docsUsed: getUniqueDocumentIds(chunks).length
    })

    if (process.env.RAG_METRICS_LOG === '1') {
      logMetricsDashboard()
    }

    // Step 5: Combine Gemini sources + web sources
    const formattedSources = geminiSources.map(s => ({
      documentName: s.name,
      category: s.category,
      url: s.url,
      similarity: 95 // High confidence for used sources
    }))

    const allSources = [...formattedSources, ...webSources]

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
