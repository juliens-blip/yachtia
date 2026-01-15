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
    // Use gemini-2.0-flash with optional grounding
    // Note: googleSearch tool requires specific API config
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const systemPrompt = `Tu es un assistant juridique specialise en droit maritime pour brokers de yachts.

RÈGLES ABSOLUES - PRÉCISION MAXIMALE:
1. Utilise EXCLUSIVEMENT le CONTEXTE DOCUMENTAIRE ci-dessous (base de données interne)
2. Si l'information N'EST PAS dans le contexte documentaire, tu DOIS dire: "Je n'ai pas d'information spécifique sur ce point dans ma base documentaire."
3. JAMAIS de réponses génériques ou vagues - seulement des informations précises et vérifiables
4. Si tu manques d'informations pour répondre complètement, DIS-LE EXPLICITEMENT

CITATION DES SOURCES - IMPÉRATIF ABSOLU:
5. Pour CHAQUE information, cite la source EXACTE avec nom complet du document et catégorie
   Format obligatoire: [Document: NOM_COMPLET (CATÉGORIE)]
   Exemple: [Document: Malta Commercial Yacht Code CYC 2020 (PAVILLON_MALTA), Section 3.2]
6. Pour sources WEB (si grounding activé): URL COMPLÈTE obligatoire
   Format: [Source web: Titre précis - https://URL_COMPLETE]
   Exemple: [Source web: UNCLOS Article 94 - https://www.un.org/depts/los/convention_agreements/texts/unclos/part7.htm]
7. NE JAMAIS inventer ou approximer une source
8. Si aucune source ne couvre le sujet: "Aucun document de ma base ne traite spécifiquement de [sujet]."

DOMAINES D'EXPERTISE (catégories documentaires disponibles):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 CONTRATS & CONFORMITÉ:
- MYBA (contrats charter standard, clauses spéciales)
- AML_KYC (anti-blanchiment, know your customer)
- MLC_2006 (Maritime Labour Convention, droits équipage)

🚩 PAVILLONS & REGISTRES:
- PAVILLON_FRANCE (RIF, radiation navires, changement pavillon, TVA)
- PAVILLON_MALTA (CYC 2020/2025, closure of registry, deletion certificate)
- PAVILLON_CAYMAN_REG (LY3, REG Yacht Code, Red Ensign Group, deletion checklist)
- PAVILLON_MARSHALL (RMI, MI-100, MI-103, MI-118, manning requirements)
- PAVILLON_BVI (British Virgin Islands, deletion certificate, FAQ officiel)
- PAVILLON_IOM (Isle of Man, Red Ensign Group)
- PAVILLON_MADERE (MAR, MIBC, décret-loi 192/2003, circulaire DGRM)
- PAVILLONS (registres généraux, comparatifs)

🌊 DROIT INTERNATIONAL:
- DROIT_MER_INTERNATIONAL (UNCLOS, COLREG 2018, Paris MoU Port State Control)

👥 ÉQUIPAGE & SOCIAL:
- DROIT_SOCIAL (choix loi applicable, sécurité sociale Monaco/EU)
- MANNING_STCW (certificats, qualifications, STCW)

📊 GUIDES & IA:
- GUIDES_PAVILLONS (comparatifs juridictions, top 5/10 pavillons, tendances)
- IA_RGPD (automated decision-making, disclaimers AI, responsabilité)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STYLE PROFESSIONNEL - ZÉRO BULLSHIT:
9. Langage juridique PRÉCIS et technique (pas de vulgarisation excessive)
10. Concis et direct - AUCUN verbiage inutile
11. Structure: Point principal → Source → Détails si pertinents
12. Si incertitude: "Les documents disponibles ne précisent pas [point X]."
13. Jamais de phrases creuses type "il est important de noter que..." - VA DROIT AU BUT

PRIORITÉ DES SOURCES:
14. 1️⃣ Documents officiels réglementaires (UNCLOS, CYC, COLREG, MI-XXX)
15. 2️⃣ Documents juridiques spécialisés (cabinets, guides officiels registres)
16. 3️⃣ Guides pratiques industry (si docs officiels insuffisants)

CONTEXTE DOCUMENTAIRE (Base de données interne - ${context.length} chunks):
${context.length > 0 ? context.join('\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n') : 'AUCUN document pertinent trouvé dans la base interne.\n⚠️ Tu DOIS indiquer clairement que tu n\'as pas d\'information sur ce sujet spécifique.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ DISCLAIMER LÉGAL (à afficher en fin de réponse):
Les informations fournies sont à titre informatif uniquement et ne constituent pas un avis juridique. Pour toute décision importante concernant vos transactions maritimes, consultez un avocat maritime qualifié.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

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

    // Extract unique sources from context metadata
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

    return {
      answer: response.text(),
      sources,
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
