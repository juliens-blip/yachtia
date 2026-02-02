# Analyse: Yacht Legal AI Assistant

## 📋 Contexte
**Date:** 2026-01-12
**Demande initiale:** Créer une IA de conseil juridique pour brokers de yachts avec RAG, intégration Supabase et Gemini
**Objectif:** Développer un assistant juridique spécialisé capable de répondre aux questions sur la législation maritime (MYBA, YET, AML, MLC, pavillons) en s'appuyant sur une base documentaire + recherche web temps réel

## 🔍 État Actuel de la Codebase

### Fichiers Concernés
| Fichier | Type | Rôle | Statut |
|---------|------|------|--------|
| `/home/julien/Documents/iayacht/tasks/` | Directory | Structure APEX Workflow | ✅ Existe |
| `/home/julien/Documents/iayacht/.mcp.json` | Config | Configuration MCP servers | ✅ Existe |
| `yacht3d/agents_library/legal-advisor.md` | Agent | Agent juridique GDPR/ToS | ✅ Existe |
| `yacht3d/docs/api.md` | Documentation | API upload brochures PDF | ✅ Existe |
| **yacht-legal-ai-assistant/** | Project Root | Application cible | ❌ À CRÉER |

### Architecture Actuelle
```
/home/julien/Documents/iayacht/
├── tasks/
│   ├── README.md                          (✓ existe)
│   └── yacht-legal-ai-assistant/          (✓ vide - à remplir)
├── yacht3d/
│   ├── agents_library/                    (26 agents Claude)
│   │   └── legal-advisor.md              (GDPR, Privacy, ToS)
│   ├── docs/
│   │   ├── api.md                         (API Yacht Brochure)
│   │   └── postman_collection.json
│   └── .mcp.json                          (Config MCP)
└── [À CRÉER] yacht-legal-ai/
    ├── app/                               (Next.js 14 App Router)
    ├── lib/                               (Utils Supabase, Gemini, RAG)
    ├── components/                        (React Components)
    ├── database/                          (SQL migrations)
    └── docs/                              (Legal disclaimers)
```

### Code Snippets Clés - Références Existantes

#### Fichier 1: `.mcp.json` (Configuration MCP servers)
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "context7-mcp"],
      "env": {}
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "supabase-mcp"],
      "env": {
        "SUPABASE_URL": "https://hmbattewtlmjbufiwuxt.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}
```

#### Fichier 2: `yacht3d/agents_library/legal-advisor.md`
```markdown
---
name: legal-advisor
description: Agent juridique spécialisé dans GDPR, ToS, Privacy Policy
tools: Read, Write, Edit, WebSearch, WebFetch
model: sonnet
---

# AGENT JURIDIQUE SPÉCIALISÉ
Expertise en:
- GDPR compliance
- Terms of Service drafting
- Privacy Policy creation
- Legal disclaimers
```

**Note:** Cet agent peut être réutilisé/étendu pour le projet yacht-legal-ai.

## 📚 Documentation Externe (Gemini & Supabase)

### Librairie 1: Google Gemini 1.5 Flash
**Library ID:** `/google/generative-ai/latest`
**Documentation:**
- API pour génération de texte (chat completion)
- Embeddings: modèle `text-embedding-004` (dimension 768)
- Grounding: recherche web temps réel intégrée
- File API: parsing de PDFs directement dans l'API
- Rate limits: 15 RPM (requests per minute) sur free tier

**Endpoints clés:**
```javascript
// Génération de réponse
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
// Génération d'embeddings
POST https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent
```

### Librairie 2: Supabase
**Library ID:** `/supabase/supabase-js/v2`
**Documentation:**
- PostgreSQL avec extension pgvector (pour embeddings vectoriels)
- Storage: stockage de fichiers (PDFs)
- Real-time subscriptions (optionnel pour future)
- Row Level Security (RLS) pour sécurité granulaire

**Connexion:**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://hmbattewtlmjbufiwuxt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
)
```

**pgvector search:**
```sql
-- Recherche vectorielle avec cosine similarity
SELECT * FROM document_chunks
ORDER BY chunk_vector <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

### Librairie 3: Next.js 14
**Library ID:** `/vercel/next.js/v14`
**Documentation:**
- App Router (nouvelle architecture depuis v13)
- Server Components par défaut
- API Routes dans `app/api/*/route.ts`
- Support TypeScript natif

## 🔗 Dépendances

### Internes (Réutilisables)
- `yacht3d/agents_library/legal-advisor.md` → Pattern pour agent juridique
- `.mcp.json` → Configuration MCP pour Supabase
- Workflow APEX → Méthodologie de développement structurée

### Externes (À installer)
| Package | Version | Utilisation |
|---------|---------|-------------|
| `next` | ^14.0.0 | Framework React SSR |
| `@supabase/supabase-js` | ^2.38.0 | Client Supabase |
| `@google-cloud/vertexai` | ^1.0.0 | API Gemini (alternative: `google-generativeai`) |
| `pdf-parse` | ^1.1.1 | Extraction texte PDF |
| `tailwindcss` | ^3.4.0 | Styling |
| `zustand` | ^4.4.0 | State management |
| `js-tiktoken` | ^1.0.7 | Token counting (pour chunking) |
| `uuid` | ^9.0.0 | Génération IDs |

**Commandes d'installation:**
```bash
npm install next@14 react@18 react-dom@18 typescript
npm install @supabase/supabase-js @google-cloud/vertexai
npm install pdf-parse tailwindcss zustand js-tiktoken uuid
npm install -D @types/node @types/react @types/uuid
```

## ⚠️ Points d'Attention

### 1. RGPD Compliance (Critique)
- **Obligation légale:** Logs d'audit pour toutes les actions (upload, view, delete)
- **Rétention:** Minimum 2 ans pour les logs
- **Droit à l'oubli:** Permettre suppression de données utilisateur
- **Consentement:** Obtenir consentement avant enregistrer conversations
- **DPA:** Data Processing Agreement avec Supabase (provider EU) et Google (Gemini)

**Actions requises:**
- Table `audit_logs` dans Supabase
- UI pour consentement RGPD
- Endpoint `/api/delete-user-data`
- Documentation RGPD dans `docs/RGPD_COMPLIANCE.md`

### 2. Disclaimers Légaux (Obligatoire)
**Texte type à afficher:**
```
⚠️ AVERTISSEMENT LÉGAL
Les informations fournies par cet assistant sont à titre informatif uniquement
et ne constituent pas un avis juridique. Pour toute décision importante concernant
vos transactions maritimes, veuillez consulter un avocat maritime qualifié.

Ce service est fourni "tel quel" sans garantie d'exactitude ou d'exhaustivité.
```

**Où afficher:**
- À chaque réponse du chat (badge permanent)
- Page d'accueil (modal au premier lancement)
- Footer de l'application

### 3. Sécurité & Rate Limiting
- **Upload PDF:** Valider format (application/pdf), taille max 10MB
- **API Endpoints:** Rate limiting (max 10 req/min par IP)
- **Input sanitization:** XSS protection sur inputs utilisateur
- **Secrets:** Clés API dans `.env.local` (JAMAIS commitées)

### 4. Qualité RAG
- **Chunking optimal:** 500 tokens par chunk, overlap de 100 tokens
- **Threshold similarity:** 0.7 minimum pour cosine similarity
- **Top-K results:** Limiter à 5 chunks pour éviter bruit
- **Fallback:** Si aucun chunk pertinent, dire "Je n'ai pas trouvé d'information"

### 5. Performance
- **Embeddings:** Caching des embeddings fréquents (Redis optionnel)
- **Vectoriel search:** Index pgvector avec IVFFlat pour <100ms latence
- **Streaming:** Réponses Gemini streamées (UX meilleure)

## 💡 Opportunités Identifiées

### Court Terme (MVP)
1. **RAG simple mais efficace:** Focus sur qualité des réponses, pas quantité features
2. **UI minimale élégante:** Chat interface + upload button, design luxury (navy/gold)
3. **Catégories prédéfinies:** Dropdown pour upload (MYBA, AML, MLC, etc.)
4. **Sources citées:** Afficher les documents utilisés pour réponse

### Moyen Terme
1. **Document browser:** Interface pour parcourir tous les docs uploadés
2. **Search avancée:** Filtres par catégorie, date, source
3. **Export conversations:** PDF, markdown
4. **Analytics:** Dashboard des questions fréquentes
5. **Multi-language:** Support FR/EN (détection auto)

### Long Terme
1. **Agents spécialisés:** Un agent par catégorie (Agent MYBA, Agent AML, etc.)
2. **Contract generation:** Générer clauses automatiques basées sur MYBA
3. **Compliance checker:** Upload contrat → analyse conformité automatique
4. **Mobile app:** iOS/Android native
5. **API publique:** Permettre intégrations tierces

## 📊 Architecture Cible Détaillée

### Vue d'ensemble système
```
┌─────────────────────────────────────────────────────────────────┐
│                    YACHT LEGAL AI ASSISTANT                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   FRONTEND       │
│  (Next.js 14)    │
├──────────────────┤
│ - Chat Interface │
│ - PDF Upload     │
│ - Doc Browser    │
│ - Disclaimers    │
└────────┬─────────┘
         │ HTTP/JSON
         ▼
┌──────────────────────────────────────────────────────────────────┐
│                  NEXT.JS API ROUTES (Backend)                    │
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│ │ /api/chat        │  │ /api/upload-doc  │  │ /api/search      │ │
│ │ (POST)           │  │ (POST multipart) │  │ (POST)           │ │
│ └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘ │
│          │                     │                     │            │
│ ┌────────▼─────────┐  ┌───────▼────────┐  ┌────────▼─────────┐  │
│ │ RAG Pipeline     │  │ PDF Parser     │  │ Vector Search   │  │
│ │ - Generate Query │  │ - Extract Text │  │ - Query Embed   │  │
│ │   Embeddings     │  │ - Split Chunks │  │ - Find Similar  │  │
│ │ - Vector Search  │  │ - Store Docs   │  │   Docs          │  │
│ │ - Fetch Context  │  └────────────────┘  └─────────────────┘  │
│ └────────┬─────────┘                                            │
│          │
│ ┌────────▼─────────────────────────────────────────────────┐   │
│ │ Gemini 1.5 Flash API Integration                         │   │
│ │ - Generate Embeddings (text-embedding-004)              │   │
│ │ - Answer Questions with Context                         │   │
│ │ - Format Responses + Disclaimer                         │   │
│ └────────┬────────────────────────────────────────────────┘    │
│          │ Response
└──────────┼───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                  SUPABASE (Database & Storage)                   │
├──────────────────────────────────────────────────────────────────┤
│ PostgreSQL + pgvector Extension                                  │
│                                                                  │
│ ┌──────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│ │ documents        │  │ document_chunks│  │ conversations    │  │
│ ├──────────────────┤  ├────────────────┤  ├──────────────────┤  │
│ │ id (UUID)        │  │ id             │  │ id               │  │
│ │ name             │  │ doc_id (FK)    │  │ user_id          │  │
│ │ category         │  │ chunk_text     │  │ started_at       │  │
│ │ source_url       │  │ chunk_vector   │  │ messages (JSONB) │  │
│ │ file_path        │  │ page_number    │  │ created_at       │  │
│ │ uploaded_at      │  │ chunk_index    │  └──────────────────┘  │
│ │ content_vector   │  │ token_count    │                        │
│ │ metadata (JSONB) │  │ created_at     │  ┌──────────────────┐  │
│ └──────────────────┘  └────────────────┘  │ storage/docs/    │  │
│                                           │ {doc_id}.pdf     │  │
│ ┌──────────────────────────────────────┐  └──────────────────┘  │
│ │ audit_logs (RGPD)                    │                        │
│ ├──────────────────────────────────────┤                        │
│ │ id, action, user_id, timestamp       │                        │
│ │ document_id, ip_address, metadata    │                        │
│ └──────────────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────────┘
```

### Flux Utilisateur 1: Chat Simple
```
User demande: "Quels sont les requirements AML pour brokers?"
        │
        ▼
[Chat Interface] → POST /api/chat { message, conversation_id }
        │
        ▼
[RAG Pipeline]
  1. Générer embedding de la question (Gemini API)
  2. Recherche pgvector dans document_chunks (top 5)
  3. Récupérer chunks + metadata des documents sources
        │
        ▼
[Contexte Augmenté]
   Question + 5 chunks pertinents (AML docs)
        │
        ▼
POST Gemini 1.5 Flash
   System: "Tu es assistant juridique yacht. Réponds basé sur contexte."
   Context: [chunks extraits]
   User: [question]
        │
        ▼
[Response Gemini + Disclaimer]
   "Selon les documents MYBA sur AML..."
   "⚠️ AVERTISSEMENT: Ceci n'est pas un avis juridique."
        │
        ▼
Stocker dans conversations (messages JSONB)
        │
        ▼
Stream response au frontend + Afficher sources citées
```

### Flux Utilisateur 2: Upload PDF
```
User upload PDF "MYBA_AML_Guidelines_2024.pdf" + catégorie "AML"
        │
        ▼
POST /api/upload-doc (multipart/form-data)
   { file, category, source_url }
        │
        ▼
[Validation]
  - Vérifier format (application/pdf)
  - Vérifier taille (<10MB)
  - Sanitize filename
        │
        ▼
[Stockage Supabase Storage]
  Path: /documents/{uuid}.pdf
        │
        ▼
[Parsing PDF]
  1. Extraire texte avec pdf-parse
  2. Splitter en chunks (500 tokens, overlap 100)
  3. Pour chaque chunk:
     a. Générer embedding (Gemini text-embedding-004)
     b. Stocker dans document_chunks
        │
        ▼
[Stockage Metadata]
  Insert dans table documents:
  - name, category, file_path, uploaded_at, metadata
        │
        ▼
[Audit Log RGPD]
  Insert dans audit_logs:
  - action="upload", user_id, document_id, timestamp
        │
        ▼
Response: { success: true, doc_id, chunks_count: 42 }
        │
        ▼
UI: "Document uploadé avec succès ! 42 chunks indexés."
    + "Posez une question sur ce document ?"
```

## 📂 Schéma Base de Données Supabase

### Table 1: `documents`
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,  -- MYBA, AML, MLC, Pavilion, Crew, etc.
  source_url VARCHAR(500),
  file_path VARCHAR(500),          -- Path in Supabase Storage
  uploaded_by UUID,                -- user_id (nullable si pas auth)
  uploaded_at TIMESTAMP DEFAULT NOW(),
  content_vector vector(768),      -- Full-doc embedding (Gemini 768 dims)
  metadata JSONB,                  -- { pages: 10, language: "fr", author: "..." }
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Index
  CREATE INDEX idx_documents_category ON documents(category);
  CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at DESC);
);
```

### Table 2: `document_chunks`
```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_vector vector(768),        -- Embedding Gemini pour semantic search
  page_number INT,
  chunk_index INT,                 -- Position dans le document
  token_count INT,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Index vectoriel pour recherche rapide (<100ms)
  CREATE INDEX idx_chunk_vector ON document_chunks
  USING ivfflat (chunk_vector vector_cosine_ops)
  WITH (lists = 100);

  -- Index standard
  CREATE INDEX idx_chunk_document ON document_chunks(document_id);
);
```

### Table 3: `conversations`
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,                     -- nullable si pas d'auth
  title VARCHAR(255),
  started_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP,
  messages JSONB NOT NULL,          -- [{ role: "user", content: "...", timestamp }]
  document_ids UUID[],              -- Documents référencés dans la conversation
  created_at TIMESTAMP DEFAULT NOW(),

  CREATE INDEX idx_conversations_user ON conversations(user_id, created_at DESC);
);
```

### Table 4: `audit_logs` (RGPD Compliance)
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL,      -- "upload", "view", "search", "delete", "chat"
  user_id UUID,
  document_id UUID REFERENCES documents(id),
  conversation_id UUID REFERENCES conversations(id),
  ip_address INET,
  user_agent VARCHAR(500),
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB,                   -- Infos supplémentaires (query, response_time, etc.)

  CREATE INDEX idx_audit_user_time ON audit_logs(user_id, timestamp DESC);
  CREATE INDEX idx_audit_action ON audit_logs(action, timestamp DESC);
);

-- Rétention automatique après 2 ans (RGPD)
CREATE OR REPLACE FUNCTION delete_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;
```

### Fonction SQL: Recherche Vectorielle
```sql
-- Fonction pour recherche sémantique optimisée
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
  page_number int
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
    dc.page_number
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE
    (1 - (dc.chunk_vector <=> query_embedding)) > match_threshold
    AND (filter_category IS NULL OR d.category = filter_category)
  ORDER BY dc.chunk_vector <=> query_embedding
  LIMIT match_count;
END;
$$;
```

## 🎯 Catégories Documentaires Prédéfinies

| Code | Nom Complet | Description | Exemples Documents |
|------|-------------|-------------|-------------------|
| `MYBA` | Mediterranean Yacht Brokers Association | Standards et contrats brokers | Terms & Conditions, Master Agreement, Specimen |
| `AML` | Anti-Money Laundering | Conformité blanchiment argent | KYC procedures, CDD requirements, Red flags |
| `MLC` | Maritime Labor Convention 2006 | Droits équipages maritimes | Work hours, safety, training, health |
| `PAVILION` | Flag Administration | Régulations par pavillon | Cayman, Malta, Marshall Islands, Panama |
| `INSURANCE` | Insurance & Liability | Couverture assurance yachts | Hull & Machinery, P&I, Charter liability |
| `CREW` | Crew Management | Contrats équipages | Employment agreements, certifications, SEA |
| `REGISTRATION` | Vessel Registration | Immatriculation navires | Flag state requirements, tonnage certificates |
| `ENVIRONMENTAL` | Environmental Regulations | MARPOL, pollution | Ballast water, fuel oil, waste management |
| `CORPORATE` | Corporate Structures | Ownership structures | SPV, Trust, Corporate taxation |
| `CHARTER` | Charter Agreements | Contrats location | Bareboat, crewed, skippered terms |

**Usage dans l'application:**
- Dropdown lors de l'upload de PDF
- Filtres dans la recherche de documents
- Affichage de badges colorés par catégorie (UI)

## 📊 Résumé Exécutif

### État Actuel
- ✅ Infrastructure APEX Workflow opérationnelle
- ✅ Agent juridique existant (legal-advisor.md) réutilisable
- ✅ Configuration MCP Supabase prête
- ✅ Clés API Supabase et Gemini fournies
- ❌ Application Next.js à créer de zéro
- ❌ Base de données Supabase à initialiser (tables + pgvector)
- ❌ Système RAG à implémenter

### Priorités Phase Plan
1. **P0 - Critique:** Setup Next.js 14 + TypeScript + Tailwind
2. **P0 - Critique:** Créer migrations Supabase (tables + indexes)
3. **P0 - Critique:** Implémenter API Routes (/chat, /upload-doc)
4. **P1 - Important:** Développer composants React (ChatInterface, Upload)
5. **P1 - Important:** Implémenter RAG pipeline (embeddings + search)
6. **P2 - Nice-to-have:** Disclaimers légaux + audit logs RGPD
7. **P2 - Nice-to-have:** Document browser + search avancée

### Risques Identifiés
| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|-----------|
| Qualité RAG insuffisante | Haut | Moyen | Tuning threshold similarity, chunking optimal |
| Coûts API Gemini | Moyen | Faible | Caching embeddings, rate limiting |
| Non-conformité RGPD | Haut | Faible | Audit logs obligatoires, documentation claire |
| Performance search vectorielle | Moyen | Moyen | Index IVFFlat pgvector, tuning paramètres |
| Disclaimers légaux insuffisants | Haut | Faible | Validation avocat maritime, affichage systématique |

### Prochaines Étapes
1. ✅ **Analyse complétée** → Fichier `01_analysis.md` créé
2. ⏭️ **Plan d'implémentation** → Phase `/plan` (créer `02_plan.md`)
3. ⏭️ **Validation utilisateur** → AskUserQuestion avant `/implement`
4. ⏭️ **Implémentation** → Phase `/implement` (journal `03_implementation_log.md`)

---

**Analyse réalisée par:** Claude Code (Agent Explore)
**Date:** 2026-01-12
**Prêt pour phase /plan:** ✅
**Fichiers de référence:**
- `.mcp.json`: Configuration MCP Supabase
- `yacht3d/agents_library/legal-advisor.md`: Pattern agent juridique
- Brief projet complet fourni par utilisateur
