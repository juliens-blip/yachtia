/**
 * Agent Search API Endpoint
 * 
 * POST /api/agents/search
 * Headers: { "Authorization": "Bearer sk_live_..." }
 * Body: { query: string, category?: string, limit?: number, threshold?: number }
 * 
 * Returns: { chunks: [...], totalFound: number, responseTime: number }
 */

import { NextRequest } from 'next/server'
import { validateApiKey, isEndpointAllowed, checkRateLimit, logAgentUsage } from '@/lib/agent-auth'
import { retrieveRelevantChunks } from '@/lib/rag-pipeline'
import { jsonWithCors, optionsWithCors } from '@/lib/cors'

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const endpoint = '/api/agents/search'

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
    const { 
      query, 
      category, 
      limit = 10, 
      threshold = 0.7 
    } = body

    // Validation
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return jsonWithCors(
        { error: 'Invalid query. Provide a non-empty string.' },
        { status: 400 }
      )
    }

    if (limit > 50) {
      return jsonWithCors(
        { error: 'Limit too high. Maximum 50 chunks.' },
        { status: 400 }
      )
    }

    // Retrieve relevant chunks (no answer generation)
    const chunks = await retrieveRelevantChunks(query, category, limit, threshold)

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

    // Return chunks with metadata (P2 TypeScript fix: use correct property names)
    return jsonWithCors({
      chunks: chunks.map(c => ({
        id: c.chunkId,
        content: c.chunkText,
        documentName: c.documentName,
        category: c.category,
        similarity: c.similarity,
        pageNumber: c.pageNumber,
        documentId: c.documentId
      })),
      totalFound: chunks.length,
      responseTime,
      metadata: {
        agentName: credential.agentName,
        threshold,
        limit
      }
    })

  } catch (error: unknown) {
    console.error('Agent search API error:', error)
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
