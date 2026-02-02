# Plan d'Implémentation: Yacht Legal AI - RAG System V2

## 📋 Informations
**Date:** 2026-01-13  
**Basé sur:** 01_analysis.md  
**Approche:** Implémentation séquentielle en 4 phases  
**Durée estimée:** 16 heures  

---

## 🎯 Objectif Final

Transformer le MVP actuel en système RAG production-ready avec:
1. **70+ documents de référence** ingérés automatiquement
2. **Interface chat GPT-style** (sidebar, markdown, streaming, dark mode)
3. **Gemini Grounding** (recherche web temps réel)
4. **API REST** pour agents MCP externes

---

## 📊 Gap Analysis

| État Actuel | État Cible | Action Requise |
|-------------|------------|----------------|
| Tables `documents` et `document_chunks` vides | 70+ docs indexés (7000+ chunks) | Créer script d'ingestion automatique |
| Interface chat basique (textarea + bouton) | UI GPT-style (sidebar, markdown, streaming) | Refonte complète `ChatInterface.tsx` |
| Réponse complète d'un coup (no streaming) | Tokens progressifs (streaming) | Modifier `/api/chat` avec ReadableStream |
| RAG uniquement sur docs Supabase | RAG + recherche web (Gemini Grounding) | Activer Google Search dans Gemini |
| Pas d'API pour agents externes | 3 endpoints REST (`/query`, `/search`, `/analyze`) | Créer routes `/api/agents/*` |
| Rate limiting in-memory (Map) | Rate limiting distribué (Redis) | Optionnel (peut rester in-memory pour MVP) |

---

## 🏗️ Architecture Proposée

```
┌───────────────────────────────────────────────────────────────┐
│                   YACHT LEGAL AI V2                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Frontend (Next.js 14 App Router)                   │     │
│  │                                                      │     │
│  │  [ChatInterface GPT-style]                          │     │
│  │  - Sidebar conversations                            │     │
│  │  - Markdown rendering (react-markdown)              │     │
│  │  - Citations cliquables                             │     │
│  │  - Dark mode Tailwind                               │     │
│  │  - Streaming tokens (useEffect + ReadableStream)    │     │
│  │                                                      │     │
│  │  [Upload optional PDF]                              │     │
│  │  - Drag & drop                                      │     │
│  │  - Analyse temporaire (pas stocké)                  │     │
│  └──────────────────┬───────────────────────────────────┘     │
│                     │                                         │
│                     ▼                                         │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  API Routes (Next.js App Router)                    │     │
│  │                                                      │     │
│  │  POST /api/chat (streaming)                         │     │
│  │  ├─ Rate limiting (10/min)                          │     │
│  │  ├─ RAG pipeline (Supabase Vector)                  │     │
│  │  ├─ Gemini Grounding (Google Search)                │     │
│  │  ├─ Gemini 2.0 Flash (streaming)                    │     │
│  │  └─ Audit logging (RGPD)                            │     │
│  │                                                      │     │
│  │  POST /api/agents/query                             │     │
│  │  POST /api/agents/search                            │     │
│  │  POST /api/agents/analyze-document                  │     │
│  │  ├─ API Key auth                                    │     │
│  │  └─ Rate limiting (agent-specific)                  │     │
│  └──────────────────┬───────────────────────────────────┘     │
│                     │                                         │
│                     ▼                                         │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Backend Libraries (lib/)                           │     │
│  │                                                      │     │
│  │  ✅ lib/gemini.ts (embeddings + chat + grounding)   │     │
│  │  ✅ lib/rag-pipeline.ts (search + format)           │     │
│  │  ✅ lib/supabase.ts (admin + browser)               │     │
│  │  ✅ lib/chunker.ts (intelligent chunking)           │     │
│  │  ✅ lib/pdf-parser.ts (extraction)                  │     │
│  │  ✅ lib/audit-logger.ts (RGPD logs)                 │     │
│  │  🆕 lib/web-scraper.ts (fetch HTML → text)          │     │
│  └──────────────────┬───────────────────────────────────┘     │
│                     │                                         │
│                     ▼                                         │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Database (Supabase PostgreSQL + pgvector)          │     │
│  │                                                      │     │
│  │  ✅ documents (70+ refs)                            │     │
│  │  ✅ document_chunks (7000+ chunks + embeddings)     │     │
│  │  ✅ conversations (historique)                      │     │
│  │  ✅ audit_logs (RGPD)                               │     │
│  │  🆕 agent_credentials (API keys agents)             │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Scripts (scripts/)                                 │     │
│  │                                                      │     │
│  │  🆕 ingest-reference-docs.ts                        │     │
│  │  ├─ Parse 70+ URLs (PDF + HTML)                     │     │
│  │  ├─ Download & extract text                         │     │
│  │  ├─ Chunk (500 tokens, 100 overlap)                 │     │
│  │  ├─ Generate embeddings (batch 10)                  │     │
│  │  └─ Store in Supabase                               │     │
│  └──────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
```

---

## 📝 Checklist Technique (Step-by-Step)

### Phase 1: Script d'Ingestion des Documents de Référence ⏱️ 4h

#### **1.1** - Créer le fichier de référence des URLs 📄
**Action:** Créer `scripts/reference-urls.ts`  
**Contenu:**
```typescript
export const REFERENCE_DOCS = {
  MYBA: [
    { url: 'https://www.charteranddreams.com/...MYBA-2017.pdf', name: 'MYBA 2017 E-Contract', type: 'pdf' },
    { url: 'https://ionian-ray.com/...MYBA-E-Contract.pdf', name: 'MYBA Specimen 2024', type: 'pdf' },
    // ... 10 URLs MYBA
  ],
  AML_KYC: [
    { url: 'https://rosemont-int.com/...aml-laws-yacht-brokers...', name: 'AML Laws EU', type: 'html' },
    // ... 5 URLs
  ],
  MLC_2006: [...],
  PAVILLONS: [...],
  YET: [...],
  IA_RGPD: [...]
}
```
**Validation:** Fichier existe avec 70+ URLs structurées

---

#### **1.2** - Créer le web scraper pour pages HTML 🌐
**Action:** Créer `lib/web-scraper.ts`  
**Dépendances:** `npm install cheerio node-fetch`  
**Code pattern:**
```typescript
import cheerio from 'cheerio'
import fetch from 'node-fetch'

export async function scrapeWebPage(url: string): Promise<string> {
  const response = await fetch(url)
  const html = await response.text()
  const $ = cheerio.load(html)
  
  // Remove scripts, styles, nav
  $('script, style, nav, header, footer').remove()
  
  // Extract main content
  const mainContent = $('main, article, .content, body').text()
  
  // Clean whitespace
  return mainContent.replace(/\s+/g, ' ').trim()
}
```
**Validation:** Tester avec 1 URL HTML, vérifier texte extrait

---

#### **1.3** - Créer le script d'ingestion principal 🚀
**Action:** Créer `scripts/ingest-reference-docs.ts`  
**Logique:**
```typescript
import { REFERENCE_DOCS } from './reference-urls'
import { parsePDF } from '../lib/pdf-parser'
import { scrapeWebPage } from '../lib/web-scraper'
import { chunkText } from '../lib/chunker'
import { generateEmbedding } from '../lib/gemini'
import { supabaseAdmin } from '../lib/supabase'

async function ingestDocument(doc: { url: string, name: string, type: 'pdf' | 'html' }, category: string) {
  console.log(`📄 Ingestion de ${doc.name}...`)
  
  // 1. Télécharger et extraire texte
  let text: string
  if (doc.type === 'pdf') {
    const response = await fetch(doc.url)
    const buffer = await response.arrayBuffer()
    const parsed = await parsePDF(Buffer.from(buffer))
    text = parsed.text
  } else {
    text = await scrapeWebPage(doc.url)
  }
  
  // 2. Stocker document dans DB
  const { data: document } = await supabaseAdmin
    .from('documents')
    .insert({
      name: doc.name,
      category,
      file_url: doc.url,
      metadata: { source: doc.url, type: doc.type }
    })
    .select('id')
    .single()
  
  // 3. Chunker le texte
  const chunks = chunkText(text, 500, 100)
  console.log(`  ✂️ ${chunks.length} chunks créés`)
  
  // 4. Générer embeddings (batch de 10 pour rate limiting)
  const chunkRecords = []
  for (let i = 0; i < chunks.length; i += 10) {
    const batch = chunks.slice(i, i + 10)
    const embeddings = await Promise.all(batch.map(c => generateEmbedding(c)))
    
    batch.forEach((chunkText, j) => {
      chunkRecords.push({
        document_id: document.id,
        chunk_index: i + j,
        chunk_text: chunkText,
        embedding: embeddings[j],
        token_count: Math.ceil(chunkText.split(/\s+/).length)
      })
    })
    
    console.log(`  🔢 Batch ${Math.floor(i/10) + 1}/${Math.ceil(chunks.length/10)} embeddings générés`)
    await new Promise(resolve => setTimeout(resolve, 1000)) // Delay 1s entre batches
  }
  
  // 5. Insérer chunks dans DB
  await supabaseAdmin.from('document_chunks').insert(chunkRecords)
  console.log(`  ✅ ${doc.name} ingéré (${chunks.length} chunks)`)
}

async function main() {
  console.log('🚀 Début ingestion documents de référence\n')
  
  for (const [category, docs] of Object.entries(REFERENCE_DOCS)) {
    console.log(`\n📁 Catégorie: ${category}`)
    for (const doc of docs) {
      try {
        await ingestDocument(doc, category)
      } catch (error) {
        console.error(`  ❌ Erreur: ${doc.name}`, error)
      }
    }
  }
  
  console.log('\n✅ Ingestion terminée!')
}

main()
```
**Validation:** 
- Tester avec 1 doc PDF + 1 doc HTML
- Vérifier chunks dans Supabase

---

#### **1.4** - Créer commandes npm pour ingestion 📦
**Action:** Modifier `package.json`  
**Ajouter:**
```json
{
  "scripts": {
    "ingest:all": "tsx scripts/ingest-reference-docs.ts",
    "ingest:verify": "tsx scripts/verify-ingestion.ts"
  }
}
```
**Dépendances:** `npm install -D tsx` (TypeScript executor)  
**Validation:** `npm run ingest:all` fonctionne

---

#### **1.5** - Créer script de vérification 🔍
**Action:** Créer `scripts/verify-ingestion.ts`  
**Code:**
```typescript
import { getCorpusStats } from '../lib/rag-pipeline'

async function verify() {
  const stats = await getCorpusStats()
  
  console.log('📊 Statistiques Base Documentaire')
  console.log('─────────────────────────────────')
  console.log(`Documents totaux: ${stats.totalDocuments}`)
  console.log(`Chunks totaux: ${stats.totalChunks}`)
  console.log('\nPar catégorie:')
  
  for (const [category, count] of Object.entries(stats.categoryBreakdown)) {
    console.log(`  - ${category}: ${count} documents`)
  }
  
  if (stats.totalDocuments >= 70) {
    console.log('\n✅ Ingestion complète!')
  } else {
    console.warn(`\n⚠️ Manque ${70 - stats.totalDocuments} documents`)
  }
}

verify()
```
**Validation:** `npm run ingest:verify` affiche statistiques correctes

---

### Phase 2: Refonte Interface Chat GPT-Style ⏱️ 6h

#### **2.1** - Installer dépendances UI 📦
**Action:** Installer packages npm  
**Commandes:**
```bash
npm install react-markdown remark-gfm react-syntax-highlighter
npm install -D @types/react-syntax-highlighter
```
**Validation:** Packages dans `package.json`

---

#### **2.2** - Créer composant Markdown Renderer 📝
**Action:** Créer `components/MarkdownRenderer.tsx`  
**Code pattern:**
```typescript
'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          return !inline && match ? (
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
              {children}
            </code>
          )
        },
        a({ children, href }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {children}
            </a>
          )
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
```
**Validation:** Tester avec markdown contenant code blocks, listes, liens

---

#### **2.3** - Activer dark mode Tailwind 🌙
**Action:** Modifier `tailwind.config.ts`  
**Ajouter:**
```typescript
export default {
  darkMode: 'class', // Active dark mode avec classe
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0E0E0E',
          surface: '#1A1A1A',
          border: '#2A2A2A',
          text: '#E0E0E0',
          'text-muted': '#A0A0A0'
        }
      }
    }
  }
}
```
**Validation:** Classes `dark:bg-dark-bg` fonctionnent

---

#### **2.4** - Créer composant Sidebar Conversations 📂
**Action:** Créer `components/ConversationSidebar.tsx`  
**Code pattern:**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { supabaseBrowser } from '@/lib/supabase'

interface Conversation {
  id: string
  title: string
  last_message_at: string
}

export function ConversationSidebar({ 
  currentConvId, 
  onSelectConv 
}: {
  currentConvId: string | null
  onSelectConv: (id: string) => void
}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  
  useEffect(() => {
    loadConversations()
  }, [])
  
  async function loadConversations() {
    const { data } = await supabaseBrowser
      .from('conversations')
      .select('id, title, last_message_at')
      .order('last_message_at', { ascending: false })
      .limit(20)
    
    if (data) setConversations(data)
  }
  
  return (
    <aside className="w-64 bg-white dark:bg-dark-surface border-r dark:border-dark-border p-4 overflow-y-auto">
      <button className="w-full bg-luxury-navy-500 text-white py-2 px-4 rounded-lg mb-4">
        + Nouvelle Conversation
      </button>
      
      <div className="space-y-2">
        {conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => onSelectConv(conv.id)}
            className={`p-3 rounded-lg cursor-pointer transition ${
              currentConvId === conv.id
                ? 'bg-luxury-navy-50 dark:bg-dark-bg'
                : 'hover:bg-gray-50 dark:hover:bg-dark-bg'
            }`}
          >
            <p className="text-sm font-medium truncate">{conv.title}</p>
            <p className="text-xs text-gray-500 dark:text-dark-text-muted">
              {new Date(conv.last_message_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </aside>
  )
}
```
**Validation:** Sidebar affiche conversations, clic change conversation

---

#### **2.5** - Refondre ChatInterface avec streaming 🚀
**Action:** Modifier `components/ChatInterface.tsx` complètement  
**Changements majeurs:**
```typescript
// Ajouter state pour streaming
const [streamingMessage, setStreamingMessage] = useState('')
const [isStreaming, setIsStreaming] = useState(false)

// Modifier handleSend pour streaming
const handleSend = async () => {
  if (!input.trim() || loading) return
  
  const userMessage = input.trim()
  setInput('')
  setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date().toISOString() }])
  setIsStreaming(true)
  setStreamingMessage('')
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage, conversationId })
    })
    
    if (!response.body) throw new Error('No response body')
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullMessage = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      fullMessage += chunk
      setStreamingMessage(fullMessage)
    }
    
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: fullMessage,
      timestamp: new Date().toISOString()
    }])
    setIsStreaming(false)
    setStreamingMessage('')
    
  } catch (error) {
    console.error('Chat error:', error)
    setIsStreaming(false)
  }
}

// Afficher message streaming
{isStreaming && (
  <MessageBubble
    role="assistant"
    content={streamingMessage}
    timestamp={new Date().toISOString()}
    isStreaming
  />
)}
```
**Validation:** Tokens apparaissent progressivement pendant génération

---

#### **2.6** - Modifier MessageBubble pour markdown + sources 💬
**Action:** Modifier `components/MessageBubble.tsx`  
**Changements:**
```typescript
import { MarkdownRenderer } from './MarkdownRenderer'

export default function MessageBubble({ 
  role, 
  content, 
  sources, 
  timestamp, 
  isStreaming 
}: Message & { isStreaming?: boolean }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl rounded-lg px-6 py-4 shadow-md ${
        role === 'user'
          ? 'bg-luxury-navy-500 text-white'
          : 'bg-white dark:bg-dark-surface dark:text-dark-text'
      }`}>
        {/* Markdown rendering */}
        <MarkdownRenderer content={content} />
        
        {/* Cursor clignotant si streaming */}
        {isStreaming && <span className="animate-pulse">▋</span>}
        
        {/* Sources cliquables */}
        {sources && sources.length > 0 && (
          <div className="mt-4 pt-4 border-t dark:border-dark-border">
            <p className="text-xs font-semibold mb-2">📚 Sources:</p>
            <div className="flex flex-wrap gap-2">
              {sources.map((source, i) => (
                <a
                  key={i}
                  href={`/documents?id=${source.documentId}`}
                  className="text-xs bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-100 transition"
                >
                  {source.documentName} ({source.similarity}%)
                </a>
              ))}
            </div>
          </div>
        )}
        
        <p className="text-xs opacity-70 mt-2">
          {new Date(timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}
```
**Validation:** Markdown s'affiche, sources cliquables, cursor streaming

---

### Phase 3: Gemini Grounding (Recherche Web) ⏱️ 2h

#### **3.1** - Modifier lib/gemini.ts pour grounding 🌐
**Action:** Modifier `lib/gemini.ts`  
**Changements dans `generateAnswer()`:**
```typescript
export async function generateAnswer(
  question: string,
  context: string[],
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<string> {
  // Activer Google Search grounding
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    tools: [{
      googleSearch: {}  // ✨ Active la recherche web
    }]
  })
  
  const systemPrompt = `Tu es un assistant juridique spécialisé en droit maritime pour brokers de yachts.

RÈGLES STRICTES:
1. Utilise en PRIORITÉ le CONTEXTE DOCUMENTAIRE fourni ci-dessous
2. Si le contexte ne suffit pas, utilise la RECHERCHE WEB pour compléter (jurisprudence récente, nouvelles lois)
3. Cite toujours les sources (docs + URLs web si utilisées)
4. Indique clairement quand tu utilises la recherche web vs documents de référence

CONTEXTE DOCUMENTAIRE (Documents de Référence):
${context.length > 0 ? context.join('\n\n---\n\n') : 'Aucun document pertinent trouvé.'}

⚠️ DISCLAIMER: Les informations fournies sont à titre informatif uniquement et ne constituent pas un avis juridique.`

  const chat = model.startChat({ history: conversationHistory?.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  })) || [] })
  
  const result = await chat.sendMessage(systemPrompt + '\n\nQUESTION: ' + question)
  
  return result.response.text()
}
```
**Validation:** 
- Tester avec query nécessitant info récente (ex: "Nouvelles lois AML 2026")
- Vérifier que réponse inclut URLs web

---

#### **3.2** - Tester grounding avec questions récentes 🧪
**Action:** Créer `scripts/test-grounding.ts`  
**Code:**
```typescript
import { generateAnswer } from '../lib/gemini'

async function testGrounding() {
  const queries = [
    "Quelles sont les nouvelles lois AML pour yacht brokers en France en 2026?",
    "Dernières jurisprudences sur le MLC 2006 crew rights?",
    "Changements récents du YET scheme en Europe?"
  ]
  
  for (const query of queries) {
    console.log(`\n📌 Query: ${query}`)
    console.log('─'.repeat(60))
    
    const answer = await generateAnswer(query, [])
    console.log(answer)
    console.log('\n')
  }
}

testGrounding()
```
**Validation:** Réponses contiennent infos récentes + URLs sources web

---

### Phase 4: API pour Agents MCP Externes ⏱️ 4h

#### **4.1** - Créer table agent_credentials 🔐
**Action:** Créer `database/migrations/008_create_agent_credentials.sql`  
**SQL:**
```sql
CREATE TABLE agent_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL UNIQUE,
  rate_limit_per_minute INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true
);

-- Index pour recherche rapide par API key
CREATE INDEX idx_agent_credentials_api_key ON agent_credentials(api_key);

-- Insérer agents de test
INSERT INTO agent_credentials (agent_name, api_key, rate_limit_per_minute)
VALUES
  ('myba-compliance-agent', 'ak_myba_test_123', 20),
  ('aml-checker-agent', 'ak_aml_test_456', 15),
  ('mlc-audit-agent', 'ak_mlc_test_789', 10);
```
**Validation:** Exécuter migration, vérifier table créée

---

#### **4.2** - Créer middleware auth pour agents 🛡️
**Action:** Créer `lib/agent-auth.ts`  
**Code:**
```typescript
import { supabaseAdmin } from './supabase'
import { NextRequest } from 'next/server'

export async function authenticateAgent(req: NextRequest): Promise<{
  authenticated: boolean
  agentName?: string
  rateLimit?: number
  error?: string
}> {
  const apiKey = req.headers.get('x-api-key')
  
  if (!apiKey) {
    return { authenticated: false, error: 'Missing API key' }
  }
  
  const { data: agent, error } = await supabaseAdmin
    .from('agent_credentials')
    .select('agent_name, rate_limit_per_minute, active')
    .eq('api_key', apiKey)
    .single()
  
  if (error || !agent) {
    return { authenticated: false, error: 'Invalid API key' }
  }
  
  if (!agent.active) {
    return { authenticated: false, error: 'Agent account disabled' }
  }
  
  // Update last_used_at
  await supabaseAdmin
    .from('agent_credentials')
    .update({ last_used_at: new Date().toISOString() })
    .eq('api_key', apiKey)
  
  return {
    authenticated: true,
    agentName: agent.agent_name,
    rateLimit: agent.rate_limit_per_minute
  }
}
```
**Validation:** Tester avec clé valide + invalide

---

#### **4.3** - Créer endpoint /api/agents/query 🔌
**Action:** Créer `app/api/agents/query/route.ts`  
**Code:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent } from '@/lib/agent-auth'
import { retrieveRelevantChunks, formatChunksForContext } from '@/lib/rag-pipeline'
import { generateAnswer } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  // Auth
  const auth = await authenticateAgent(req)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }
  
  // Parse request
  const { query, context = {}, topK = 5 } = await req.json()
  
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
  }
  
  try {
    // RAG pipeline
    const chunks = await retrieveRelevantChunks(query, undefined, topK, 0.7)
    const ragContext = formatChunksForContext(chunks)
    const answer = await generateAnswer(query, ragContext)
    
    // Calculate confidence
    const confidence = chunks.length > 0
      ? chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length
      : 0
    
    return NextResponse.json({
      answer,
      sources: chunks.map(c => ({
        documentName: c.documentName,
        category: c.category,
        similarity: c.similarity,
        excerpt: c.chunkText.substring(0, 200)
      })),
      confidence: Math.round(confidence * 100) / 100,
      agentName: auth.agentName,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Query processing failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
```
**Validation:** Tester avec curl:
```bash
curl -X POST http://localhost:3000/api/agents/query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ak_myba_test_123" \
  -d '{"query": "MYBA charter obligations"}'
```

---

#### **4.4** - Créer endpoint /api/agents/search 🔍
**Action:** Créer `app/api/agents/search/route.ts`  
**Code:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent } from '@/lib/agent-auth'
import { retrieveRelevantChunks } from '@/lib/rag-pipeline'

export async function POST(req: NextRequest) {
  const auth = await authenticateAgent(req)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }
  
  const { query, category, topK = 10 } = await req.json()
  
  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 })
  }
  
  try {
    const chunks = await retrieveRelevantChunks(query, category, topK, 0.7)
    
    return NextResponse.json({
      results: chunks.map(c => ({
        chunkId: c.chunkId,
        documentId: c.documentId,
        documentName: c.documentName,
        category: c.category,
        content: c.chunkText,
        similarity: c.similarity,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex
      })),
      total: chunks.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
```
**Validation:** Tester recherche pure (sans génération)

---

#### **4.5** - Créer endpoint /api/agents/analyze-document 📄
**Action:** Créer `app/api/agents/analyze-document/route.ts`  
**Code:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent } from '@/lib/agent-auth'
import { parsePDF } from '@/lib/pdf-parser'
import { retrieveRelevantChunks, formatChunksForContext } from '@/lib/rag-pipeline'
import { generateAnswer } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  const auth = await authenticateAgent(req)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }
  
  const formData = await req.formData()
  const file = formData.get('file') as File
  const task = formData.get('task') as string || 'analyze'
  const referenceCategory = formData.get('reference_category') as string
  
  if (!file) {
    return NextResponse.json({ error: 'File required' }, { status: 400 })
  }
  
  try {
    // Parse PDF
    const buffer = Buffer.from(await file.arrayBuffer())
    const { text, pages } = await parsePDF(buffer)
    
    // Get reference chunks if category specified
    let referenceContext: string[] = []
    if (referenceCategory) {
      const chunks = await retrieveRelevantChunks(text.substring(0, 1000), referenceCategory, 5, 0.7)
      referenceContext = formatChunksForContext(chunks)
    }
    
    // Generate analysis
    const prompt = buildAnalysisPrompt(task, text, referenceContext)
    const analysis = await generateAnswer(prompt, referenceContext)
    
    return NextResponse.json({
      analysis,
      metadata: {
        fileName: file.name,
        pages,
        wordCount: text.split(/\s+/).length,
        referenceCategory
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}

function buildAnalysisPrompt(task: string, documentText: string, referenceContext: string[]): string {
  const prompts = {
    analyze: `Analyse ce document juridique maritime et résume les points clés.`,
    extract_clauses: `Extrais toutes les clauses contractuelles importantes de ce document.`,
    compare_with_myba: `Compare ce document avec les standards MYBA et identifie les différences.`
  }
  
  return `${prompts[task as keyof typeof prompts] || prompts.analyze}\n\nDocument:\n${documentText}`
}
```
**Validation:** Tester upload PDF avec curl multipart

---

#### **4.6** - Créer documentation API 📚
**Action:** Créer `docs/API_AGENTS.md`  
**Contenu:**
```markdown
# API REST pour Agents MCP Externes

## Authentication

Toutes les requêtes doivent inclure:
```
X-API-Key: <your_api_key>
```

## Endpoints

### 1. POST /api/agents/query
Interroger la base documentaire avec génération de réponse

**Request:**
```json
{
  "query": "Quelles sont les obligations AML?",
  "context": {},
  "topK": 5
}
```

**Response:**
```json
{
  "answer": "Les obligations AML pour yacht brokers...",
  "sources": [...],
  "confidence": 0.85,
  "agentName": "myba-compliance-agent",
  "timestamp": "2026-01-13T..."
}
```

### 2. POST /api/agents/search
Recherche vectorielle pure (pas de génération)

**Request:**
```json
{
  "query": "MLC 2006 crew rights",
  "category": "MLC_2006",
  "topK": 10
}
```

**Response:**
```json
{
  "results": [
    {
      "chunkId": "...",
      "documentName": "MLC Guide",
      "content": "...",
      "similarity": 0.89
    }
  ],
  "total": 10
}
```

### 3. POST /api/agents/analyze-document
Analyser un document fourni

**Request (multipart/form-data):**
```
file: <PDF blob>
task: "extract_clauses"
reference_category: "MYBA"
```

**Response:**
```json
{
  "analysis": "Ce contrat contient les clauses suivantes...",
  "metadata": {
    "fileName": "charter_contract.pdf",
    "pages": 12,
    "wordCount": 5432
  }
}
```

## Rate Limits

Par défaut: 10 requêtes/minute  
Agent-specific limits définis dans `agent_credentials`

## Error Handling

- 401: Invalid/missing API key
- 429: Rate limit exceeded
- 500: Server error
```
**Validation:** Documentation claire et complète

---

## 🚀 Ordre d'Exécution

1. **Phase 1** (Ingestion) - **PRIORITÉ CRITIQUE**
   - Créer scripts
   - Lancer `npm run ingest:all`
   - Vérifier avec `npm run ingest:verify`
   - ⏱️ Durée: 4h (dont 3h d'ingestion automatique)

2. **Phase 2** (UI Chat)
   - Installer packages
   - Créer composants
   - Tester streaming
   - ⏱️ Durée: 6h

3. **Phase 3** (Grounding)
   - Modifier gemini.ts
   - Tester queries récentes
   - ⏱️ Durée: 2h

4. **Phase 4** (API Agents)
   - Créer table credentials
   - Implémenter endpoints
   - Documenter API
   - ⏱️ Durée: 4h

**Total estimé:** 16 heures

---

## ✅ Critères de Validation

### Phase 1: Ingestion
- [ ] Script `ingest-reference-docs.ts` existe et fonctionne
- [ ] 70+ documents dans table `documents`
- [ ] 7000+ chunks dans table `document_chunks`
- [ ] Embeddings (768 dim) présents
- [ ] Commande `npm run ingest:verify` retourne succès

### Phase 2: UI Chat
- [ ] Sidebar conversations fonctionnel
- [ ] Markdown rendering avec code blocks
- [ ] Streaming tokens progressifs
- [ ] Dark mode activé
- [ ] Citations sources cliquables
- [ ] Responsive (mobile + desktop)

### Phase 3: Grounding
- [ ] Gemini grounding activé dans code
- [ ] Queries récentes retournent infos web
- [ ] Sources web citées dans réponses
- [ ] Fallback sur docs si web insuffisant

### Phase 4: API Agents
- [ ] Table `agent_credentials` créée
- [ ] 3 endpoints fonctionnels:
  - `/api/agents/query` ✅
  - `/api/agents/search` ✅
  - `/api/agents/analyze-document` ✅
- [ ] Auth API key opérationnel
- [ ] Rate limiting par agent
- [ ] Documentation `API_AGENTS.md` complète
- [ ] Tests curl passent

---

## 🔧 Dépendances Additionnelles

```json
{
  "dependencies": {
    "cheerio": "^1.0.0",
    "node-fetch": "^3.3.2",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "react-syntax-highlighter": "^15.5.0"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "@types/react-syntax-highlighter": "^15.5.0"
  }
}
```

---

## 🎯 Résultats Attendus

Après implémentation complète:

1. ✅ **70+ documents juridiques maritimes** indexés et searchable
2. ✅ **Interface chat moderne** (niveau GPT/Gemini)
3. ✅ **Réponses hybrides** (docs de référence + recherche web)
4. ✅ **API REST complète** pour agents MCP externes
5. ✅ **Expérience utilisateur fluide** (streaming, markdown, dark mode)

---

**Date de Création:** 2026-01-13  
**Créé par:** Agent backend-architect + frontend-developer  
**Prochaine Étape:** Validation utilisateur puis `/implement` (Phase 1)

---

**⚠️ IMPORTANT:** Phase 1 (Ingestion) doit être complétée AVANT Phase 2/3/4 car les autres features dépendent des données.

**📌 NOTE:** Les Phases 2, 3, 4 peuvent être parallélisées si plusieurs développeurs/agents disponibles.
