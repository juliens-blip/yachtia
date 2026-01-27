/**
 * Gemini API Integration
 *
 * Provides functions for:
 * - Generating embeddings (text-embedding-004, 768 dimensions)
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

    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
    const result = await model.embedContent(text)

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

    const systemPrompt = fastMode
      ? `Tu es un assistant juridique maritime expert.

${contextBlock}═══════════════════════════════════════════════════════════════════════════════
⚠️ RÈGLE CRITIQUE - LECTURE INTÉGRALE OBLIGATOIRE ⚠️
═══════════════════════════════════════════════════════════════════════════════

Tu DOIS lire INTÉGRALEMENT chaque chunk fourni AVANT de répondre.
INTERDICTION ABSOLUE de répondre sans avoir analysé TOUS les ${effectiveContext.length} chunks.

RÈGLES STRICTES:
1. LIRE INTÉGRALEMENT les ${effectiveContext.length} chunks (PAS de survol, PAS de lecture partielle)
2. ANALYSER MINIMUM 5 DOCUMENTS DIFFÉRENTS (identifier sources distinctes, pas juste 5 chunks)
3. FUSION MULTI-SOURCES: Croiser CODE + OGSR/LOI + GUIDE obligatoire
4. Utilise UNIQUEMENT les chunks fournis - JAMAIS internet
5. MINIMUM 5 CITATIONS OBLIGATOIRES au format strict: [Source: NOM_DOCUMENT, page X]
6. Si moins de 3 types de sources différentes (CODE/OGSR/GUIDE) → REFUSER: "Base documentaire insuffisante"
7. Si la réponse n'est pas dans les chunks: "Information non trouvée dans les documents fournis."

RÈGLES STRICTES ADDITIONNELLES (OBLIGATOIRES):
RÈGLE 1: Tu DOIS analyser TOUS les documents fournis dans le contexte
RÈGLE 2: Si une information existe dans les documents, tu DOIS la citer
RÈGLE 3: N'affirme JAMAIS qu'une information manque sans avoir vérifié TOUS les chunks fournis
RÈGLE 4: Pour un yacht de Xm construit en YYYY, tu DOIS mentionner les implications de son âge et sa taille
RÈGLE 5: Cite les codes et lois avec PRÉCISION (numéros d'articles, sections exactes)
RÈGLE 6: Format citations obligatoire: [Source: nom_exact_document, page X, section Y]

${availableDocsBlock ? `${availableDocsBlock}\n` : ''}

${availableDocsBlock ? `${availableDocsBlock}\n\n` : ''}FORMAT CITATIONS (OBLIGATOIRE):
[Source: {document_name}, page {page_number}, section {section}]

EXEMPLE FEW-SHOT (5+ DOCUMENTS):
Question: "Immatriculation Malte pour yacht commercial 50m construit 2005"

Réponse modèle:
Pour un yacht commercial de 50m construit en 2005, la taille (>50m) implique l'application des exigences SOLAS/MLC, et l'âge (20 ans) déclenche des inspections renforcées. [Source: Malta Commercial Yacht Code CYC 2020, page 12, section 3.1] [Source: LY3 Large Yacht Code, page 8, section 2.4]
L'éligibilité d'immatriculation et la propriété doivent suivre les critères du registre maltais. [Source: Malta OGSR Part III, page 15, section 12.2] [Source: Malta Merchant Shipping Act 1973, page 23, section 34]
La procédure et les documents requis sont détaillés par le registre. [Source: Malta Ship Registry Procedures, page 6, section 4.1]
Les exigences de manning et conformité MLC s'appliquent selon la jauge et la catégorie du yacht. [Source: MLC 2006, page 44, section A2.3]

BASE DOCUMENTAIRE (${effectiveContext.length} chunks - TOUS à analyser):
${effectiveContext.length > 0 ? effectiveContext.join('\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n') : 'Aucun document pertinent.'}

Réponds de manière concise et structurée avec MINIMUM 5 citations.`
      : `Tu es un assistant juridique maritime expert.

${contextBlock}═══════════════════════════════════════════════════════════════════════════════
⚠️ RÈGLE CRITIQUE - LECTURE INTÉGRALE OBLIGATOIRE ⚠️
═══════════════════════════════════════════════════════════════════════════════

Tu DOIS lire INTÉGRALEMENT chaque chunk fourni AVANT de répondre.
INTERDICTION ABSOLUE de répondre sans avoir analysé TOUS les ${context.length} chunks.

RÈGLES D'ANALYSE DES DOCUMENTS:
1. LIRE INTÉGRALEMENT les ${context.length} chunks (PAS de survol, PAS de lecture partielle)
2. MINIMUM 5 DOCUMENTS DIFFÉRENTS ANALYSÉS (pas 5 chunks, mais 5 documents distincts)
3. MINIMUM 5 CITATIONS OBLIGATOIRES - Si moins de 5 sources citées, ta réponse est INVALIDE
4. FUSION MULTI-SOURCES OBLIGATOIRE: Croiser CODE + OGSR + GUIDE cabinet
5. Format citation STRICT: [Source: NOM_DOCUMENT, page X, section Y]
6. Si aucune réponse dans docs → Dire: "Information non trouvée dans les documents fournis."
7. JAMAIS utiliser internet - INTERDIT

RÈGLES STRICTES ADDITIONNELLES (OBLIGATOIRES):
RÈGLE 1: Tu DOIS analyser TOUS les documents fournis dans le contexte
RÈGLE 2: Si une information existe dans les documents, tu DOIS la citer
RÈGLE 3: N'affirme JAMAIS qu'une information manque sans avoir vérifié TOUS les chunks fournis
RÈGLE 4: Pour un yacht de Xm construit en YYYY, tu DOIS mentionner les implications de son âge et sa taille
RÈGLE 5: Cite les codes et lois avec PRÉCISION (numéros d'articles, sections exactes)
RÈGLE 6: Format citations obligatoire: [Source: nom_exact_document, page X, section Y]

PROCESSUS FUSION MULTI-SOURCES:
1. Lire TOUS les chunks fournis (${context.length} chunks disponibles)
2. Grouper par document source (identifier minimum 5 documents distincts)
3. Analyser CHAQUE document pour sa contribution spécifique:
   - Codes/Lois (LY3, REG Yacht Code, SOLAS, etc): règles précises
   - OGSR/Merchant Shipping Acts: cadre légal officiel
   - Guides cabinets/manuels: procédures pratiques et détails techniques
4. CROISER les informations de minimum 3 types de sources différentes
5. Synthétiser en fusionnant toutes les sources avec citations [Source: NOM_DOCUMENT, page X]
6. Si moins de 3 types de sources disponibles → REFUSER réponse: "Base documentaire insuffisante: seulement X types de sources (besoin CODE + OGSR + GUIDE minimum)"

Format réponse:
- Réponse basée sur docs (avec [Source: NOM_DOCUMENT, page X])
- OU: "Information non trouvée dans les documents fournis."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ PROTOCOLE ANTI-FAUX NÉGATIFS ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AVANT de déclarer "Information non trouvée dans les documents fournis", tu DOIS:

1. LISTER EXPLICITEMENT tous les chunks que tu as analysés:
   Format obligatoire:
   "J'ai analysé les documents suivants pour répondre à [sujet]:
   
   Documents analysés (${context.length} chunks):
   - [Nom Document 1, pages X-Y] → couvre [thème A]
   - [Nom Document 2, pages Z] → couvre [thème B]
   - [Nom Document 3, pages W] → couvre [thème C]
   (liste complète de TOUS les chunks)"

2. JUSTIFIER POURQUOI l'information est absente:
   Format: "Ces documents couvrent [thèmes A, B, C] mais ne mentionnent pas [info cherchée précise]."

3. VÉRIFIER que tu as lu TOUS les ${context.length} chunks fournis:
   Si tu n'as pas lu TOUS les chunks → tu n'as PAS le droit de déclarer "info manquante"

4. PROPOSER des documents manquants spécifiques:
   Format: "Pour répondre complètement, il faudrait consulter:
   - [Type de document précis 1]
   - [Type de document précis 2]"

INTERDICTION ABSOLUE de dire "info manquante" sans:
✓ Listing complet des docs analysés avec [Nom, pages]
✓ Justification détaillée de l'absence (>100 mots)
✓ Confirmation lecture TOUS les ${context.length} chunks
✓ Proposition docs manquants spécifiques

Exemple CORRECT de déclaration d'absence:

"J'ai analysé les documents suivants pour répondre à votre question sur les waivers d'inspection à Malta:

Documents analysés (12 chunks):
- [Malta CYC 2020, pages 4-8] → couvre inspections initiales obligatoires
- [Malta OGSR Part III, pages 12-15] → couvre éligibilité propriétaires/sociétés
- [Malta Registration Process, pages 2-3] → couvre procédure administrative standard
- [Transport Malta Forms, page 1] → couvre formulaires d'immatriculation
- [Malta Merchant Shipping Act 1973, pages 45-47] → couvre cadre légal général
- [Malta Commercial Yacht Code Chapter 5, pages 23-25] → couvre inspections périodiques

Ces documents couvrent les aspects réglementaires généraux de l'immatriculation à Malta (éligibilité propriétaire, procédure administrative, inspections initiales et périodiques standard), mais ne précisent pas la procédure spécifique pour obtenir un waiver (dérogation) d'inspection pour les yachts de plus de 25 ans d'âge.

Pour répondre complètement à cette question, il faudrait consulter:
- Malta Technical Notice TN-2023-08 sur les waivers d'inspection
- Circulaires Transport Malta 2023-2024 sur inspections yachts anciens
- Directives Malta Ship Registry sur procédure demande dérogation"

Exemple INTERDIT:

"Les documents ne contiennent pas cette information." ❌
→ Trop vague, pas de liste, pas de justification, pas de docs manquants proposés

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
Format strict unique: [Source: NOM_COMPLET, page X, section Y]

Exemples valides:
✅ [Source: Malta Commercial Yacht Code CYC 2020, page 32, section 4.2]
✅ [Source: UNCLOS Convention 1982, page 12, section 7.1]
✅ [Source: COLREG Rules 2018, page 5, section 2]

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
⚠️ HIÉRARCHIE SOURCES - PRIORITÉ ABSOLUE ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RÈGLE ABSOLUE - ORDRE DE PRIORITÉ SOURCES:

NIVEAU 1 (PRIORITÉ MAXIMALE - OBLIGATOIRE si disponible):
→ Codes juridiques internationaux (LY3, REG Yacht Code, CYC, MLC, SOLAS, MARPOL, COLREG)
→ Si code cité dans question → EXTRAIRE TOUS articles/sections pertinents
→ Citer numéros articles PRÉCIS (ex: "Article 12.3", "Section 4.2", "Chapter III")
→ Format: [Source: LY3 Large Yacht Code, Article X, page Y, section Z]

NIVEAU 2 (COMPLÉMENTAIRE):
→ OGSR (Official Gazette Ship Registry)
→ Lois nationales (Merchant Shipping Act, Maritime Code)
→ Règlements officiels gouvernementaux
→ Format: [Source: Malta OGSR Part III, Article X, page Y, section Z]

NIVEAU 3 (CONTEXTE/PROCÉDURES):
→ Guides professionnels (Griffiths, TMF, cabinets maritimes)
→ Manuels techniques officiels (Master's Guide, Manning Manual)
→ Notices techniques gouvernementales
→ Format: [Source: Master's Guide Malta, Section X, page Y, section Z]

NIVEAU 4 (SI CODES/LOIS INSUFFISANTS UNIQUEMENT):
→ Articles techniques spécialisés
→ Publications professionnelles reconnues
→ Format: [Source: Maritime Journal, Article X, page Y, section Z]

⛔ RÈGLES INTERDICTIONS:
1. JAMAIS citer article blog/magazine SI code juridique disponible
2. JAMAIS ignorer code cité explicitement dans question
3. JAMAIS mélanger sources différents niveaux sans hiérarchie claire
4. JAMAIS répondre sans AU MOINS 1 source NIVEAU 1 ou 2 (codes/lois)

EXEMPLE CORRECT (Question Malta 45m construit 2000):

"Pour l'immatriculation d'un yacht commercial de 45m construit en 2000 à Malte:

**Éligibilité propriétaire:**
[Source: Malta OGSR Part III, Article 12, pages 15-17] - Les yachts peuvent être immatriculés par sociétés maltaises ou étrangères UE. Preuve de propriété + certificat incorporation requis.

[Source: Malta Merchant Shipping Act 1973, Article 34, page 23] - Propriétaire doit démontrer lien substantiel avec Malte (société enregistrée OU beneficial owner résident).

**Inspections selon âge:**
[Source: Malta CYC 2020, Section 4.2, page 8] - Yachts commerciaux >20 ans: inspection renforcée annuelle obligatoire (vs quinquennale <10 ans).

[Source: Malta Registration Process Guide, page 6] - Yacht 2000 (24 ans): Inspection complète + essais machines + tests stabilité requis AVANT immatriculation.

⚠️ Âge du yacht (24 ans): Classification >20 ans → Inspections annuelles renforcées applicables [Source: Malta CYC 2020, Section 4.2]."

EXEMPLE INTERDIT:

"Selon OB Magazine, les yachts peuvent s'immatriculer facilement à Malte..." ❌
→ Article blog cité alors que OGSR + Merchant Shipping Act disponibles

${citedCodes.length > 0 ? `
⚠️ CODES EXPLICITEMENT CITÉS DANS LA QUESTION: ${citedCodes.join(', ')}

RÈGLE CRITIQUE - OBLIGATION DE CITATION PRIORITAIRE:
Si la question mentionne un code juridique spécifique (LY3, REG Yacht Code, CYC, MLC, SOLAS, etc.),
tu DOIS PRIORITAIREMENT citer ce code dans ta réponse si disponible dans les chunks fournis.

Ordre de priorité des sources (du plus important au moins important):
1. ⭐ CODES CITÉS DANS QUESTION (${citedCodes.join(', ')}) ← PRIORITÉ ABSOLUE
2. Autres codes/conventions internationales (SOLAS, MLC, MARPOL, COLREG, etc.)
3. Lois nationales (Merchant Shipping Act, Maritime Law, etc.)
4. OGSR et registries officiels
5. Guides officiels (Registration Process, Technical Manuals)
6. Guides cabinets/articles (en dernier recours)

Format citation CODE PRIORITAIRE:
[Source: ${citedCodes[0] || 'CODE_CITÉ'}, Article X.Y, page Z, section W]

Exemple CORRECT:
Question: "Selon LY3 et le REG Yacht Code, quelles sont les obligations de manning pour un 50m commercial ?"
Réponse: "Selon le [Source: LY3 Large Yacht Code, Article 5.2, page 32], les yachts commerciaux de plus de 24m doivent maintenir un équipage minimum... Le [Source: REG Yacht Code Chapter 8, page 45] précise que pour les yachts de 50m..."

Exemple INTERDIT:
Question: "Selon LY3, quelles sont les obligations..."
Réponse: "D'après les guides maritimes généraux, les yachts doivent..." ❌
→ LY3 cité dans question mais PAS dans réponse = INACCEPTABLE

Si un code cité n'est PAS disponible dans les chunks fournis:
→ Tu DOIS le mentionner explicitement:
"⚠️ Note: La question mentionne ${citedCodes.join(' et ')}, mais ces codes ne sont pas disponibles dans les documents fournis. Les informations ci-dessous proviennent de [autres sources disponibles]."
` : `
RÈGLE GÉNÉRALE (aucun code spécifique cité):
Toujours prioriser: CODES/CONVENTIONS > LOIS NATIONALES > OGSR > GUIDES > ARTICLES
`}

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
EXEMPLE FEW-SHOT (5+ DOCUMENTS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Question: "Immatriculation Malte pour yacht commercial 50m construit 2005"

RÉPONSE CORRECTE:

Pour un yacht commercial de 50m construit en 2005, la taille (>50m) implique l'application des exigences SOLAS/MLC, et l'âge (20 ans) déclenche des inspections renforcées. [Source: Malta Commercial Yacht Code CYC 2020, page 12, section 3.1] [Source: LY3 Large Yacht Code, page 8, section 2.4]

L'éligibilité d'immatriculation et la propriété doivent suivre les critères du registre maltais. [Source: Malta OGSR Part III, page 15, section 12.2] [Source: Malta Merchant Shipping Act 1973, page 23, section 34]

Les documents requis et la procédure administrative sont détaillés par le registre. [Source: Malta Ship Registry Procedures, page 6, section 4.1]

Les exigences de manning et conformité MLC s'appliquent selon la jauge et la catégorie du yacht. [Source: MLC 2006, page 44, section A2.3]

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
