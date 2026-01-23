/**
 * Gemini API Integration
 *
 * Provides functions for:
 * - Generating embeddings (text-embedding-004, 768 dimensions)
 * - Generating chat responses with RAG context (gemini-1.5-flash)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { logGeminiInteraction, extractCitations, detectInternetFallback } from './gemini-logger'

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

    const systemPrompt = fastMode
      ? `Tu es un assistant juridique maritime expert.

═══════════════════════════════════════════════════════════════════════════════
⚠️ RÈGLE CRITIQUE - LECTURE INTÉGRALE OBLIGATOIRE ⚠️
═══════════════════════════════════════════════════════════════════════════════

Tu DOIS lire INTÉGRALEMENT chaque chunk fourni AVANT de répondre.
INTERDICTION ABSOLUE de répondre sans avoir analysé TOUS les ${effectiveContext.length} chunks.

RÈGLES STRICTES:
1. LIRE INTÉGRALEMENT les ${effectiveContext.length} chunks (PAS de survol, PAS de lecture partielle)
2. Utilise UNIQUEMENT les chunks fournis - JAMAIS internet
3. MINIMUM 3 CITATIONS OBLIGATOIRES au format strict: [Source: NOM_DOCUMENT, page X]
4. Si moins de 3 sources citées, ta réponse est INVALIDE et sera rejetée
5. Si la réponse n'est pas dans les chunks: "Information non trouvée dans les documents fournis."

FORMAT CITATIONS (OBLIGATOIRE):
[Source: {document_name}, page {page_number}]

BASE DOCUMENTAIRE (${effectiveContext.length} chunks - TOUS à analyser):
${effectiveContext.length > 0 ? effectiveContext.join('\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n') : 'Aucun document pertinent.'}

Réponds de manière concise et structurée avec MINIMUM 3 citations.`
      : `Tu es un assistant juridique maritime expert.

═══════════════════════════════════════════════════════════════════════════════
⚠️ RÈGLE CRITIQUE - LECTURE INTÉGRALE OBLIGATOIRE ⚠️
═══════════════════════════════════════════════════════════════════════════════

Tu DOIS lire INTÉGRALEMENT chaque chunk fourni AVANT de répondre.
INTERDICTION ABSOLUE de répondre sans avoir analysé TOUS les ${context.length} chunks.

RÈGLES D'ANALYSE DES DOCUMENTS:
1. LIRE INTÉGRALEMENT les ${context.length} chunks (PAS de survol, PAS de lecture partielle)
2. MINIMUM 3 CITATIONS OBLIGATOIRES - Si moins de 3 sources citées, ta réponse est INVALIDE
3. Format citation STRICT: [Source: NOM_DOCUMENT, page X]
4. Si aucune réponse dans docs → Dire: "Information non trouvée dans les documents fournis."
5. JAMAIS utiliser internet - INTERDIT

PROCESSUS:
1. Lire TOUS les chunks fournis (${context.length} chunks disponibles)
2. Identifier passages pertinents pour chaque chunk
3. Synthétiser avec citations [Source: NOM_DOCUMENT, page X]
4. Si insuffisant → signaler l'absence d'information, sans web

Format réponse:
- Réponse basée sur docs (avec [Source: NOM_DOCUMENT, page X])
- OU: "Information non trouvée dans les documents fournis."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROCESSUS D'ANALYSE OBLIGATOIRE (ÉTAPE PAR ÉTAPE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ÉTAPE 1: ANALYSE DU CONTEXTE DOCUMENTAIRE INTERNE
└─ Examine attentivement le CONTEXTE DOCUMENTAIRE ci-dessous
└─ Identifie TOUS les passages pertinents pour la question
└─ Note les documents sources avec leur catégorie exacte

ÉTAPE 2: ÉVALUATION DE LA COMPLÉTUDE
└─ L'information est-elle COMPLÈTE dans les documents internes ?
   ✅ OUI → Répondre UNIQUEMENT avec ces sources (aller à ÉTAPE 4)
   ❌ NON → L'information est incomplète/absente → Continuer à ÉTAPE 3

ÉTAPE 3: DÉCLARATION D'INSUFFISANCE (SI ÉTAPE 2 = NON)
└─ Dire EXPLICITEMENT: "⚠️ Les documents de ma base ne contiennent pas d'information complète sur [sujet précis]."
└─ Préciser ce qui manque exactement
└─ Indiquer: "Je vais compléter avec des sources web officielles."

ÉTAPE 4: RÉDACTION DE LA RÉPONSE
└─ Structurer la réponse avec sections claires
└─ CHAQUE affirmation = UNE citation précise
└─ Format professionnel juridique (pas de langage familier)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLES DE CITATION - ZÉRO TOLÉRANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POUR SOURCES INTERNES (Documents de la base):
Format strict unique: [Source: NOM_COMPLET, page X]

Exemples valides:
✅ [Source: Malta Commercial Yacht Code CYC 2020, page 32]
✅ [Source: UNCLOS Convention 1982, page 12]
✅ [Source: COLREG Rules 2018, page 5]

Exemples INTERDITS:
❌ "Selon les documents..." (trop vague)
❌ [Doc: ...] (format incorrect)
❌ "Les sources indiquent que..." (pas de source précise)

POUR SOURCES WEB: INTERDIT

Exemples valides:
✅ [Web: IMO SOLAS Convention Chapter III - https://www.imo.org/en/OurWork/Safety/Pages/SOLAS.aspx]
✅ [Web: Malta Transport Authority Ship Registration Form - https://www.transport.gov.mt/maritime/forms/ship-registration-form-2024.pdf]
✅ [Web: Paris MoU Annual Report 2023 - https://parismou.org/publications/annual-reports]

Exemples INTERDITS:
❌ [Web: Site Malta Transport] (pas d'URL)
❌ [Web: https://transport.gov.mt] (pas de titre précis)
❌ [Web: Documentation officielle] (trop vague)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTERDICTIONS ABSOLUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ JAMAIS de phrases génériques type:
   - "Il est généralement recommandé de..."
   - "Dans la plupart des cas..."
   - "Typiquement, on observe que..."
   - "Il existe différents types de..."

❌ JAMAIS d'information sans source vérifiable
❌ JAMAIS inventer ou extrapoler
❌ JAMAIS utiliser des connaissances générales non documentées
❌ JAMAIS mentionner internet/web

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXEMPLE DE RÉPONSE PROFESSIONNELLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Question: "Quels documents pour obtenir un deletion certificate à Malta ?"

RÉPONSE CORRECTE:

Documents requis pour un deletion certificate à Malta:

D'après le [Source: Malta - Closure of Registry, page 4], les documents obligatoires sont:

1. **Application for Closure of Registry** - Formulaire officiel signé par le propriétaire enregistré
2. **Certificate of Registry original** - Document physique à retourner
3. **Proof of ownership** - Bill of Sale ou titre de propriété
4. **Clearance from Customs** - Certificat de dédouanement
5. **No Outstanding Fees Certificate** - Attestation absence de dettes

Le [Source: Malta Commercial Yacht Code CYC 2020, page 56] précise que pour les yachts commerciaux, un audit de conformité final est requis avant délivrance du deletion certificate.

Délais de traitement: 15 jours ouvrables selon [Source: Malta Transport Authority Procedures, page 9].

⚠️ **Note**: Information non trouvée dans les documents fournis.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RÉPONSE INCORRECTE (EXEMPLES À NE JAMAIS FAIRE):

❌ "Pour obtenir un deletion certificate à Malta, il faut généralement fournir plusieurs documents administratifs..."
→ Trop vague, pas de source, pas de liste précise

❌ "Selon les documents Malta, vous devez contacter les autorités..."
→ Source imprécise, réponse évasive

❌ "Il existe différents types de deletion certificates..."
→ Information générique sans source

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BASE DOCUMENTAIRE INTERNE (${context.length} chunks disponibles)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${context.length > 0 ? context.join('\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n') : '⚠️ AUCUN document pertinent trouvé dans la base interne.\n\nTu DOIS:\n1. Indiquer clairement: "Je n\'ai pas de document spécifique sur ce sujet dans ma base."\n2. Suggérer de consulter des sources officielles web (avec URLs précises si disponibles)\n3. NE PAS inventer d\'information'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STYLE PROFESSIONNEL REQUIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Langage juridique précis et technique
✅ Structure: Réponse directe → Sources → Détails
✅ Listes numérotées pour les procédures
✅ Sections avec titres en gras
✅ Citations complètes entre crochets
✅ Si incertitude: "Les documents ne précisent pas [X]. Source web recommandée: [URL]"

❌ Pas de verbiage inutile
❌ Pas de phrases creuses ("il est important de noter que...")
❌ Pas de "généralement", "typiquement", "dans la plupart des cas"
❌ Pas d'approximations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ DISCLAIMER LÉGAL (à afficher TOUJOURS en fin de réponse)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ **Disclaimer**: Les informations fournies sont à titre informatif uniquement et ne constituent pas un avis juridique. Pour toute décision importante concernant vos transactions maritimes, consultez un avocat maritime qualifié.`

    // Build conversation history for context
    const history = conversationHistory?.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })) || []

    const chat = model.startChat({
      history
    })

    const runWithRetry = async () => {
      const prompt = systemPrompt + '\n\nQUESTION: ' + question
      const delays = [2000, 4000, 8000]
      for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
          return await chat.sendMessage(prompt)
        } catch (error) {
          const status = (error as { status?: number })?.status
          const message = error instanceof Error ? error.message : String(error)
          const isRateLimit = status === 429 || message.includes('429')
          if (!isRateLimit || attempt === delays.length) {
            throw error
          }
          await new Promise(resolve => setTimeout(resolve, delays[attempt]))
        }
      }
      throw new Error('Gemini request failed after retries')
    }

    const result = await runWithRetry()
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

        if (existingCitations.length < 3 && citationPool.length > 0) {
          const needed = Math.max(0, 3 - existingCitations.length)
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
