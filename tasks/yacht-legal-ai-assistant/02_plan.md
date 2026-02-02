# Plan d'Implémentation: Yacht Legal AI Assistant

## 📋 Informations
**Date:** 2026-01-12
**Basé sur:** 01_analysis.md
**Approche:** Développement from scratch avec Next.js 14 + Supabase (pgvector) + Gemini 1.5 Flash
**Méthodologie:** APEX Workflow Step-by-Step

## 🎯 Objectif Final
Créer un assistant juridique IA fonctionnel pour brokers de yachts capable de:
1. Répondre aux questions juridiques via chat avec RAG
2. Accepter l'upload de PDFs juridiques (MYBA, AML, MLC, etc.)
3. Effectuer des recherches sémantiques dans les documents
4. Être conforme RGPD avec audit logs et disclaimers
5. Offrir une UX luxury (design navy/gold)

## 📊 Gap Analysis

| Dimension | État Actuel | État Cible | Action Requise | Priorité |
|-----------|-------------|------------|----------------|----------|
| **Infrastructure** | Aucune application Next.js | Next.js 14 + TypeScript + Tailwind configuré | Setup complet projet from scratch | P0 |
| **Database** | Supabase vide (clés API disponibles) | 4 tables + pgvector + indexes + RLS | Migrations SQL complètes | P0 |
| **Backend API** | Aucun endpoint | 4 routes API (/chat, /upload-doc, /search, /delete-data) | API Routes Next.js avec RAG pipeline | P0 |
| **RAG System** | Inexistant | Embeddings Gemini + pgvector search + chunking | Intégration complète Gemini + Supabase | P0 |
| **Frontend UI** | Aucun composant | Chat interface + Upload + Document browser | 8-10 composants React | P1 |
| **RGPD Compliance** | Non implémenté | Audit logs + disclaimers + consentement + droit à l'oubli | Système complet de conformité | P1 |
| **Sécurité** | Aucune protection | Rate limiting + validation PDF + XSS protection + secrets management | Middleware + validations | P1 |
| **Documentation** | Analysis uniquement | Docs technique + disclaimers légaux + README | Fichiers markdown complets | P2 |
| **Testing** | Aucun test | Tests unitaires + E2E Playwright | Suite de tests complète | P2 |

**Complexité globale:** HAUTE (démarrage from scratch)
**Estimation:** 35 fichiers à créer, 0 fichiers existants à modifier
**Temps estimé:** 19-26 heures de développement concentré

## 🏗️ Architecture Proposée

```
┌─────────────────────────────────────────────────────────────────────┐
│                     YACHT LEGAL AI ASSISTANT                        │
│                        Next.js 14 Full-Stack                        │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│  FRONTEND LAYER (Client Components)                                  │
├───────────────────────────────────────────────────────────────────────┤
│  /app/page.tsx (Server Component - Landing)                          │
│  /app/chat/page.tsx (Chat Interface)                                 │
│  /app/documents/page.tsx (Document Browser)                          │
│                                                                       │
│  /components/                                                         │
│    ├── ChatInterface.tsx         (Input + Messages stream)           │
│    ├── MessageBubble.tsx         (User/AI message display)           │
│    ├── LegalDisclaimer.tsx       (Permanent warning banner)          │
│    ├── DocumentUploader.tsx      (PDF upload + category select)      │
│    ├── DocumentCard.tsx          (Document preview card)             │
│    ├── ConsentBanner.tsx         (RGPD consent popup)                │
│    ├── SourceCitation.tsx        (Show cited documents)              │
│    └── Navbar.tsx                (Navigation header)                 │
└───────────────────────────────────────────────────────────────────────┘
                                    │ HTTP/JSON
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│  API LAYER (Next.js Route Handlers)                                  │
├───────────────────────────────────────────────────────────────────────┤
│  /app/api/                                                            │
│    ├── chat/route.ts             POST /api/chat                      │
│    │   └── RAG Pipeline: embed query → search → generate response    │
│    │                                                                  │
│    ├── upload-doc/route.ts       POST /api/upload-doc (multipart)    │
│    │   └── Validate → Upload storage → Parse → Chunk → Embed → Store│
│    │                                                                  │
│    ├── search/route.ts           POST /api/search                    │
│    │   └── Embed query → pgvector search → return chunks             │
│    │                                                                  │
│    └── delete-user-data/route.ts DELETE /api/delete-user-data        │
│        └── RGPD right to be forgotten implementation                 │
└───────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │ Gemini 1.5   │  │ Supabase DB  │  │ Supabase     │
         │ Flash API    │  │ (PostgreSQL) │  │ Storage      │
         ├──────────────┤  ├──────────────┤  ├──────────────┤
         │ - Generate   │  │ documents    │  │ /documents/  │
         │   embeddings │  │ doc_chunks   │  │ {uuid}.pdf   │
         │ - Answer     │  │ conversations│  └──────────────┘
         │   with RAG   │  │ audit_logs   │
         └──────────────┘  └──────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │ pgvector Search  │
                          │ (IVFFlat Index)  │
                          │ <100ms latency   │
                          └──────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│  UTILITIES & LIBS                                                     │
├───────────────────────────────────────────────────────────────────────┤
│  /lib/                                                                │
│    ├── supabase.ts              (Supabase client initialization)     │
│    ├── gemini.ts                (Gemini API wrapper)                  │
│    ├── rag-pipeline.ts          (RAG orchestration logic)             │
│    ├── pdf-parser.ts            (PDF → text → chunks)                 │
│    ├── chunker.ts               (Smart text chunking 500tok/100ovr)   │
│    ├── embeddings.ts            (Generate embeddings cache)           │
│    ├── vector-search.ts         (pgvector query wrapper)              │
│    ├── audit-logger.ts          (RGPD audit log helper)               │
│    └── validators.ts            (Input validation & sanitization)     │
└───────────────────────────────────────────────────────────────────────┘
```

## 📝 Checklist Technique (Step-by-Step)

### Phase 1: Setup & Configuration

#### 1.1 - Initialiser le projet Next.js 14
**Action:** Créer projet Next.js avec TypeScript, Tailwind, App Router
**Commande:**
```bash
cd /home/julien/Documents/iayacht
npx create-next-app@14 yacht-legal-ai --typescript --tailwind --app --no-src-dir
cd yacht-legal-ai
```
**Fichiers créés:**
- `package.json`
- `next.config.js`
- `tsconfig.json`
- `tailwind.config.js`
- `.gitignore`

**Validation:** `npm run dev` démarre sans erreur sur http://localhost:3000

---

#### 1.2 - Installer dépendances essentielles
**Action:** Installer toutes les librairies nécessaires
**Commandes:**
```bash
# Core dependencies
npm install @supabase/supabase-js@2.38.0
npm install @google/generative-ai@0.1.3
npm install pdf-parse@1.1.1
npm install zustand@4.4.7
npm install js-tiktoken@1.0.7
npm install uuid@9.0.0

# Dev dependencies
npm install -D @types/node@20
npm install -D @types/react@18
npm install -D @types/uuid@9
npm install -D @types/pdf-parse@1
```
**Validation:** `npm list` affiche toutes dépendances sans erreur

---

#### 1.3 - Configurer variables d'environnement
**Action:** Créer fichier .env.local avec clés API
**Fichier:** `.env.local`
**Contenu:**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://hmbattewtlmjbufiwuxt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtYmF0dGV3dGxtamJ1Zml3dXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDUzNzksImV4cCI6MjA4MzgyMTM3OX0.ZB20NuSkNCOG5AXh6nlt6bRp2r7GEF1ePEMjJmohnGA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtYmF0dGV3dGxtamJ1Zml3dXh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI0NTM3OSwiZXhwIjoyMDgzODIxMzc5fQ.k3BjmaOykZ5t0gYqO0H2bj34AMXyOk0a2H5k3Gv3mWI

# Gemini API Configuration
GEMINI_API_KEY=AIzaSyBcqAr99ctVjDPNrUjv2cgNWCZBtEMwc70

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Rate Limiting
MAX_REQUESTS_PER_MINUTE=10
MAX_FILE_SIZE_MB=10
```
**Validation:** Vérifier `.gitignore` contient `.env.local`

---

#### 1.4 - Configurer Tailwind pour design luxury
**Action:** Personnaliser thème Tailwind (navy/gold)
**Fichier:** `tailwind.config.js`
**Contenu:**
```javascript
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        luxury: {
          navy: {
            50: '#e8eaf6',
            100: '#c3cce8',
            500: '#1a237e',
            600: '#151b5f',
            900: '#0d1142',
          },
          gold: {
            50: '#fffbeb',
            100: '#fef3c7',
            500: '#d4af37',
            600: '#b8941f',
            900: '#7a610c',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
```
**Validation:** `npm run build` compile sans erreur

---

### Phase 2: Database & Migrations

#### 2.1 - Activer extension pgvector
**Action:** Activer pgvector dans Supabase
**Fichier:** `database/migrations/001_enable_pgvector.sql`
**Code SQL:**
```sql
-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```
**Exécution:** Via Supabase SQL Editor (UI)
**Validation:** Query retourne 1 ligne

---

#### 2.2 - Créer table `documents`
**Action:** Table pour métadonnées des PDFs
**Fichier:** `database/migrations/002_create_documents.sql`
**Code SQL:**
```sql
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'MYBA', 'AML', 'MLC', 'PAVILION', 'INSURANCE',
    'CREW', 'REGISTRATION', 'ENVIRONMENTAL', 'CORPORATE', 'CHARTER'
  )),
  source_url VARCHAR(500),
  file_path VARCHAR(500) NOT NULL,
  uploaded_by UUID,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  content_vector vector(768),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX idx_documents_is_public ON documents(is_public);
```
**Validation:** `SELECT count(*) FROM documents;` → 0

---

#### 2.3 - Créer table `document_chunks`
**Action:** Table chunks de texte avec embeddings vectoriels
**Fichier:** `database/migrations/003_create_document_chunks.sql`
**Code SQL:**
```sql
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_vector vector(768) NOT NULL,
  page_number INT,
  chunk_index INT NOT NULL,
  token_count INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chunk_document ON document_chunks(document_id);
CREATE INDEX idx_chunk_index ON document_chunks(chunk_index);

-- Vector index for semantic search (IVFFlat for <100ms latency)
CREATE INDEX idx_chunk_vector ON document_chunks
USING ivfflat (chunk_vector vector_cosine_ops)
WITH (lists = 100);
```
**Validation:** `SELECT count(*) FROM document_chunks;` → 0

---

#### 2.4 - Créer table `conversations`
**Action:** Table pour historique des chats
**Fichier:** `database/migrations/004_create_conversations.sql`
**Code SQL:**
```sql
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title VARCHAR(255),
  started_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW(),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  document_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON conversations(user_id, created_at DESC);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
```
**Validation:** `SELECT count(*) FROM conversations;` → 0

---

#### 2.5 - Créer table `audit_logs` (RGPD)
**Action:** Table audit logs pour conformité RGPD
**Fichier:** `database/migrations/005_create_audit_logs.sql`
**Code SQL:**
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL CHECK (action IN (
    'upload', 'view', 'search', 'delete', 'chat', 'download', 'consent'
  )),
  user_id UUID,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent VARCHAR(500),
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_audit_user_time ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_action ON audit_logs(action, timestamp DESC);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);

-- Auto-delete old logs after 2 years (RGPD retention policy)
CREATE OR REPLACE FUNCTION delete_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;
```
**Validation:** `SELECT count(*) FROM audit_logs;` → 0

---

#### 2.6 - Créer fonction de recherche vectorielle
**Action:** Fonction SQL optimisée pour recherche sémantique
**Fichier:** `database/migrations/006_create_search_function.sql`
**Code SQL:**
```sql
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_category varchar DEFAULT NULL
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_name varchar,
  category varchar,
  chunk_text text,
  similarity float,
  page_number int,
  chunk_index int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id AS chunk_id,
    d.id AS document_id,
    d.name AS document_name,
    d.category,
    dc.chunk_text,
    1 - (dc.chunk_vector <=> query_embedding) AS similarity,
    dc.page_number,
    dc.chunk_index
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE
    (1 - (dc.chunk_vector <=> query_embedding)) > match_threshold
    AND (filter_category IS NULL OR d.category = filter_category)
    AND d.is_public = TRUE
  ORDER BY dc.chunk_vector <=> query_embedding
  LIMIT match_count;
END;
$$;
```
**Validation:** Fonction existe dans schema

---

#### 2.7 - Configurer Row Level Security (RLS)
**Action:** Politiques RLS pour sécurité données
**Fichier:** `database/migrations/007_create_rls_policies.sql`
**Code SQL:**
```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for public documents
CREATE POLICY "Public documents are viewable by everyone"
ON documents FOR SELECT
USING (is_public = TRUE);

-- Public read access for chunks of public documents
CREATE POLICY "Public document chunks are viewable by everyone"
ON document_chunks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_chunks.document_id
    AND documents.is_public = TRUE
  )
);
```
**Validation:** RLS activé sur toutes tables

---

### Phase 3: Backend API Routes

#### 3.1 - Créer client Supabase
**Action:** Configuration client Supabase (admin + client)
**Fichier:** `lib/supabase.ts`
**Code pattern:**
```typescript
import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```
**Validation:** Import fonctionne sans erreur

---

#### 3.2 - Créer wrapper Gemini API
**Action:** Wrapper pour embeddings et génération de réponses
**Fichier:** `lib/gemini.ts`
**Code pattern:**
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing env.GEMINI_API_KEY')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
  const result = await model.embedContent(text)
  return result.embedding.values
}

export async function generateAnswer(
  question: string,
  context: string[],
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const systemPrompt = `Tu es un assistant juridique spécialisé en droit maritime pour brokers de yachts.

Règles strictes:
1. Réponds UNIQUEMENT en te basant sur le CONTEXTE fourni
2. Si le contexte ne contient pas d'info pertinente, dis "Je n'ai pas trouvé d'information"
3. Cite toujours les sources (nom du document)
4. Utilise un langage juridique précis mais accessible
5. Inclus toujours un disclaimer

CONTEXTE:
${context.join('\n\n---\n\n')}

⚠️ DISCLAIMER: Les informations sont à titre informatif uniquement.`

  const chat = model.startChat({
    history: conversationHistory?.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })) || []
  })

  const result = await chat.sendMessage(systemPrompt + '\n\n' + question)
  return result.response.text()
}
```
**Validation:** `generateEmbedding("test")` retourne array de 768 nombres

---

#### 3.3 - Créer système de chunking
**Action:** Chunking intelligent du texte (500 tokens, overlap 100)
**Fichier:** `lib/chunker.ts`
**Code pattern:**
```typescript
import { encode } from 'js-tiktoken/lite'

const CHUNK_SIZE = 500
const OVERLAP = 100

export function chunkText(text: string): Array<{ text: string; tokenCount: number; index: number }> {
  const encoder = encode
  const tokens = encoder(text)
  const chunks: Array<{ text: string; tokenCount: number; index: number }> = []

  for (let i = 0; i < tokens.length; i += CHUNK_SIZE - OVERLAP) {
    const chunkTokens = tokens.slice(i, i + CHUNK_SIZE)
    const chunkText = new TextDecoder().decode(new Uint8Array(chunkTokens))

    chunks.push({
      text: chunkText,
      tokenCount: chunkTokens.length,
      index: chunks.length
    })
  }

  return chunks
}
```
**Validation:** `chunkText("long text...")` retourne chunks corrects

---

#### 3.4 - Créer parser PDF
**Action:** Extraction texte depuis PDF
**Fichier:** `lib/pdf-parser.ts`
**Code pattern:**
```typescript
import pdfParse from 'pdf-parse'

export async function extractTextFromPDF(buffer: Buffer): Promise<{
  text: string
  pages: number
  metadata: Record<string, any>
}> {
  const data = await pdfParse(buffer)

  return {
    text: data.text,
    pages: data.numpages,
    metadata: data.info || {}
  }
}
```
**Validation:** Tester avec PDF sample

---

#### 3.5 - Créer logger d'audit RGPD
**Action:** Helper pour logs d'audit
**Fichier:** `lib/audit-logger.ts`
**Code pattern:**
```typescript
import { supabaseAdmin } from './supabase'

export async function logAudit(params: {
  action: 'upload' | 'view' | 'search' | 'delete' | 'chat' | 'download' | 'consent'
  userId?: string
  documentId?: string
  conversationId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}) {
  const { error } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      action: params.action,
      user_id: params.userId || null,
      document_id: params.documentId || null,
      conversation_id: params.conversationId || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      metadata: params.metadata || {}
    })

  if (error) {
    console.error('Audit log error:', error)
  }
}
```
**Validation:** `logAudit({ action: 'chat' })` crée entrée

---

#### 3.6 - Créer pipeline RAG
**Action:** Orchestration recherche sémantique
**Fichier:** `lib/rag-pipeline.ts`
**Code pattern:**
```typescript
import { generateEmbedding } from './gemini'
import { supabaseAdmin } from './supabase'

export async function retrieveRelevantChunks(
  query: string,
  category?: string,
  topK: number = 5
): Promise<Array<{
  chunkId: string
  documentId: string
  documentName: string
  category: string
  chunkText: string
  similarity: number
  pageNumber: number | null
}>> {
  const queryEmbedding = await generateEmbedding(query)

  const { data, error } = await supabaseAdmin
    .rpc('search_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: topK,
      filter_category: category || null
    })

  if (error) throw error

  return data || []
}
```
**Validation:** `retrieveRelevantChunks("test")` retourne array

---

#### 3.7 - Créer endpoint POST /api/chat
**Action:** Endpoint principal chat avec RAG
**Fichier:** `app/api/chat/route.ts`
**Code pattern:** *(voir plan complet fourni par l'agent, ~100 lignes)*
**Validation:** `POST /api/chat` avec `{ message: "test" }` retourne 200

---

#### 3.8 - Créer endpoint POST /api/upload-doc
**Action:** Endpoint upload PDF avec parsing et chunking
**Fichier:** `app/api/upload-doc/route.ts`
**Code pattern:** *(voir plan complet fourni par l'agent, ~120 lignes)*
**Validation:** Upload PDF test via Postman/curl

---

#### 3.9 - Créer endpoint DELETE /api/delete-user-data
**Action:** Endpoint RGPD droit à l'oubli
**Fichier:** `app/api/delete-user-data/route.ts`
**Code pattern:** *(voir plan complet fourni par l'agent, ~50 lignes)*
**Validation:** `DELETE /api/delete-user-data` supprime données

---

### Phase 4: Frontend UI

#### 4.1 - Créer composant Navbar
**Fichier:** `components/Navbar.tsx`
**Code pattern:** Navigation header avec liens Chat/Documents
**Validation:** Navbar s'affiche sur toutes pages

---

#### 4.2 - Créer composant LegalDisclaimer
**Fichier:** `components/LegalDisclaimer.tsx`
**Code pattern:** Banner avertissement juridique
**Validation:** Disclaimer visible et lisible

---

#### 4.3 - Créer composant ConsentBanner
**Fichier:** `components/ConsentBanner.tsx`
**Code pattern:** Banner RGPD consentement cookies
**Validation:** Banner s'affiche au 1er chargement

---

#### 4.4 - Créer composant MessageBubble
**Fichier:** `components/MessageBubble.tsx`
**Code pattern:** Affichage message user/assistant avec sources
**Validation:** Messages stylés différemment selon rôle

---

#### 4.5 - Créer composant ChatInterface
**Fichier:** `components/ChatInterface.tsx`
**Code pattern:** Interface chat complète (input + messages + streaming)
**Validation:** Chat fonctionnel avec envoi/réception

---

#### 4.6 - Créer composant DocumentUploader
**Fichier:** `components/DocumentUploader.tsx`
**Code pattern:** Upload PDF avec dropdown catégories
**Validation:** Upload fonctionne avec feedback

---

#### 4.7 - Créer page landing
**Fichier:** `app/page.tsx`
**Code pattern:** Homepage avec présentation et CTA
**Validation:** Page s'affiche avec design luxury

---

#### 4.8 - Créer page chat
**Fichier:** `app/chat/page.tsx`
**Code pattern:** Page chat avec ChatInterface + Disclaimer
**Validation:** Page accessible et fonctionnelle

---

#### 4.9 - Créer page documents
**Fichier:** `app/documents/page.tsx`
**Code pattern:** Page avec DocumentUploader
**Validation:** Page accessible

---

### Phase 5: Tests & Validation

#### 5.1 - Tester RAG pipeline
**Action:** Script test RAG avec queries samples
**Validation:** Réponses pertinentes et cohérentes

---

#### 5.2 - Tester sécurité
**Action:** Tests validation (PDF > 10MB, non-PDF, XSS, etc.)
**Validation:** Tous rejets appropriés

---

#### 5.3 - Tester conformité RGPD
**Action:** Vérifier audit logs, disclaimers, consentement
**Validation:** 100% conformité

---

#### 5.4 - Tester performance
**Action:** Mesurer latences (vector search, chat response, etc.)
**Validation:** <100ms search, <3s total response

---

#### 5.5 - Créer documentation technique
**Fichier:** `README.md`
**Validation:** Dev peut démarrer projet from scratch

---

#### 5.6 - Créer documentation RGPD
**Fichier:** `docs/RGPD_COMPLIANCE.md`
**Validation:** Document complet et juridiquement valide

---

## 🔧 Commandes à Exécuter

```bash
# Setup initial
cd /home/julien/Documents/iayacht
npx create-next-app@14 yacht-legal-ai --typescript --tailwind --app
cd yacht-legal-ai
npm install @supabase/supabase-js @google/generative-ai pdf-parse zustand js-tiktoken uuid

# Development
npm run dev              # Démarrer serveur dev
npm run build            # Build production
npm run lint             # Linter

# Database migrations
# Exécuter via Supabase SQL Editor (UI)
```

## ⚠️ Risques Identifiés

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Qualité RAG insuffisante | Haut | Tuning threshold (0.7 → 0.75), améliorer chunking |
| Coûts API Gemini | Moyen | Caching embeddings, rate limiting strict |
| Non-conformité RGPD | Haut | Audit logs obligatoires, validation avocat |
| Performance search lente | Moyen | Index IVFFlat bien configuré, limiter top-K |
| Disclaimers insuffisants | Haut | Disclaimer sur CHAQUE réponse, validation avocat |

## 🔍 Points de Validation

### Validation Fonctionnelle
- [ ] Chat interface fonctionne (envoi/réception)
- [ ] Upload PDF fonctionne (validation, storage, parsing)
- [ ] RAG pipeline retourne chunks pertinents (similarity > 0.7)
- [ ] Réponses Gemini cohérentes et contextuelles
- [ ] Sources citées affichées correctement

### Validation Technique
- [ ] Database migrations exécutées sans erreur
- [ ] pgvector extension activée et index créés
- [ ] Embeddings générés (768 dimensions)
- [ ] Vector search < 100ms latency
- [ ] API endpoints retournent status codes appropriés

### Validation RGPD
- [ ] Audit logs créés pour toutes actions
- [ ] Disclaimers affichés sur chaque réponse
- [ ] Banner consentement au 1er lancement
- [ ] Endpoint delete-user-data fonctionnel
- [ ] Documentation RGPD complète

### Validation Sécurité
- [ ] PDF validation (type, size) implémentée
- [ ] Rate limiting actif (10 req/min)
- [ ] XSS protection sur inputs
- [ ] Secrets dans .env.local (pas commitées)
- [ ] RLS policies Supabase activées

### Validation UX
- [ ] Design luxury navy/gold cohérent
- [ ] Navigation fluide (Navbar links)
- [ ] Loading states appropriés
- [ ] Messages d'erreur clairs
- [ ] Responsive design (mobile-friendly)

### Validation Performance
- [ ] Page load < 2s
- [ ] Chat response total < 3s
- [ ] Vector search < 100ms
- [ ] PDF upload + chunking < 10s (50 pages)

## 📚 Références Context7

- **Gemini API:** [Google AI Studio Docs](https://ai.google.dev/docs)
- **Supabase pgvector:** [Vector Columns Guide](https://supabase.com/docs/guides/ai/vector-columns)
- **Next.js 14 App Router:** [Next.js Docs](https://nextjs.org/docs)

## 📊 Estimation

- **Complexité:** Haute (démarrage from scratch)
- **Fichiers modifiés:** 0 fichiers
- **Fichiers créés:** ~35 fichiers
- **Dépendances:** 10+ packages NPM
- **Temps estimé:** 19-26 heures de développement concentré

## 🚦 Prêt pour Implémentation

- [x] Analyse complète (01_analysis.md ✓)
- [ ] Plan validé par l'utilisateur
- [ ] Toutes les dépendances identifiées
- [ ] Stratégie claire et sans ambiguïté

---

**Plan créé par:** Claude Code (Agent Plan - Sonnet)
**Date:** 2026-01-12
**Statut:** PRÊT POUR VALIDATION UTILISATEUR
**Prochaine étape:** Demander validation avant phase /implement
