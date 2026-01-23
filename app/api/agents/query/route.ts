/**
 * Agent Query API Endpoint
 * 
 * POST /api/agents/query
 * Headers: { "Authorization": "Bearer sk_live_..." }
 * Body: { query: string, category?: string, maxSources?: number }
 * 
 * Returns: { answer: string, sources: [...], responseTime: number }
 */

import { NextRequest } from 'next/server'
import { validateApiKey, isEndpointAllowed, checkRateLimit, logAgentUsage } from '@/lib/agent-auth'
import { retrieveRelevantChunks, formatChunksForContext } from '@/lib/rag-pipeline'
import { generateAnswer } from '@/lib/gemini'
import { jsonWithCors, optionsWithCors } from '@/lib/cors'

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const endpoint = '/api/agents/query'

  try {
    // Extract Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonWithCors(
        { error: 'Missing or invalid Authorization header. Use: Bearer sk_live_...' },
        { status: 401 }
      )
    }

    const apiKey = authHeader.replace('Bearer ', '')

    // Validate API key
    const authResult = await validateApiKey(apiKey)
    if (!authResult.success || !authResult.credential) {
      // Note: Skip logging for failed auth - no valid credential_id
      // to avoid FK violation in agent_api_usage table

      return jsonWithCors(
        { error: authResult.error || 'Authentication failed' },
        { status: 401 }
      )
    }

    const credential = authResult.credential

    // Check endpoint permission
    if (!isEndpointAllowed(credential, endpoint)) {
      await logAgentUsage({
        credentialId: credential.id,
        endpoint,
        method: 'POST',
        responseTimeMs: Date.now() - startTime,
        statusCode: 403,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined
      })

      return jsonWithCors(
        { error: 'Endpoint not allowed for this API key' },
        { status: 403 }
      )
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(credential.id, credential.maxRequestsPerDay)
    if (rateLimitResult.error) {
      // Infrastructure error - return 500 instead of false 429
      return jsonWithCors(
        { error: 'Rate limit check failed. Please try again.' },
        { status: 500 }
      )
    }
    if (!rateLimitResult.allowed) {
      await logAgentUsage({
        credentialId: credential.id,
        endpoint,
        method: 'POST',
        responseTimeMs: Date.now() - startTime,
        statusCode: 429,
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined
      })

      return jsonWithCors(
        { error: `Rate limit exceeded. Maximum ${credential.maxRequestsPerDay} requests per day.` },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { query, category, maxSources = 5 } = body

    // Validation
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return jsonWithCors(
        { error: 'Invalid query. Provide a non-empty string.' },
        { status: 400 }
      )
    }

    if (query.length > 2000) {
      return jsonWithCors(
        { error: 'Query too long. Maximum 2000 characters.' },
        { status: 400 }
      )
    }

    // Validate maxSources (P2 fix)
    const validMaxSources = Math.min(Math.max(1, Number(maxSources) || 5), 20)
    if (category && typeof category !== 'string') {
      return jsonWithCors(
        { error: 'Invalid category. Must be a string.' },
        { status: 400 }
      )
    }

    // Retrieve relevant chunks
    const chunks = await retrieveRelevantChunks(query, category, validMaxSources, 0.7)

    // Generate answer with grounding
    const context = formatChunksForContext(chunks)
    let answer: string
    let groundingMetadata: Record<string, unknown> | undefined

    try {
      const result = await generateAnswer(query, context, undefined)
      answer = result.answer
      groundingMetadata = result.groundingMetadata
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error)
      const isRateLimit = messageText.includes('429') || messageText.includes('Resource exhausted')
      if (!isRateLimit) {
        throw error
      }

      const fallbackCitations = chunks
        .slice(0, 3)
        .map(chunk => `[Source: ${chunk.documentName}, page ${chunk.pageNumber ?? 'N/A'}]`)
        .join(' ')

      const fallbackSummary = chunks
        .slice(0, 3)
        .map((chunk, index) => {
          const preview = chunk.chunkText.replace(/\s+/g, ' ').slice(0, 220)
          return `${index + 1}. ${preview}...`
        })
        .join('\n')

      answer = `Résumé basé sur les documents internes disponibles:\n\n${fallbackSummary}\n\nSources: ${fallbackCitations}`
    }

    // Extract web sources from groundingChunks (P1 fix - was using webSearchQueries)
    interface GroundingChunk {
      web?: { title?: string; uri?: string }
      retrievedContext?: { title?: string; uri?: string }
    }
    const webSources = (groundingMetadata?.groundingChunks as GroundingChunk[] | undefined)?.map((chunk, idx) => ({
      title: chunk.web?.title || chunk.retrievedContext?.title || 'Source web',
      url: chunk.web?.uri || chunk.retrievedContext?.uri || '#',
      category: 'WEB_SEARCH',
      similarity: 95 - (idx * 5)
    })) || []

    // Combine sources
    const internalSources = chunks.map(c => ({
      documentName: c.documentName,
      category: c.category,
      similarity: Math.round(c.similarity * 100),
      pageNumber: c.pageNumber
    }))

    const allSources = [...internalSources, ...webSources]

    const responseTime = Date.now() - startTime

    // Log usage
    await logAgentUsage({
      credentialId: credential.id,
      endpoint,
      method: 'POST',
      query: query.substring(0, 200),
      responseTimeMs: responseTime,
      statusCode: 200,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined
    })

    // Return response with CORS headers
    return jsonWithCors({
      answer,
      sources: allSources,
      groundingUsed: webSources.length > 0,
      responseTime,
      metadata: {
        agentName: credential.agentName,
        chunksUsed: chunks.length,
        totalSources: allSources.length
      }
    })

  } catch (error: unknown) {
    console.error('Agent query API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'

    return jsonWithCors(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? message : undefined
      },
      { status: 500 }
    )
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return optionsWithCors()
}
