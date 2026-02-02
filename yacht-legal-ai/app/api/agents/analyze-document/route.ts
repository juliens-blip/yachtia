/**
 * Agent Analyze Document API Endpoint
 * 
 * POST /api/agents/analyze-document
 * Headers: { "Authorization": "Bearer sk_live_..." }
 * Body: FormData with 'file' (PDF) and optional 'prompt' field
 * 
 * Returns: { analysis: string, metadata: {...}, responseTime: number }
 */

import { NextRequest } from 'next/server'
import { validateApiKey, isEndpointAllowed, checkRateLimit, logAgentUsage } from '@/lib/agent-auth'
import { generateAnswer } from '@/lib/gemini'
import { jsonWithCors, optionsWithCors } from '@/lib/cors'
import { extractTextFromPDF } from '@/lib/pdf-parser'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const endpoint = '/api/agents/analyze-document'

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

    // Parse FormData
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const prompt = formData.get('prompt') as string | null

    // Validation
    if (!file) {
      return jsonWithCors(
        { error: 'Missing file. Upload a PDF document.' },
        { status: 400 }
      )
    }

    // Check file type
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      return jsonWithCors(
        { error: 'Invalid file type. Only PDF files are supported.' },
        { status: 400 }
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return jsonWithCors(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 400 }
      )
    }

    // Read file content and extract text (P0 fix: use real PDF parsing)
    const buffer = Buffer.from(await file.arrayBuffer())

    let pdfText: string
    let pageCount = 0

    try {
      const pdfResult = await extractTextFromPDF(buffer)
      pdfText = pdfResult.text
      pageCount = pdfResult.pages || 0

      if (!pdfText || pdfText.trim().length < 50) {
        return jsonWithCors(
          { error: 'Unable to extract text from PDF. The document may be scanned or image-based.' },
          { status: 400 }
        )
      }
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError)
      return jsonWithCors(
        { error: 'Failed to parse PDF document. Please ensure it is a valid PDF file.' },
        { status: 400 }
      )
    }

    const metadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      pageCount,
      textLength: pdfText.length,
      uploadedAt: new Date().toISOString()
    }

    // Generate analysis using Gemini with actual PDF content
    const analysisPrompt = prompt || 'Analyze this legal document and provide a summary of key points, obligations, and potential risks.'

    // Limit text to ~100k chars to avoid token limits
    const truncatedText = pdfText.substring(0, 100000)

    const { answer: analysis } = await generateAnswer(
      analysisPrompt,
      [`Document: ${file.name}\n\nContent:\n${truncatedText}`],
      undefined
    )

    const responseTime = Date.now() - startTime

    // Log usage
    await logAgentUsage({
      credentialId: credential.id,
      endpoint,
      method: 'POST',
      query: `Analyze: ${file.name}`,
      responseTimeMs: responseTime,
      statusCode: 200,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined
    })

    // Return analysis
    return jsonWithCors({
      analysis,
      metadata,
      responseTime,
      agentName: credential.agentName
    })

  } catch (error: unknown) {
    console.error('Agent analyze document API error:', error)
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
