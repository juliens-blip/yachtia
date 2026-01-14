/**
 * Gemini API Integration
 *
 * Provides functions for:
 * - Generating embeddings (text-embedding-004, 768 dimensions)
 * - Generating chat responses with RAG context (gemini-1.5-flash)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// Validate API key
if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing env.GEMINI_API_KEY')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

/**
 * Generate embedding vector for text (768 dimensions)
 * Used for semantic search in RAG pipeline
 *
 * @param text - Text to embed
 * @returns Array of 768 numbers representing the embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
    const result = await model.embedContent(text)

    if (!result.embedding || !result.embedding.values) {
      throw new Error('No embedding returned from Gemini API')
    }

    return result.embedding.values
  } catch (error) {
    console.error('Gemini embedding error:', error)
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate answer using Gemini with RAG context
 *
 * @param question - User's question
 * @param context - Array of relevant text chunks from RAG
 * @param conversationHistory - Optional previous messages for context
 * @returns Generated answer with legal disclaimer
 */
export async function generateAnswer(
  question: string,
  context: string[],
  conversationHistory?: Array<{ role: string; content: string }>
  // enableGrounding parameter removed - grounding requires specific API setup
): Promise<{ answer: string; groundingMetadata?: Record<string, unknown> }> {
  try {
    // Use gemini-2.0-flash with optional grounding
    // Note: googleSearch tool requires specific API config
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const systemPrompt = `Tu es un assistant juridique spécialisé en droit maritime pour brokers de yachts.

RÈGLES STRICTES:
1. Utilise PRIORITAIREMENT le CONTEXTE DOCUMENTAIRE ci-dessous (sources internes fiables)
2. Si le contexte documentaire est insuffisant, utilise la recherche web pour des informations complémentaires récentes
3. Distingue clairement les informations provenant des documents internes vs recherche web
4. Cite TOUJOURS les sources avec leurs URLs quand disponibles
5. Pour informations récentes (2024+), privilégie la recherche web
6. Utilise un langage juridique précis mais accessible
7. Sois concis et direct - pas de verbiage inutile

CONTEXTE DOCUMENTAIRE (Sources internes):
${context.length > 0 ? context.join('\n\n---\n\n') : 'Aucun document pertinent trouvé dans la base interne.'}

⚠️ DISCLAIMER: Les informations fournies sont à titre informatif uniquement et ne constituent pas un avis juridique. Pour toute décision importante concernant vos transactions maritimes, veuillez consulter un avocat maritime qualifié.`

    // Build conversation history for context
    const history = conversationHistory?.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })) || []

    const chat = model.startChat({
      history
    })

    const result = await chat.sendMessage(systemPrompt + '\n\nQUESTION: ' + question)
    const response = result.response

    // Extract grounding metadata if available
    const groundingMetadata = (response as unknown as { groundingMetadata?: Record<string, unknown> }).groundingMetadata || undefined

    return {
      answer: response.text(),
      groundingMetadata
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
