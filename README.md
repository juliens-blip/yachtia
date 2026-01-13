# Yacht Legal AI Assistant

Assistant juridique intelligent pour brokers de yachts spécialisé en droit maritime (MYBA, AML, MLC, pavillons).

## 🚀 Quick Start

1. **Installer les dépendances:**
   ```bash
   npm install
   ```

2. **Configurer la base de données:**
   - Exécuter les 7 migrations SQL dans Supabase (voir `database/README.md`)
   - Vérifier que pgvector est activé

3. **Lancer le serveur:**
   ```bash
   npm run dev
   ```

4. **Tester l'application:**
   - Ouvrir http://localhost:3000
   - Uploader un PDF via `/documents`
   - Poser une question via `/chat`

**Pour le déploiement en production, voir [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**

## Stack Technique

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL + pgvector)
- **AI:** Gemini 1.5 Flash (embeddings + generation)
- **RAG:** Vector search sémantique (768 dim, cosine similarity)

## Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.local.example .env.local
# Les clés API sont déjà configurées dans .env.local

# Lancer le serveur de développement
npm run dev
```

Le site sera accessible sur [http://localhost:3000](http://localhost:3000).

## Structure du Projet

```
yacht-legal-ai/
├── app/                        # Next.js App Router
│   ├── page.tsx               # Landing page ✅
│   ├── layout.tsx             # Layout principal
│   ├── globals.css            # Styles globaux
│   ├── chat/
│   │   └── page.tsx           # Interface chat ✅
│   ├── documents/
│   │   └── page.tsx           # Upload documents ✅
│   └── api/                   # API Routes
│       ├── chat/route.ts      # Chat avec RAG ✅
│       ├── upload-doc/route.ts # Upload PDF ✅
│       └── delete-user-data/route.ts # RGPD ✅
├── components/                # Composants React
│   ├── Navbar.tsx             # Navigation ✅
│   ├── ChatInterface.tsx      # UI chat ✅
│   ├── DocumentUploader.tsx   # Upload UI ✅
│   ├── MessageBubble.tsx      # Message bubble ✅
│   ├── LegalDisclaimer.tsx    # Disclaimer légal ✅
│   └── ConsentBanner.tsx      # Banner RGPD ✅
├── lib/                       # Utilitaires
│   ├── supabase.ts            # Client Supabase ✅
│   ├── gemini.ts              # Embeddings & chat ✅
│   ├── rag-pipeline.ts        # Pipeline RAG ✅
│   ├── chunker.ts             # Chunking texte ✅
│   ├── pdf-parser.ts          # Extraction PDF ✅
│   └── audit-logger.ts        # Logs RGPD ✅
├── database/                  # Migrations SQL
│   ├── migrations/            # 7 migrations SQL ✅
│   └── README.md              # Guide d'exécution ✅
├── tasks/                     # APEX Workflow
│   └── yacht-legal-ai-assistant/
│       ├── 01_analysis.md     # Analyse (6854 lignes) ✅
│       ├── 02_plan.md         # Plan (800 lignes) ✅
│       └── 03_implementation_log.md # Journal ✅
├── TESTING_GUIDE.md           # Guide de tests ✅
└── DEPLOYMENT_GUIDE.md        # Guide de déploiement ✅
```

## Développement

### Phases d'Implémentation (APEX Workflow)

1. **Phase 1:** Setup & Configuration ✅ COMPLÉTÉ
2. **Phase 2:** Database & Migrations ✅ COMPLÉTÉ
3. **Phase 3:** Backend API Routes (6 libs + 3 APIs) ✅ COMPLÉTÉ
4. **Phase 4:** Frontend UI (6 composants + 3 pages) ✅ COMPLÉTÉ
5. **Phase 5:** Tests & Validation ✅ DOCUMENTATION CRÉÉE

**Status:** MVP COMPLET - Prêt pour déploiement 🚀

## Endpoints API Implémentés

### `POST /api/chat`
Chat juridique avec pipeline RAG complet:
- Génération d'embedding pour la requête
- Recherche vectorielle (top-5, seuil 0.7)
- Génération de réponse avec contexte
- Rate limiting (10 req/min)
- Audit logging

**Request:**
```json
{
  "message": "Quels sont les requirements MYBA?",
  "conversationId": "uuid-optional",
  "category": "MYBA-optional"
}
```

**Response:**
```json
{
  "answer": "Selon les documents...",
  "conversationId": "uuid",
  "sources": [
    {
      "document_name": "MYBA_Charter.pdf",
      "similarity": 0.87,
      "chunk_text": "..."
    }
  ]
}
```

### `POST /api/upload-doc`
Upload PDF avec chunking et embedding automatique:
- Validation (type, taille <10MB, signature PDF)
- Upload vers Supabase Storage
- Extraction texte (pdf-parse)
- Chunking (500 tokens, 100 overlap)
- Génération embeddings (batch de 10)
- Stockage en base

**Request:** FormData
- `file`: PDF file
- `category`: MYBA | AML | MLC | PAVILION | ...
- `sourceUrl`: (optional) URL source

**Response:**
```json
{
  "success": true,
  "documentId": "uuid",
  "chunksCount": 42,
  "pages": 15
}
```

### `POST /api/search`
Recherche vectorielle dans les chunks:

**Request:**
```json
{
  "query": "Quels sont les requirements MYBA?",
  "category": "MYBA",
  "topK": 5,
  "threshold": 0.7
}
```

**Response:**
```json
{
  "results": [
    {
      "chunkId": "uuid",
      "documentId": "uuid",
      "documentName": "MYBA_Charter.pdf",
      "category": "MYBA",
      "similarity": 92,
      "pageNumber": 3,
      "chunkIndex": 2
    }
  ],
  "count": 1
}
```

### `POST /api/document-url`
Génère un lien signé temporaire pour un PDF:

**Request:**
```json
{
  "documentId": "uuid",
  "expiresInSeconds": 600
}
```

**Response:**
```json
{
  "url": "https://...signed-url",
  "expiresInSeconds": 600
}
```

### `POST /api/audit-log`
Écrit un log d'audit RGPD (consentement):

**Request:**
```json
{
  "action": "consent",
  "metadata": {
    "accepted": true,
    "timestamp": "2026-01-12T23:00:00Z"
  }
}
```

**Response:**
```json
{
  "success": true
}
```

### `DELETE /api/delete-user-data`
Suppression RGPD des données utilisateur:
- Supprime conversations
- Conserve audit logs (obligation légale)
- Crée audit log de suppression

**Request:**
```json
{
  "userId": "user-123",
  "reason": "GDPR request"
}
```

**Response:**
```json
{
  "success": true,
  "deletedCount": 15
}
```

### Commandes Utiles

```bash
npm run dev      # Serveur de développement
npm run build    # Build production
npm run start    # Serveur production
npm run lint     # Linter ESLint
```

### Smoke test Supabase/API

```bash
API_BASE=http://localhost:3000 \\
PDF_PATH=/path/to/sample.pdf \\
./scripts/supabase_smoke_test.sh
```

## 📚 Documentation

### Guides Principaux
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Guide complet de déploiement (local + production)
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Procédures de test (12 catégories, 30+ tests)
- **[database/README.md](database/README.md)** - Instructions d'exécution des migrations SQL
- **[docs/technical.md](docs/technical.md)** - Documentation technique (API + RAG + Supabase)
- **[docs/rgpd.md](docs/rgpd.md)** - Conformité RGPD
- **[docs/validation.md](docs/validation.md)** - Validation et smoke tests

### APEX Workflow (tasks/)
- **[01_analysis.md](tasks/yacht-legal-ai-assistant/01_analysis.md)** - Analyse technique complète (6854 lignes)
- **[02_plan.md](tasks/yacht-legal-ai-assistant/02_plan.md)** - Plan d'implémentation détaillé (5 phases)
- **[03_implementation_log.md](tasks/yacht-legal-ai-assistant/03_implementation_log.md)** - Journal d'implémentation

### Documentation Technique
- **Architecture RAG:** Vector search avec pgvector (IVFFlat, 768 dim)
- **Chunking Strategy:** 500 tokens avec 100 overlap
- **Embedding Model:** Gemini text-embedding-004
- **Chat Model:** Gemini 1.5 Flash
- **Rate Limiting:** 10 req/min (in-memory, Redis pour production)

## Conformité

- **RGPD:** Audit logs, disclaimers, consentement, droit à l'oubli
- **Sécurité:** Rate limiting, validation PDF, XSS protection
- **Legal:** Disclaimers juridiques sur chaque réponse

## License

Privé - Tous droits réservés
