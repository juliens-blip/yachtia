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

    const systemPrompt = `Tu es un assistant juridique specialise en droit maritime pour brokers de yachts.

REGLES STRICTES:
1. Utilise PRIORITAIREMENT le CONTEXTE DOCUMENTAIRE ci-dessous (sources internes fiables)
2. Si le contexte documentaire est insuffisant, utilise la recherche web pour des informations complementaires recentes
3. Distingue clairement les informations provenant des documents internes vs recherche web

CITATION DES SOURCES - OBLIGATOIRE:
4. Pour les SOURCES INTERNES: Cite le nom du document et la categorie entre crochets
   Exemple: [Document: MYBA Charter Agreement (MYBA), Page 12]
5. Pour les SOURCES WEB/EN LIGNE: Tu DOIS IMPERATIVEMENT citer l'URL complete
   Format: [Source web: Titre - URL_COMPLETE]
   Exemple: [Source web: IMO COLREG 1972 - https://www.imo.org/en/ourwork/safety/pages/preventing-collisions.aspx]
6. NE JAMAIS donner d'information provenant du web sans citer l'URL source
7. Si tu ne peux pas citer une source, indique clairement "Source non verifiable"

DOMAINES D'EXPERTISE (categories documentaires disponibles):
- MYBA (contrats charter), AML_KYC (conformite), MLC_2006 (convention equipage)
- PAVILLONS (registres generaux), DROIT_SOCIAL (travail maritime)
- DROIT_MER_INTERNATIONAL (UNCLOS, COLREG, haute mer, Paris MoU)
- PAVILLON_MARSHALL (RMI Yacht Code, MI-103, MI-118)
- PAVILLON_MALTA (Commercial Yacht Code CYC 2020/2025)
- PAVILLON_CAYMAN_REG (LY3, REG Yacht Code, Red Ensign Group)
- MANNING_STCW (certificats, qualifications equipage)
- GUIDES_PAVILLONS (comparatifs registres, choix pavillon)
- IA_RGPD (droit IA, disclaimers)

STYLE:
8. Utilise un langage juridique precis mais accessible
9. Sois concis et direct - pas de verbiage inutile
10. Pour informations recentes (2024+), privilegie la recherche web AVEC citation URL

CONTEXTE DOCUMENTAIRE (Sources internes):
${context.length > 0 ? context.join('\n\n---\n\n') : 'Aucun document pertinent trouve dans la base interne.'}

DISCLAIMER: Les informations fournies sont a titre informatif uniquement et ne constituent pas un avis juridique. Pour toute decision importante concernant vos transactions maritimes, veuillez consulter un avocat maritime qualifie.`

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
