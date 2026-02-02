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
import { deduplicateChunks, expandQueryMultiAspect, type ExpandedQueryMultiAspect, type ExpandedQuery } from '@/lib/question-processor'
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

    // Step 1: Expand query (multi-aspect or simple)
    const expanded = await expandQueryMultiAspect(message)
    const isMultiAspect = 'aspects' in expanded && expanded.aspects.length >= 2
    
    console.log('[RAG] Query expansion:', isMultiAspect ? {
      original: expanded.original,
      multiAspect: true,
      aspects: (expanded as ExpandedQueryMultiAspect).aspects.map(a => a.name)
    } : {
      original: expanded.original,
      multiAspect: false,
      variants: (expanded as ExpandedQuery).variants.length
    })

    // Step 2: Retrieve chunks (multi-aspect or simple)
    let chunks: RelevantChunk[]
    const aspectStats: Record<string, { count: number; docs: Set<string> }> = {}
    
    if (isMultiAspect) {
      const multiExpanded = expanded as ExpandedQueryMultiAspect
      
      // Retrieve 5 chunks per aspect with lower threshold (0.55)
      const aspectResults = await Promise.all(
        multiExpanded.queries.map(async ({ aspect, query }) => {
          const aspectChunks = await retrieveRelevantChunks(query, category, 5, 0.55)
          return { aspect, chunks: aspectChunks }
        })
      )
      
      // Deduplicate + round-robin: max 2 chunks/doc, balance aspects
      const chunksByDoc = new Map<string, RelevantChunk[]>()
      const chunksByAspect = new Map<string, RelevantChunk[]>()
      
      for (const { aspect, chunks: aspectChunks } of aspectResults) {
        chunksByAspect.set(aspect, aspectChunks)
        aspectStats[aspect] = { count: 0, docs: new Set() }
        
        for (const chunk of aspectChunks) {
          const docChunks = chunksByDoc.get(chunk.documentName) || []
          chunksByDoc.set(chunk.documentName, [...docChunks, chunk])
        }
      }
      
      // Round-robin selection: max 2 chunks/doc, strict balance
      const selected: RelevantChunk[] = []
      const selectedIds = new Set<string>()
      const aspectCounts = new Map<string, number>()
      
      for (const aspect of multiExpanded.aspects.map(a => a.name)) {
        aspectCounts.set(aspect, 0)
      }
      
      // Target chunks per aspect (15 total / N aspects)
      const targetPerAspect = Math.ceil(15 / multiExpanded.aspects.length)
      
      // First pass: fill each aspect to target
      for (const { aspect, chunks: aspectChunks } of aspectResults) {
        for (const chunk of aspectChunks) {
          const currentCount = aspectCounts.get(aspect) || 0
          if (currentCount >= targetPerAspect) break
          if (selectedIds.has(chunk.chunkId)) continue
          const docChunks = selected.filter(c => c.documentName === chunk.documentName)
          if (docChunks.length >= 2) continue
          
          selected.push(chunk)
          selectedIds.add(chunk.chunkId)
          aspectCounts.set(aspect, currentCount + 1)
          aspectStats[aspect].count++
          aspectStats[aspect].docs.add(chunk.documentName)
        }
      }
      
      // Second pass: fill remaining slots (max 15 total)
      for (const { aspect, chunks: aspectChunks } of aspectResults) {
        for (const chunk of aspectChunks) {
          if (selected.length >= 15) break
          if (selectedIds.has(chunk.chunkId)) continue
          const docChunks = selected.filter(c => c.documentName === chunk.documentName)
          if (docChunks.length >= 2) continue
          
          selected.push(chunk)
          selectedIds.add(chunk.chunkId)
          aspectCounts.set(aspect, (aspectCounts.get(aspect) || 0) + 1)
          aspectStats[aspect].count++
          aspectStats[aspect].docs.add(chunk.documentName)
        }
      }
      
      chunks = selected
      
      const uniqueDocs = new Set(chunks.map(c => c.documentName)).size
      console.log('[RAG] Multi-aspect retrieval:', {
        totalChunks: chunks.length,
        uniqueDocs,
        byAspect: Object.fromEntries(
          Object.entries(aspectStats).map(([aspect, stats]) => 
            [aspect, { chunks: stats.count, docs: stats.docs.size }]
          )
        )
      })
    } else {
      // Simple expansion fallback
      const simpleExpanded = expanded as ExpandedQuery
      const allChunkResults = await Promise.all([
        retrieveRelevantChunks(simpleExpanded.original, category, 5, 0.7),
        ...simpleExpanded.variants.map(v => retrieveRelevantChunks(v, category, 3, 0.7))
      ])
      
      const allChunks = allChunkResults.flat()
      chunks = deduplicateChunks(
        allChunks.map(c => ({ ...c, id: c.chunkId }))
      ).slice(0, 8) as RelevantChunk[]
      
      console.log('[RAG] Simple retrieval:', {
        total: allChunks.length,
        unique: chunks.length,
        topSimilarity: chunks[0]?.similarity || 0
      })
    }

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

    const buildFallbackAnswer = (reason: string, details?: { attempts?: number; chunks_count?: number; error?: string }) => {
    if (chunks.length === 0) {
      return `Je n'ai pas trouvé de documents pertinents pour répondre à cette question. Veuillez reformuler ou préciser votre demande.`
    }

    const uniqueDocs = new Set(chunks.map(c => c.documentName)).size
    console.log(`[RAG] FALLBACK USED`, {
      reason,
      gemini_attempts: details?.attempts || 0,
      chunks_count: details?.chunks_count || chunks.length,
      unique_docs: uniqueDocs,
      error_message: details?.error || 'N/A'
    })

    // Synthesize top 3 chunks instead of single snippet
    const topChunks = chunks.slice(0, 3)
    const synthesis = topChunks.map((chunk, idx) => {
      const text = chunk.chunkText.replace(/\s+/g, ' ').trim()
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(0, 2)
      const preview = sentences.length > 0 ? sentences.map(s => s.trim()).join('. ') : text.slice(0, 200)
      return `**${idx + 1}. ${chunk.documentName}** (p.${chunk.pageNumber ?? 'N/A'}):\n${preview}…`
    }).join('\n\n')

    const allCitations = topChunks.map(chunk => `[Source: ${chunk.documentName}, page ${chunk.pageNumber ?? 'N/A'}]`)
    const uniqueCitations = [...new Set(allCitations)].join(' ')

    return `## Éléments de réponse\n\nD'après les documents internes analysés, voici les informations pertinentes :\n\n${synthesis}\n\n---\n\n${uniqueCitations}\n\n⚠️ *Réponse générée en mode simplifié (service temporairement surchargé). Pour une analyse complète et structurée, veuillez réessayer dans quelques instants.*\n\n⚖️ **Disclaimer**: Les informations fournies sont à titre informatif uniquement et ne constituent pas un avis juridique.`
    }

    let attempt = 0
    let questionForAttempt = message
    const maxAttempts = 1

    while (attempt < maxAttempts) {
      try {
        const result = await generateAnswer(questionForAttempt, context, undefined, contextMetadata)
        const validation = validateResponse(result.answer, chunks)

        answer = result.answer
        geminiSources = result.sources
        groundingMetadata = result.groundingMetadata

        if (validation.valid || attempt === maxAttempts - 1) {
          console.log(`[RAG] GEMINI ANSWER OK - attempt ${attempt + 1}/${maxAttempts}, valid=${validation.valid}, citations=${countCitations(answer)}`)
          
          if (!validation.valid && attempt === maxAttempts - 1) {
            const localCitations = chunks.slice(0,3).map(c => `[Source: ${c.documentName}, page ${c.pageNumber ?? 'N/A'}]`).join(', ')
            answer += `\n\n**Sources:** ${localCitations}`
          }
          
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
        answer = buildFallbackAnswer(rateLimitReason, {
          attempts: attempt + 1,
          chunks_count: chunks.length,
          error: messageText
        })
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
