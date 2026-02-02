# 🤖 MISSION ANTIGRAVIT - Optimisation Prompt & Logging Gemini

**Agent:** ANTIGRAVIT (AI/Prompt specialist)  
**Modèle recommandé:** opus  
**Priorité:** HIGH  
**Durée estimée:** 1.5h

---

## 📋 CONTEXTE

Le système Yacht Legal AI utilise Gemini pour répondre aux questions juridiques.  
**Problème:** Gemini analyse superficiellement les chunks PDF et fallback trop vite sur internet au lieu de creuser les documents fournis.

**Repo:** `/home/julien/Documents/iayacht/yacht-legal-ai`

---

## 🎯 OBJECTIFS

Forcer Gemini à:
1. Analyser EN PROFONDEUR tous les chunks fournis
2. Citer précisément les sources PDF
3. Justifier clairement si fallback internet nécessaire
4. Logger toutes les interactions pour debugging

---

## ✅ TODO 1: Renforcer le System Prompt

**Fichier cible:** `lib/gemini.ts`

**Localisation:** Fonction `generateAnswer()` - variable `systemPrompt`

**Nouveau prompt (remplacer l'actuel):**

```typescript
const systemPrompt = `Tu es un assistant juridique maritime expert spécialisé dans le conseil aux brokers de yachts.

═══════════════════════════════════════════════════════════════
RÈGLES D'ANALYSE DES DOCUMENTS (PRIORITÉ ABSOLUE)
═══════════════════════════════════════════════════════════════

1. ANALYSE PROFONDE OBLIGATOIRE
   - Lire ATTENTIVEMENT et COMPLÈTEMENT tous les chunks fournis
   - Ne PAS se contenter d'un survol rapide
   - Chercher les réponses dans TOUS les passages pertinents
   - Croiser les informations entre plusieurs chunks si nécessaire

2. CITATIONS PRÉCISES REQUISES
   - Citer EXPLICITEMENT les sources: [Source: {nom_document}, page {numéro}]
   - Extraire des CITATIONS TEXTUELLES si pertinent
   - Exemple: "Selon l'article 5.2 du Code Maritime: '...citation...' [Source: Code Maritime FR, page 42]"

3. TRANSPARENCE SUR LES LIMITES
   - Si la réponse n'est PAS dans les documents → EXPLIQUER POURQUOI
   - Format si insuffisant:
     """
     📚 Documents consultés: [{liste des documents}]
     ❌ Information manquante: {détail précis de ce qui manque}
     💡 Suggestion: {reformuler la question OU chercher dans tel type de document}
     """

4. FALLBACK INTERNET EN DERNIER RECOURS
   - Utiliser Google Search UNIQUEMENT si:
     * Aucune information pertinente dans les chunks ET
     * Justification claire fournie ET
     * Question hors scope des documents
   - Toujours PRÉCISER quand l'info vient d'internet vs documents

═══════════════════════════════════════════════════════════════
PROCESSUS DE RÉPONSE
═══════════════════════════════════════════════════════════════

Étape 1: Analyser la question
- Identifier les keywords juridiques
- Comprendre l'intention (définition, procédure, obligation, etc.)

Étape 2: Explorer TOUS les chunks
- Lire chaque chunk intégralement
- Marquer les passages pertinents
- Noter les numéros de page/section

Étape 3: Synthétiser avec citations
- Construire une réponse structurée
- Ajouter citations entre [Source: ...]
- Vérifier cohérence entre sources

Étape 4: Vérifier complétude
- La réponse couvre-t-elle toute la question?
- Les sources sont-elles citées?
- Manque-t-il des éléments?

═══════════════════════════════════════════════════════════════
STYLE DE RÉPONSE
═══════════════════════════════════════════════════════════════

- Professionnel mais accessible
- Structuré (titres, listes si pertinent)
- Juridiquement précis
- Citations textuelles quand nécessaire
- Pas de "robot lawyer" vibes - rester humain

═══════════════════════════════════════════════════════════════

Maintenant, analyse les chunks fournis et réponds à la question de l'utilisateur.
`;
```

**Modifications code:**
- Remplacer le `systemPrompt` actuel par celui ci-dessus
- S'assurer que les chunks sont bien passés dans le contexte
- Vérifier que le grounding est DÉSACTIVÉ par défaut (on veut forcer l'analyse PDF d'abord)

---

## ✅ TODO 2: Pré-processing de la Question

**Nouveau fichier:** `lib/question-processor.ts`

**Objectif:** Expander la question en plusieurs variantes sémantiques pour améliorer le recall.

```typescript
/**
 * Expand user question into semantic variants
 * Improves RAG recall by searching multiple phrasings
 */

export interface ExpandedQuery {
  original: string;
  variants: string[];
  keywords: string[];
  legalTerms: string[];
}

/**
 * Generate 2-3 semantic variants of the question
 */
export async function expandQuery(question: string): Promise<ExpandedQuery> {
  // 1. Extract legal keywords
  const keywords = extractLegalKeywords(question);
  
  // 2. Identify legal terms (articles, codes, obligations, etc.)
  const legalTerms = extractLegalTerms(question);
  
  // 3. Generate variants (simpler rephrasing for MVP)
  const variants = generateVariants(question, keywords);
  
  return {
    original: question,
    variants,
    keywords,
    legalTerms
  };
}

/**
 * Extract legal keywords from question
 */
function extractLegalKeywords(question: string): string[] {
  const legalWords = [
    'obligation', 'responsabilité', 'garantie', 'contrat', 'vente',
    'procédure', 'litige', 'immatriculation', 'capitaine', 'vendeur',
    'acheteur', 'vice caché', 'maritime', 'yacht', 'bateau',
    'article', 'loi', 'code', 'règlement', 'directive'
  ];
  
  const words = question.toLowerCase().split(/\s+/);
  return words.filter(word => legalWords.includes(word));
}

/**
 * Extract legal term patterns (Article X, Loi Y, etc.)
 */
function extractLegalTerms(question: string): string[] {
  const patterns = [
    /article\s+\d+/gi,
    /loi\s+\w+/gi,
    /code\s+\w+/gi,
    /règlement\s+\w+/gi
  ];
  
  const terms: string[] = [];
  patterns.forEach(pattern => {
    const matches = question.match(pattern);
    if (matches) terms.push(...matches);
  });
  
  return terms;
}

/**
 * Generate 2-3 semantic variants
 */
function generateVariants(question: string, keywords: string[]): string[] {
  const variants: string[] = [];
  
  // Variant 1: Focus sur le quoi
  if (question.toLowerCase().includes('quelles sont')) {
    variants.push(question.replace(/quelles sont/i, 'définir'));
  }
  
  // Variant 2: Focus sur le comment
  if (question.toLowerCase().includes('comment')) {
    variants.push(question.replace(/comment/i, 'procédure pour'));
  }
  
  // Variant 3: Reformulation avec keywords
  if (keywords.length > 0) {
    variants.push(`Information sur ${keywords.join(', ')}`);
  }
  
  // Limiter à 2-3 variantes pertinentes
  return variants.slice(0, 3).filter(v => v !== question);
}
```

**Intégration dans `app/api/chat/route.ts`:**

```typescript
import { expandQuery } from '@/lib/question-processor';
import { retrieveRelevantChunks } from '@/lib/rag-pipeline';

// Dans la route POST:
const userMessage = body.message;

// Expand query
const expanded = await expandQuery(userMessage);

// Search with original + variants
const allChunks = await Promise.all([
  retrieveRelevantChunks(expanded.original),
  ...expanded.variants.map(v => retrieveRelevantChunks(v))
]);

// Deduplicate and merge
const uniqueChunks = deduplicateChunks(allChunks.flat());

// Pass to Gemini
const answer = await generateAnswer(userMessage, uniqueChunks);
```

---

## ✅ TODO 3: Logging Détaillé

**Nouveau fichier:** `lib/gemini-logger.ts`

```typescript
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface GeminiLogEntry {
  timestamp: string;
  question: string;
  chunksProvided: number;
  chunksPreviews: string[];
  response: string;
  sourcesCited: string[];
  usedInternet: boolean;
  latency: number;
}

/**
 * Log Gemini interaction for debugging
 */
export function logGeminiInteraction(data: Omit<GeminiLogEntry, 'timestamp'>) {
  const logDir = join(process.cwd(), 'logs');
  const logFile = join(logDir, 'gemini-rag.log');
  
  // Ensure logs directory exists
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  
  const logEntry: GeminiLogEntry = {
    timestamp: new Date().toISOString(),
    ...data
  };
  
  // Console output (for dev)
  console.log('\n' + '═'.repeat(80));
  console.log('[GEMINI RAG LOG]');
  console.log('═'.repeat(80));
  console.log(`📝 Question: ${logEntry.question}`);
  console.log(`📚 Chunks fournis: ${logEntry.chunksProvided}`);
  console.log(`📖 Sources citées: ${logEntry.sourcesCited.length}`);
  console.log(`🌐 Fallback internet: ${logEntry.usedInternet ? 'OUI ❌' : 'NON ✅'}`);
  console.log(`⏱️  Latence: ${logEntry.latency}ms`);
  console.log('═'.repeat(80) + '\n');
  
  // File output (for analysis)
  appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}

/**
 * Extract citations from Gemini response
 */
export function extractCitations(response: string): string[] {
  const citationPattern = /\[Source:\s*([^\]]+)\]/g;
  const citations: string[] = [];
  
  let match;
  while ((match = citationPattern.exec(response)) !== null) {
    citations.push(match[1]);
  }
  
  return citations;
}

/**
 * Detect if Gemini used internet fallback
 */
export function detectInternetFallback(response: string): boolean {
  const internetPatterns = [
    /selon (internet|google|web|recherche)/i,
    /d'après mes recherches/i,
    /information trouvée en ligne/i,
    /source\s*:\s*(internet|web|google)/i
  ];
  
  return internetPatterns.some(pattern => pattern.test(response));
}
```

**Intégration dans `lib/gemini.ts`:**

```typescript
import { logGeminiInteraction, extractCitations, detectInternetFallback } from './gemini-logger';

export async function generateAnswer(prompt: string, chunks: any[]) {
  const startTime = Date.now();
  
  // ... existing code to generate answer ...
  
  const latency = Date.now() - startTime;
  
  // Log interaction
  logGeminiInteraction({
    question: prompt,
    chunksProvided: chunks.length,
    chunksPreviews: chunks.slice(0, 3).map(c => c.chunk_text.substring(0, 100) + '...'),
    response: answer,
    sourcesCited: extractCitations(answer),
    usedInternet: detectInternetFallback(answer),
    latency
  });
  
  return answer;
}
```

**Créer aussi:** `logs/.gitkeep` pour tracker le dossier

---

## 🧪 TESTS À FAIRE

**Test manuel via curl:**

```bash
# Démarrer le serveur
npm run dev

# Dans un autre terminal
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quelles sont les obligations du vendeur dans un contrat de vente de yacht?"
  }' | jq '.sources'

# Vérifier les logs
tail -f logs/gemini-rag.log
```

**Critères de succès:**
- ✅ Réponse contient 3+ citations `[Source: ...]`
- ✅ Pas de fallback internet si chunks pertinents disponibles
- ✅ Logs montrent analyse détaillée
- ✅ Sources correspondent aux documents dans la base

---

## 📊 CRITÈRES DE SUCCÈS

| Critère | Attendu | Vérification |
|---------|---------|--------------|
| System prompt renforcé | ✅ | Code review lib/gemini.ts |
| Question expansion | 2-3 variantes | Test question-processor.ts |
| Logging détaillé | ✅ | Vérifier logs/ après test |
| Citations PDF | 3+ par réponse | Test manuel curl |
| Fallback internet | <20% des cas | Analyser logs |

---

## 📝 LIVRABLE

À la fin de la mission, fournir:

1. **Fichiers modifiés:**
   - `lib/gemini.ts` (nouveau system prompt + logging)
   - `app/api/chat/route.ts` (integration question expansion)

2. **Nouveaux fichiers:**
   - `lib/question-processor.ts` (expansion queries)
   - `lib/gemini-logger.ts` (logging module)
   - `logs/.gitkeep`

3. **Screenshot/exemple:**
   - Copie d'une réponse avec 3+ citations
   - Extrait du fichier `logs/gemini-rag.log`

4. **Metrics:**
   - Nombre de citations moyen par réponse
   - Taux de fallback internet (%)
   - Latence moyenne (ms)

---

## ⚠️ CONTRAINTES

- **Garder** le ton conversationnel (pas de "robot lawyer")
- **Ne PAS** casser l'API existante (`/api/chat`)
- **Tester** avec questions réelles avant de livrer
- **Logger** sans impacter les performances (<50ms overhead)

---

**ANTIGRAVIT, à toi de jouer ! Attends confirmation de l'orchestrateur avant de commencer.**
