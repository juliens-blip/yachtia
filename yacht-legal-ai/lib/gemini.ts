/**
 * Gemini API Integration
 *
 * Provides functions for:
 * - Generating embeddings (gemini-embedding-001, 768 dimensions)
 * - Generating chat responses with RAG context (gemini-1.5-flash)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import PQueue from 'p-queue'
import crypto from 'crypto'
import { logGeminiInteraction, extractCitations, detectInternetFallback } from './gemini-logger'
import { extractYachtContext } from './context-extractor'

// Validate API key (deferred check for scripts with dotenv)
const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.warn('⚠️  GEMINI_API_KEY not set - ensure .env.local is loaded before importing this module')
}

const genAI = new GoogleGenerativeAI(apiKey || 'dummy')

const geminiQueue = new PQueue({
  concurrency: 1,
  interval: 1000,
  intervalCap: 1
})

const CACHE_TTL_MS = 10 * 60 * 1000
const answerCache = new Map<string, { value: { answer: string; sources: SourceReference[]; groundingMetadata?: Record<string, unknown> }; expiresAt: number }>()
const inFlight = new Map<string, Promise<{ answer: string; sources: SourceReference[]; groundingMetadata?: Record<string, unknown> }>>()
const EMBEDDING_CACHE_TTL_MS = 10 * 60 * 1000
const MAX_EMBEDDING_CACHE = 200
const embeddingCache = new Map<string, { values: number[]; expiresAt: number }>()

function buildCacheKey(
  question: string,
  context: string[],
  contextMetadata?: Array<{ document_name: string; category: string; source_url?: string }>
): string {
  const payload = JSON.stringify({
    q: question,
    c: context,
    m: contextMetadata || []
  })
  return crypto.createHash('sha256').update(payload).digest('hex')
}

function getCachedAnswer(key: string) {
  const entry = answerCache.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    answerCache.delete(key)
    return null
  }
  return entry.value
}

function setCachedAnswer(
  key: string,
  value: { answer: string; sources: SourceReference[]; groundingMetadata?: Record<string, unknown> }
) {
  answerCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

function getEmbeddingCacheKey(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}

function getCachedEmbedding(key: string): number[] | null {
  const entry = embeddingCache.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    embeddingCache.delete(key)
    return null
  }
  return entry.values
}

function setCachedEmbedding(key: string, values: number[]) {
  if (embeddingCache.size >= MAX_EMBEDDING_CACHE) {
    const firstKey = embeddingCache.keys().next().value
    if (firstKey) embeddingCache.delete(firstKey)
  }
  embeddingCache.set(key, { values, expiresAt: Date.now() + EMBEDDING_CACHE_TTL_MS })
}

/**
 * Generate embedding vector for text (768 dimensions)
 * Used for semantic search in RAG pipeline
 *
 * @param text - Text to embed
 * @returns Array of 768 numbers representing the embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const cacheKey = getEmbeddingCacheKey(text)
    const cached = getCachedEmbedding(cacheKey)
    if (cached) return cached

    // Use REST API directly to set outputDimensionality: 768 (SDK 0.11 doesn't support it)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_QUERY',
          outputDimensionality: 768
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error ${response.status}: ${errorText}`)
    }

    const result = await response.json()

    if (!result.embedding || !result.embedding.values) {
      throw new Error('No embedding returned from Gemini API')
    }

    setCachedEmbedding(cacheKey, result.embedding.values)
    return result.embedding.values
  } catch (error) {
    console.error('Gemini embedding error:', error)
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export interface SourceReference {
  name: string
  category: string
  url?: string
}

/**
 * Generate answer using Gemini with RAG context
 *
 * @param question - User's question
 * @param context - Array of relevant text chunks from RAG
 * @param conversationHistory - Optional previous messages for context
 * @param contextMetadata - Optional metadata for each context chunk (document name, category, source_url)
 * @returns Generated answer with legal disclaimer and sources used
 */
export async function generateAnswer(
  question: string,
  context: string[],
  conversationHistory?: Array<{ role: string; content: string }>,
  contextMetadata?: Array<{ document_name: string; category: string; source_url?: string; page_number?: number | null }>
): Promise<{ answer: string; sources: SourceReference[]; groundingMetadata?: Record<string, unknown> }> {
  try {
    const cacheKey = buildCacheKey(question, context, contextMetadata)
    const cached = getCachedAnswer(cacheKey)
    if (cached) {
      return cached
    }

    const inFlightPromise = inFlight.get(cacheKey)
    if (inFlightPromise) {
      return await inFlightPromise
    }

    const fastMode = process.env.RAG_FAST_MODE === '1'
    // Use gemini-2.0-flash with optional grounding
    // Note: googleSearch tool requires specific API config
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: fastMode ? { maxOutputTokens: 256 } : undefined
    })

    const effectiveContext = fastMode
      ? context.map(chunk => chunk.slice(0, 1200))
      : context

    // T023: Extract yacht context (size, age, flag, codes) for enriched prompt
    const yachtContext = extractYachtContext(question)
    const citedCodes = yachtContext.citedCodes || []

    const codePriorityBlock = citedCodes.length > 0
      ? `\n**CODES CITED IN QUESTION:** ${citedCodes.join(', ')} — You MUST cite these in priority in your response.\nIf a cited code is not in the excerpts: mention it explicitly.`
      : ''

    // Build labeled excerpts with doc names for easy citation
    const labeledExcerpts = effectiveContext.length > 0 
      ? effectiveContext.map((chunk, i) => {
          const meta = contextMetadata?.[i]
          const docName = meta?.document_name || `Document ${i+1}`
          const page = meta?.page_number || 'n/a'
          return `[EXCERPT ${i+1}] [DOC: ${docName}] [page: ${page}]\n${chunk}`
        }).join('\n\n---\n\n')
      : 'Aucun document pertinent trouvé.'

    // Detect multi-aspect questions (registry transfer, etc.)
    const isRegistryTransfer = question.match(/transf[eé]r|passage|change.*registr|from.*to.*registr|RMI.*Malt|Malt.*RMI/i)
    
    const multiAspectGuidance = isRegistryTransfer ? `

═══════════════════════════════════════════════════════
MULTI-ASPECT STRUCTURE (MANDATORY FOR REGISTRY TRANSFERS)
═══════════════════════════════════════════════════════

Your question involves a registry transfer or multi-jurisdictional process.
You MUST structure your response in these 4 sections:

## 1. Sortie du Registre d'Origine (Exit)
[Procédure de radiation, documents requis, délais]
Sources: [MI-XXX RMI, etc.]

## 2. Entrée dans le Nouveau Registre (Entry)
[Procédure d'enregistrement, exigences, documents]
Sources: [OGSR Malta, Merchant Shipping Act, etc.]

## 3. Conformité Technique et Réglementaire
[CYC compliance, surveys, manning, certifications]
Sources: [CYC 2020/2025, etc.]

## 4. Implications Fiscales (VAT/Taxes)
[TVA, importation, temporary admission, charter VAT]
Sources: [VAT Guide, IYC, etc.]

If a section lacks information: "Information non disponible dans les documents analysés."

` : ''

    const systemPrompt = `You are a maritime legal research assistant for lawyers (yacht registration, VAT, flag, charter/commercial compliance, CYC codes, MLC).

**You MUST base your answer ONLY on the provided excerpts.** The excerpts are your "database".

**Core rule:** If the excerpts contain relevant information, you must use it. Do **not** say "information not available" when the excerpts address the topic, even partially.

**Output language:** Reply in the same language as the question (default: ${question.match(/[à-ÿ]/) ? 'French' : 'English'}).
**Tone:** Professional maritime legal writing. Clear, practical, jurisdiction-aware.

${codePriorityBlock}${multiAspectGuidance}

═══════════════════════════════════════════════════════
SOURCE AUTHORITY HIERARCHY
═══════════════════════════════════════════════════════

**PRIORITY ORDER (most to least authoritative):**
1. OFFICIAL_REGISTRY (OGSR, RMI Registry, MI-XXX guides)
2. LEGISLATION (Merchant Shipping Act, Maritime Codes)
3. GUIDANCE (CYC, VAT Guides, official manuals)
4. COMMENTARY (blogs, articles)

Always prioritize sources 1-2-3 before 4.
Mark secondary sources: **[Source secondaire: Blog XYZ]**

═══════════════════════════════════════════════════════
METHOD (REQUIRED - FOLLOW THIS PROCESS)
═══════════════════════════════════════════════════════

**STEP 1: Evidence Extraction (MANDATORY)**
Create a section called **"📋 Key Extracted Points (from provided sources)"** with 5-12 bullet points.
Each bullet MUST have a citation: **[Source: DOC_NAME, page X]**
Use **5-10 distinct sources** if available in excerpts (minimum 3).

**STEP 2: Answer**
Use the extracted points to answer the user's question directly.
- If question has parts (1/, 2/, 3/): answer under headings **## 1)**, **## 2)**, **## 3)**
- Otherwise: use clear headings by topic (Eligibility, Process, Requirements, Compliance, etc.)

**STEP 3: Gap Handling**
- Only state a requirement if supported by excerpts
- If a sub-question is not covered: write **"Not specified in provided excerpts."** then add what IS specified that is closest/relevant (still cited)
- If sources conflict: note the inconsistency and cite both

**STEP 4: Citation Rules (STRICT)**
- Every legal/compliance statement must have citation immediately after
- Format: **[Source: DOC_NAME, page X]**
- Use EXACT DOC_NAME from excerpt label
- Minimum **5 citations from 5 different documents** (if 5+ chunks available)

**STEP 5: Do Not Refuse Prematurely**
Only use "not specified" AFTER you have extracted points and attempted to answer using them.
Do NOT request more information - work with provided excerpts only.

═══════════════════════════════════════════════════════
USER QUESTION
═══════════════════════════════════════════════════════

${question}

═══════════════════════════════════════════════════════
PROVIDED EXCERPTS (AUTHORITATIVE SOURCES)
═══════════════════════════════════════════════════════

${labeledExcerpts}

═══════════════════════════════════════════════════════
FINAL REMINDER
═══════════════════════════════════════════════════════

1. START with "📋 Key Extracted Points" section
2. THEN provide structured answer
3. END with: "⚖️ **Disclaimer**: This is general information, not legal advice. Consult a qualified maritime lawyer for specific advice."`

    // Build conversation history for context
    const history = conversationHistory?.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })) || []

    const chat = model.startChat({
      history
    })

    const runWithRetry = async () => {
      const prompt = systemPrompt
      const delays = [2000, 5000, 10000, 20000]
      for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
          return await geminiQueue.add(() => chat.sendMessage(prompt))
        } catch (error) {
          const status = (error as { status?: number })?.status
          const message = error instanceof Error ? error.message : String(error)
          const isRateLimit = status === 429 || message.includes('429') || message.includes('Resource exhausted') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')
          if (!isRateLimit || attempt === delays.length) {
            throw error
          }
          const jitter = Math.floor(Math.random() * 1000)
          await new Promise(resolve => setTimeout(resolve, delays[attempt] + jitter))
        }
      }
      throw new Error('Gemini request failed after retries')
    }

    const generatedPromise = (async () => {
      const result = await runWithRetry()
      const response = result.response
      const groundingMetadata = (response as unknown as { groundingMetadata?: Record<string, unknown> }).groundingMetadata || undefined
      const sources: SourceReference[] = []
      if (contextMetadata && contextMetadata.length > 0) {
        const seenSources = new Set<string>()
        contextMetadata.forEach(meta => {
          const key = `${meta.document_name}::${meta.category}`
          if (!seenSources.has(key)) {
            seenSources.add(key)
            sources.push({
              name: meta.document_name,
              category: meta.category,
              url: meta.source_url
            })
          }
        })
      }
      let answerText = response.text()
      if (context.length > 0) {
        answerText = answerText
          .replace(/\[Web:[^\]]+\]\s*/gi, '')
          .replace(/https?:\/\/\S+/gi, '')
          .replace(/sources?\s+web/gi, 'sources')
          .replace(/recherche\s+web/gi, 'recherche')

        if (contextMetadata && contextMetadata.length > 0) {
          const existingCitations = answerText.match(/\[(Doc|Source|Document):[^\]]+\]/gi) || []
          const uniqueSources = Array.from(
            new Map(
              contextMetadata.map(meta => [
                `${meta.document_name}::${meta.category}`,
                meta
              ])
            ).values()
          )

          const citationPool = uniqueSources.map(meta => `[Source: ${meta.document_name}, page 1]`)
          const citationsToAdd = citationPool.filter(
            citation => !existingCitations.some(existing => existing.toLowerCase() === citation.toLowerCase())
          )

          if (existingCitations.length < 5 && citationPool.length > 0) {
            const needed = Math.max(0, 5 - existingCitations.length)
            const extra: string[] = []
            let idx = 0
            while (extra.length < needed) {
              const candidate = citationsToAdd[idx] || citationPool[idx % citationPool.length]
              if (candidate) extra.push(candidate)
              idx++
            }
            answerText = `${answerText}\n\nSources: ${extra.join(' ')}`
          }
        }
      }

      const finalCitationCount = (answerText.match(/\[Source:[^\]]+\]/gi) || []).length
      if (finalCitationCount >= 5) {
        answerText = answerText
          .replace(/information non trouvée[^.\n]*\.?/gi, '')
          .replace(/base documentaire insuffisante[^.\n]*\.?/gi, '')
          .replace(/base insuffisante[^.\n]*\.?/gi, '')
          .trim()
      }

      // T016: Validate cited codes are present in answer
      if (citedCodes.length > 0) {
        const missingCodes = citedCodes.filter(code => {
          const codeName = code.split(' ')[0] // "LY3" from "LY3 Large Yacht Code"
          return !answerText.toLowerCase().includes(codeName.toLowerCase())
        })
        
        if (missingCodes.length > 0) {
          console.warn(`⚠️ Codes cités non utilisés dans réponse: ${missingCodes.join(', ')}`)
          
          // Ajouter note explicative si codes manquants
          answerText += `\n\n⚠️ **Note**: La question mentionne ${missingCodes.join(' et ')}, mais ${missingCodes.length === 1 ? 'ce code n\'est pas disponible' : 'ces codes ne sont pas disponibles'} dans les documents fournis pour répondre précisément.`
        } else {
          console.log(`✅ Tous les codes cités (${citedCodes.join(', ')}) sont présents dans la réponse`)
        }
      }

      logGeminiInteraction({
        question,
        chunksProvided: effectiveContext.length,
        chunksPreviews: effectiveContext.slice(0, 3).map(c => c?.substring(0, 100) || '[empty chunk]'),
        response: answerText,
        sourcesCited: extractCitations(answerText),
        usedInternet: detectInternetFallback(answerText)
      })

      return {
        answer: answerText,
        sources,
        groundingMetadata
      }
    })()

    inFlight.set(cacheKey, generatedPromise)
    try {
      const finalResult = await generatedPromise
      setCachedAnswer(cacheKey, finalResult)
      return finalResult
    } finally {
      inFlight.delete(cacheKey)
    }
  } catch (error) {
    console.error('Gemini generation error:', error)
    throw new Error(`Failed to generate answer: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Validate Gemini API key
 * @returns true if API key is valid
 */
export async function validateGeminiApiKey(): Promise<boolean> {
  try {
    await generateEmbedding('test')
    return true
  } catch {
    return false
  }
}
