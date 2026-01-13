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
): Promise<string> {
  try {
    // Use gemini-1.5-flash (fastest, cheapest, fully available)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const systemPrompt = `Tu es un assistant juridique spécialisé en droit maritime pour brokers de yachts.

RÈGLES STRICTES:
1. Réponds UNIQUEMENT en te basant sur le CONTEXTE fourni ci-dessous
2. Si le contexte ne contient pas d'information pertinente, dis clairement "Je n'ai pas trouvé d'information dans les documents disponibles"
3. Cite toujours les sources (nom du document) dans ta réponse
4. Utilise un langage juridique précis mais accessible
5. Sois concis et direct - pas de verbiage inutile
6. Inclus toujours le disclaimer de non-responsabilité à la fin

CONTEXTE DOCUMENTAIRE:
${context.length > 0 ? context.join('\n\n---\n\n') : 'Aucun document pertinent trouvé.'}

⚠️ DISCLAIMER OBLIGATOIRE: Les informations fournies sont à titre informatif uniquement et ne constituent pas un avis juridique. Pour toute décision importante concernant vos transactions maritimes, veuillez consulter un avocat maritime qualifié.`

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

    return response.text()
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
