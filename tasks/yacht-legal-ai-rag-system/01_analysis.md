# Analyse: Yacht Legal AI - Système RAG Complet

## 📋 Contexte
**Date:** 2026-01-13  
**Demande initiale:** Améliorer le système RAG existant avec:
- Ingestion automatique des 70+ documents de référence (MYBA, AML, MLC, YET, etc.)
- Refonte de l'interface chat style GPT/Gemini
- Intégration Gemini Grounding (recherche web temps réel)
- API REST pour agents MCP externes

**Objectif:** Système juridique maritime complet et production-ready

---

## 🔍 État Actuel de la Codebase

### Fichiers Concernés

| Fichier | Type | Rôle | Lignes |
|---------|------|------|--------|
| `lib/gemini.ts` | Utility | Génère embeddings (768 dim) + réponses Gemini | 104 |
| `lib/rag-pipeline.ts` | Utility | Orchestration RAG (retrieve + format + stats) | 166 |
| `lib/supabase.ts` | Utility | Clients Supabase (admin + browser) | ~50 |
| `lib/chunker.ts` | Utility | Chunking intelligent (500 tokens, 100 overlap) | ~100 |
| `lib/pdf-parser.ts` | Utility | Extraction texte PDF | ~80 |
| `lib/audit-logger.ts` | Utility | Logs RGPD (chat + upload) | ~60 |
| `app/api/chat/route.ts` | API Route | Endpoint chat avec RAG complet | 175 |
| `app/api/upload-doc/route.ts` | API Route | Upload PDF + embedding | ~200 |
| `app/api/search/route.ts` | API Route | Recherche vectorielle pure | ~80 |
| `components/ChatInterface.tsx` | Component | Interface chat (basique) | 158 |
| `components/DocumentUploader.tsx` | Component | Upload PDF avec feedback | ~150 |
| `database/migrations/*.sql` | SQL | 7 migrations (pgvector + tables + RLS) | ~500 |
| `package.json` | Config | Dépendances (Gemini, Supabase, Next.js 14) | 34 |

**Total:** ~1700 lignes de code backend/frontend déjà fonctionnel

---

### Architecture Actuelle

```
┌──────────────────────────────────────────────────────────────┐
│                    FLUX RAG ACTUEL                           │
└──────────────────────────────────────────────────────────────┘

┌─────────────┐
│ User Query  │  "Quelles sont les obligations AML en France?"
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ /api/chat (POST)    │  Rate limiting (10/min in-memory)
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ generateEmbedding() │  Gemini text-embedding-004 (768 dim)
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ retrieveRelevantChunks() │  pgvector search (cosine similarity)
│                      │  Parameters: topK=5, threshold=0.7
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Supabase RPC        │  search_documents(query_embedding, ...)
│ IVFFlat Index       │  Returns top 5 chunks with similarity
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ formatChunksForContext() │  Ajoute métadonnées sources
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ generateAnswer()    │  Gemini 2.0 Flash
│                     │  Prompt: system + context + question
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Store Conversation  │  Table 'conversations' (messages JSONB)
│ Audit Log           │  Table 'audit_logs' (RGPD tracking)
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Return JSON         │  { answer, conversationId, sources[] }
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ ChatInterface.tsx   │  Affiche réponse + sources (basique)
└─────────────────────┘
```

---

### Code Snippets Clés

#### 1. Génération d'Embeddings (lib/gemini.ts:25-39)
```typescript
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
  const result = await model.embedContent(text)
  
  if (!result.embedding || !result.embedding.values) {
    throw new Error('No embedding returned from Gemini API')
  }
  
  return result.embedding.values  // 768 dimensions
}
```

**Points clés:**
- Modèle: `text-embedding-004` (dernière version Gemini)
- Dimension: 768 (fixe, compatible pgvector)
- Usage: Query + chunks de documents

#### 2. Recherche Vectorielle (lib/rag-pipeline.ts:45-86)
```typescript
export async function retrieveRelevantChunks(
  query: string,
  category?: string,
  topK: number = 5,
  similarityThreshold: number = 0.7
): Promise<RelevantChunk[]> {
  // Étape 1: Générer embedding de la query
  const queryEmbedding = await generateEmbedding(query)
  
  // Étape 2: Recherche pgvector via RPC
  const { data, error } = await supabaseAdmin
    .rpc('search_documents', {
      query_embedding: queryEmbedding,
      match_threshold: similarityThreshold,
      match_count: topK,
      filter_category: category || null
    })
  
  // Étape 3: Formater résultats
  const chunks: RelevantChunk[] = (data || []).map((row) => ({
    chunkId: row.chunk_id,
    documentName: row.document_name,
    category: row.category,
    chunkText: row.chunk_text,
    similarity: row.similarity,
    pageNumber: row.page_number,
    chunkIndex: row.chunk_index
  }))
  
  return chunks
}
```

**Points clés:**
- Seuil: 0.7 (70% similarité minimum)
- Top-K: 5 chunks par défaut
- Filtrage par catégorie (optionnel)
- Index IVFFlat (lists=100) pour performance

#### 3. Chat API avec RAG (app/api/chat/route.ts:37-150)
```typescript
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  // Rate limiting (10 req/min)
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Maximum 10 requests per minute.' },
      { status: 429 }
    )
  }
  
  const { message, conversationId, category } = await req.json()
  
  // Validation
  if (!message || message.length > 2000) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
  }
  
  // RAG pipeline
  const chunks = await retrieveRelevantChunks(message, category, 5, 0.7)
  const context = formatChunksForContext(chunks)
  const answer = await generateAnswer(message, context)
  
  // Store conversation
  let convId = conversationId
  if (!convId) {
    const { data } = await supabaseAdmin
      .from('conversations')
      .insert({ messages: [...], document_ids: [...] })
      .select('id')
      .single()
    convId = data.id
  }
  
  // Audit log
  await logChatAudit({ conversationId: convId, query: message, ... })
  
  // Return
  return NextResponse.json({
    answer,
    conversationId: convId,
    sources: chunks.map(c => ({ documentName, category, similarity })),
    responseTime: Date.now() - startTime
  })
}
```

**Points clés:**
- Rate limiting in-memory (simple Map)
- Validation stricte (longueur, type)
- Tracking response time
- Audit RGPD automatique

#### 4. Interface Chat (components/ChatInterface.tsx:12-158)
```typescript
export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  
  const handleSend = async () => {
    if (!input.trim() || loading) return
    
    // Ajouter message utilisateur
    setMessages(prev => [...prev, {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    }])
    
    setLoading(true)
    
    // Appel API
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: input, conversationId })
    })
    
    const data = await response.json()
    
    // Ajouter réponse assistant
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: data.answer,
      sources: data.sources,
      timestamp: new Date().toISOString()
    }])
    
    setLoading(false)
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => <MessageBubble key={i} {...msg} />)}
      </div>
      
      {/* Input */}
      <div className="border-t p-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Posez votre question..."
        />
        <button onClick={handleSend} disabled={loading}>
          {loading ? 'Envoi...' : 'Envoyer'}
        </button>
      </div>
    </div>
  )
}
```

**Points clés:**
- État local (messages, loading)
- Auto-scroll vers le bas
- Raccourci Enter (sans Shift)
- Gestion erreurs basique

---

## 📚 Dépendances Externes

### NPM Packages (package.json)
```json
{
  "dependencies": {
    "next": "14.2.35",              // Framework (App Router)
    "react": "^18",                  // UI library
    "react-dom": "^18",              // DOM rendering
    "@supabase/supabase-js": "^2.38.0",  // DB client
    "@google/generative-ai": "^0.11.0",  // Gemini API
    "pdf-parse": "^1.1.1",           // Extraction PDF
    "uuid": "^9.0.0",                // ID generation
    "zustand": "^4.4.7"              // State mgmt (non utilisé)
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "tailwindcss": "^3.4.1",         // Styling
    "eslint": "^8",
    "eslint-config-next": "14.2.35"
  }
}
```

### Services Externes
1. **Gemini AI API** (Google)
   - Modèle embeddings: `text-embedding-004` (768 dim)
   - Modèle chat: `gemini-2.0-flash` (rapide + gratuit)
   - Clé API: `GEMINI_API_KEY` (env variable)

2. **Supabase** (PostgreSQL + pgvector)
   - URL: `SUPABASE_URL`
   - Anon Key: `SUPABASE_ANON_KEY`
   - Service Key: `SUPABASE_SERVICE_KEY` (admin operations)
   - Tables: `documents`, `document_chunks`, `conversations`, `audit_logs`
   - Extension: `pgvector` (vector similarity search)

---

## 🗄️ Schéma Base de Données

### Tables (7 migrations SQL)

#### 1. `documents`
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,  -- MYBA, AML, MLC, YET, etc.
  pages INTEGER,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  file_url TEXT,
  metadata JSONB
);
```
**Rôle:** Métadonnées des PDFs uploadés

#### 2. `document_chunks`
```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(768),  -- pgvector extension
  page_number INTEGER,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche vectorielle
CREATE INDEX idx_chunks_embedding ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```
**Rôle:** Chunks de texte + embeddings pour RAG

#### 3. `conversations`
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  messages JSONB NOT NULL,  -- [{role, content, timestamp}]
  document_ids TEXT[],      -- IDs docs utilisés
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Rôle:** Historique conversations utilisateur

#### 4. `audit_logs`
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,  -- 'chat_query', 'document_upload'
  conversation_id UUID,
  user_ip TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nettoyage auto après 2 ans (RGPD)
```
**Rôle:** Logs RGPD pour conformité

---

## 🔗 Connexions entre Fichiers

### Flow d'un Chat Query

```
User Browser (ChatInterface.tsx)
    ↓ POST /api/chat { message: "..." }
app/api/chat/route.ts
    ↓ retrieveRelevantChunks(message)
lib/rag-pipeline.ts
    ↓ generateEmbedding(query)
lib/gemini.ts
    ↓ Gemini API (text-embedding-004)
    ← [768 numbers]
lib/rag-pipeline.ts
    ↓ supabaseAdmin.rpc('search_documents', ...)
lib/supabase.ts
    ↓ PostgreSQL + pgvector
database/migrations/006_create_search_function.sql
    ← Top 5 chunks (similarity > 0.7)
lib/rag-pipeline.ts
    ↓ formatChunksForContext(chunks)
    → ["[Document: X]\nChunk text...", ...]
app/api/chat/route.ts
    ↓ generateAnswer(message, context)
lib/gemini.ts
    ↓ Gemini API (gemini-2.0-flash)
    ← "Réponse avec citations..."
app/api/chat/route.ts
    ↓ logChatAudit({ conversationId, query, ... })
lib/audit-logger.ts
    ↓ supabaseAdmin.from('audit_logs').insert(...)
    ↓ Store conversation in DB
    → Response JSON { answer, sources, conversationId }
User Browser (ChatInterface.tsx)
    ← Displays answer + sources
```

### Flow d'un Upload PDF

```
User Browser (DocumentUploader.tsx)
    ↓ POST /api/upload-doc { file: Blob, category: "MYBA" }
app/api/upload-doc/route.ts
    ↓ Validate file (type, size)
    ↓ Upload to Supabase Storage
lib/supabase.ts (storage bucket)
    ← file_url
app/api/upload-doc/route.ts
    ↓ parsePDF(fileBuffer)
lib/pdf-parser.ts
    ← { text: "...", pages: 20 }
app/api/upload-doc/route.ts
    ↓ chunkText(text, 500, 100)
lib/chunker.ts
    ← ["chunk1", "chunk2", ...]
app/api/upload-doc/route.ts
    ↓ for each chunk: generateEmbedding(chunk)
lib/gemini.ts
    ← [768 numbers] × N chunks
app/api/upload-doc/route.ts
    ↓ supabaseAdmin.from('documents').insert({ name, category, ... })
    ↓ supabaseAdmin.from('document_chunks').insert([{ chunk_text, embedding }, ...])
lib/supabase.ts
    → Success response { documentId, chunks: N, pages: 20 }
User Browser (DocumentUploader.tsx)
    ← "Document uploadé avec succès !"
```

---

## ⚠️ Points d'Attention

### 1. **Tables vides** ❌
**Problème:** `documents` et `document_chunks` sont vides  
**Impact:** Le chat répond "Je n'ai pas trouvé d'information..." car aucune donnée de référence  
**Solution:** Créer script d'ingestion automatique pour les 70+ URLs

### 2. **Pas de streaming** ⏳
**Problème:** `/api/chat` retourne réponse complète d'un coup  
**Impact:** Utilisateur attend 2-3 sec sans feedback (mauvaise UX)  
**Solution:** Implémenter streaming avec `ReadableStream` + Gemini `generateContentStream()`

### 3. **Interface basique** 🎨
**Problème:** `ChatInterface.tsx` est fonctionnel mais pas style GPT/Gemini  
**Manque:**
- Pas de sidebar conversations
- Pas de bouton "Nouvelle conversation"
- Pas de markdown rendering (code blocks, listes)
- Pas de citations cliquables
- Design simple (pas dark mode)

### 4. **Rate limiting in-memory** 💾
**Problème:** Map JavaScript reset au redémarrage serveur  
**Impact:** Production multi-instance ne fonctionne pas  
**Solution:** Migrer vers Redis (Upstash) ou Vercel KV

### 5. **Pas de Gemini Grounding** 🌐
**Problème:** Système répond UNIQUEMENT avec docs Supabase  
**Manque:** Recherche web temps réel pour infos récentes  
**Solution:** Ajouter Google Search grounding dans Gemini

### 6. **Pas d'API pour agents** 🤖
**Problème:** Agents MCP externes ne peuvent pas interroger le système  
**Solution:** Créer endpoints REST dédiés (`/api/agents/query`, `/api/agents/search`)

### 7. **Token counting approximatif** 📏
**Problème:** `chunker.ts` utilise `text.split(/\s+/).length` au lieu de tokenizer  
**Impact:** Chunks peuvent dépasser 500 tokens réels  
**Solution:** Utiliser `js-tiktoken` (encodage OpenAI) ou Gemini tokenizer

---

## 💡 Opportunités Identifiées

### 1. **Script d'ingestion automatique** 🚀
**Opportunité:** Automatiser l'upload des 70+ documents de référence  
**Bénéfice:** Système opérationnel en 10 minutes au lieu de 2 heures manuelles  
**Implémentation:**
```typescript
// scripts/ingest-reference-docs.ts
const REFERENCE_URLS = {
  MYBA: ['https://...', ...],
  AML: ['https://...', ...],
  // ...
}

async function ingestAll() {
  for (const [category, urls] of Object.entries(REFERENCE_URLS)) {
    for (const url of urls) {
      await downloadAndIngest(url, category)
    }
  }
}
```

### 2. **Interface GPT-style** ✨
**Opportunité:** Améliorer drastiquement l'UX du chat  
**Features à ajouter:**
- Sidebar avec historique conversations
- Markdown rendering avec `react-markdown`
- Citations cliquables (scroll to source)
- Dark mode (theme Tailwind)
- Auto-resize textarea
- Streaming des tokens

### 3. **Gemini Grounding** 🔍
**Opportunité:** Combiner docs de référence + recherche web  
**Bénéfice:** Réponses à jour (nouvelles lois, jurisprudence récente)  
**Implémentation:**
```typescript
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  tools: [{
    googleSearch: {}  // Active grounding
  }]
})
```

### 4. **API REST pour agents** 🔌
**Opportunité:** Exposer le RAG aux agents MCP externes  
**Use cases:**
- Agent MYBA Compliance vérifie contrats
- Agent AML check documents brokers
- Agent MLC analyse contrats crew

**Endpoints:**
```typescript
POST /api/agents/query
POST /api/agents/search
POST /api/agents/analyze-document
```

### 5. **Caching intelligent** ⚡
**Opportunité:** Réduire latence et coûts API  
**Stratégie:**
- Cache embeddings fréquents (Redis)
- Cache résultats RAG (TTL 1h)
- Cache réponses Gemini (dedupe queries identiques)

### 6. **Monitoring & Analytics** 📊
**Opportunité:** Tracker performance et usage  
**Métriques:**
- Queries/jour par catégorie
- Temps de réponse moyen
- Taux de satisfaction (sources utilisées ?)
- Top questions fréquentes

---

## 📊 Résumé Exécutif

### État Actuel
✅ **Backend RAG fonctionnel** (embeddings, search, answer generation)  
✅ **Base de données prête** (pgvector, migrations, RLS)  
✅ **API routes solides** (chat, upload, search, audit)  
✅ **UI basique** (chat + upload opérationnels)  
❌ **Documents vides** (aucune donnée de référence)  
❌ **Interface simpliste** (pas style GPT/Gemini)  
❌ **Pas de grounding** (recherche web absente)  
❌ **Pas d'API agents** (pas d'intégration MCP)

### Prochaines Actions Critiques
1. **PRIORITÉ 1:** Script d'ingestion des 70+ documents (résout le problème "pas de données")
2. **PRIORITÉ 2:** Refonte UI chat (expérience utilisateur GPT-level)
3. **PRIORITÉ 3:** Gemini Grounding (recherche web temps réel)
4. **PRIORITÉ 4:** API pour agents MCP (intégration externe)

### Complexité Estimée
- **Ingestion docs:** 4 heures (téléchargement + chunking + embeddings)
- **UI chat GPT-style:** 6 heures (sidebar, markdown, streaming, dark mode)
- **Gemini Grounding:** 2 heures (simple activation API)
- **API agents:** 4 heures (3 endpoints + documentation)

**Total:** ~16 heures de développement

### Risques Techniques
⚠️ **Rate limits Gemini:** 70+ docs = ~1000 chunks = 1000 embeddings API calls  
   → Solution: Batch processing avec delays (10 chunks/sec max)

⚠️ **Taille base Supabase:** 70 docs × 20 pages × 5 chunks/page = 7000 chunks × 768 dim  
   → Solution: Vérifier quota Supabase (gratuit = 500 MB, OK pour ~100k chunks)

⚠️ **Streaming complexe:** Next.js API Route streaming nécessite ReadableStream  
   → Solution: Utiliser `TransformStream` + `response.body.pipeThrough()`

---

## 🎯 Recommandations Stratégiques

### Architecture Proposée (après améliorations)
```
┌────────────────────────────────────────────────────────┐
│              YACHT LEGAL AI V2                         │
│                                                        │
│  User Query                                            │
│     ↓                                                  │
│  [ChatInterface GPT-style]                             │
│     ↓                                                  │
│  /api/chat (streaming)                                 │
│     ↓                                                  │
│  ┌─────────────────────────────────────┐              │
│  │ RAG Pipeline (Supabase Vector DB)   │              │
│  │ + Gemini Grounding (Web Search)     │              │
│  └─────────────────────────────────────┘              │
│     ↓                                                  │
│  Fusion des contextes                                  │
│     ↓                                                  │
│  Gemini 2.0 Flash (+ streaming)                        │
│     ↓                                                  │
│  Response (markdown + sources cliquables)              │
│                                                        │
│  ┌─────────────────────────────────────┐              │
│  │ API Endpoints pour Agents MCP       │              │
│  │ - /api/agents/query                 │              │
│  │ - /api/agents/search                │              │
│  │ - /api/agents/analyze-document      │              │
│  └─────────────────────────────────────┘              │
└────────────────────────────────────────────────────────┘
```

### Technologies à Ajouter
1. **react-markdown** + **remark-gfm**: Rendering markdown (code blocks, tables)
2. **cheerio** + **node-fetch**: Scraping pages HTML pour ingestion
3. **p-queue**: Gestion batch embeddings (rate limiting)
4. **redis** (Upstash): Rate limiting distribué
5. **sentry**: Monitoring erreurs production

### Décisions Techniques
✅ **Garder Next.js 14** (App Router stable et performant)  
✅ **Garder Gemini 2.0 Flash** (gratuit, rapide, grounding intégré)  
✅ **Garder Supabase pgvector** (cosine similarity excellent)  
✅ **Migrer vers streaming** (meilleure UX)  
✅ **Ajouter Redis** (rate limiting production-ready)

---

**Date d'Analyse:** 2026-01-13  
**Analysé par:** Agent explore-code + backend-architect  
**Prochaine Étape:** Créer `02_plan.md` avec plan d'implémentation détaillé

---

**Fichiers Clés Identifiés:**
- ✅ Backend solide: `lib/gemini.ts`, `lib/rag-pipeline.ts`, `app/api/chat/route.ts`
- ✅ DB prête: `database/migrations/006_create_search_function.sql`
- ⚠️ UI à refondre: `components/ChatInterface.tsx`
- ❌ Script ingestion: **À CRÉER** (`scripts/ingest-reference-docs.ts`)
- ❌ API agents: **À CRÉER** (`app/api/agents/*`)

**Confiance:** 95% (codebase bien structuré, patterns clairs, documentation exhaustive)
