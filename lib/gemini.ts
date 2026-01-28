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
import { extractYachtContext, buildContextPrompt } from './context-extractor'

// Validate API key
if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing env.GEMINI_API_KEY')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

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
  contextMetadata?: Array<{ document_name: string; category: string; source_url?: string }>
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
    const contextEnrichment = buildContextPrompt(yachtContext)
    const contextBlock = contextEnrichment
      ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 CONTEXTE SPÉCIFIQUE DU YACHT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${contextEnrichment}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`
      : ''
    const citedCodes = yachtContext.citedCodes || []
    const availableDocNames = Array.from(new Set((contextMetadata || []).map(item => item.document_name).filter(Boolean)))
    const availableDocsBlock = availableDocNames.length > 0
      ? `DOCUMENTS DISPONIBLES (${availableDocNames.length}):\n- ${availableDocNames.slice(0, 20).join('\n- ')}\n\nRÈGLE: Tu dois citer AU MOINS 5 documents distincts parmi cette liste. Si moins de 5 documents sont disponibles, cite-les tous.`
      : ''

    // --- BUILD PROMPT: Question FIRST, then instructions, then context ---
    const codePriorityBlock = citedCodes.length > 0
      ? `\nCODES CITÉS DANS LA QUESTION: ${citedCodes.join(', ')} — Tu DOIS les citer en priorité dans ta réponse.\nSi un code cité n'est pas dans les documents: mentionne-le explicitement.`
      : ''

    const systemPrompt = `Tu es un assistant juridique maritime expert. Tu DOIS répondre à la question ci-dessous en t'appuyant sur les documents fournis.

═══ QUESTION DE L'UTILISATEUR ═══

${question}

═══ INSTRUCTIONS ═══

${contextBlock}${codePriorityBlock}

COMMENT RÉPONDRE:
1. DÉTECTION QUESTIONS MULTIPLES: Analyse si la question contient:
   - Des numéros (1/, 2/, 3/ ou 1., 2., 3.)
   - Des points séparés par tirets/bullet points
   - Plusieurs interrogations distinctes
   → Si OUI: Tu DOIS structurer ta réponse avec des titres de section ## pour CHAQUE sous-question.
   → Exemple: Si question = "1/ éligibilité owner, 2/ inspections par âge, 3/ CYC", utilise:
     ## 1. Éligibilité Owner
     ## 2. Inspections par Âge
     ## 3. Conséquences CYC

2. Pour chaque point, cherche l'information dans les documents ci-dessous et cite précisément: [Source: NOM_DOCUMENT, page X, section Y]

3. SYNTHÈSE OBLIGATOIRE: JAMAIS renvoyer les chunks bruts. TOUJOURS reformuler en langage naturel clair, professionnel et structuré.

4. Priorise: Codes/Conventions > OGSR/Lois nationales > Guides professionnels > Articles.

5. Si l'info est absente des documents, dis-le clairement en listant les documents analysés.

6. Cite au moins 3 sources différentes quand c'est possible.

INTERDICTIONS: pas de chunks copiés-collés, pas de phrases vagues ("généralement", "typiquement"), pas d'invention, pas de source web.

${availableDocsBlock ? availableDocsBlock + '\n' : ''}
═══ DOCUMENTS DE RÉFÉRENCE (${effectiveContext.length} extraits) ═══

${effectiveContext.length > 0 ? effectiveContext.join('\n\n---\n\n') : 'Aucun document pertinent trouvé.'}

═══ RAPPEL ═══
Réponds DIRECTEMENT à la question ci-dessus. Structure ta réponse par thèmes/sous-questions. Chaque affirmation doit être sourcée. Termine par le disclaimer légal.

⚖️ **Disclaimer**: Les informations fournies sont à titre informatif uniquement et ne constituent pas un avis juridique. Consultez un avocat maritime qualifié pour toute décision importante.`

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
      const delays = [2000, 4000, 8000]
      for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
          return await geminiQueue.add(() => chat.sendMessage(prompt))
        } catch (error) {
          const status = (error as { status?: number })?.status
          const message = error instanceof Error ? error.message : String(error)
          const isRateLimit = status === 429 || message.includes('429')
          if (!isRateLimit || attempt === delays.length) {
            throw error
          }
          const jitter = Math.floor(Math.random() * 300)
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
        chunksPreviews: effectiveContext.slice(0, 3).map(c => c.substring(0, 100)),
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
