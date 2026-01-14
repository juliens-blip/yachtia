# 🎯 YACHT LEGAL AI - TODO MASTER LIST

**Dernière mise à jour**: 2026-01-13
**Objectif**: Système RAG juridique maritime avec interface type GPT/Gemini + agents MCP

---

## 📊 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    YACHT LEGAL AI                           │
│                                                             │
│  Interface Chat (GPT-style)                                 │
│         ↓                                                   │
│  Backend RAG (Gemini + Supabase Vector)                     │
│         ↓                                                   │
│  Documents Références (70+ URLs MYBA/AML/MLC/YET)           │
│         ↓                                                   │
│  Gemini Grounding (recherche web temps réel)                │
│         ↓                                                   │
│  API REST pour agents externes                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 PHASE 1 : INGESTION DES DOCUMENTS (PRIORITÉ IMMÉDIATE)

### ✅ Script d'ingestion automatique
- [x] Parser la liste des 70+ URLs fournies
- [x] Créer `/scripts/ingest-reference-docs.ts`
  - [x] Télécharger les PDFs
  - [x] Scraper les pages HTML
  - [x] Convertir en texte brut
  - [x] Générer embeddings via Gemini
  - [x] Stocker dans `document_chunks` Supabase
- [x] Ajouter catégorisation automatique:
  - MYBA (Contrats)
  - AML/KYC (Conformité)
  - MLC 2006 (Droit maritime/crew)
  - Pavillons (Cayman, Malta, RIF...)
  - YET (Yacht Engaged in Trade)
  - IA/RGPD (Responsabilité légale)
  - DROIT_SOCIAL (Monaco/EU)
- [x] Progress bar pour tracking
- [x] Logs détaillés (console temps réel)

### ✅ Catégories de documents
```typescript
const REFERENCE_DOCS = {
  MYBA: [
    'https://www.charteranddreams.com/wp-content/uploads/2024/06/SPECIMEN-MYBA-2017-E-Contract-original-V9.1b.pdf',
    // ... 10 URLs
  ],
  AML_KYC: [
    'https://rosemont-int.com/en/article/news/aml-laws-covering-yacht-brokers-in-the-eu-and-other-key-jurisdictions',
    // ... 5 URLs
  ],
  // ...
}
```

### 📦 Commandes
```bash
cd yacht-legal-ai
npm run ingest:all        # Ingère tous les documents (✅ IMPLÉMENTÉ)
npm run ingest:category MYBA  # Ingère une catégorie (✅ IMPLÉMENTÉ)
npm run ingest:verify     # Vérifie l'état de la DB (✅ IMPLÉMENTÉ)
```

### ✅ PHASE 1 STATUS: IMPLÉMENTÉE (2026-01-13)
**Fichiers créés:**
- ✅ `scripts/reference-urls.ts` (340 lignes) - 70+ URLs structurées
- ✅ `lib/web-scraper.ts` (92 lignes) - Scraping HTML + download PDF
- ✅ `scripts/ingest-reference-docs.ts` (250 lignes) - Ingestion automatique
- ✅ `scripts/verify-ingestion.ts` (95 lignes) - Vérification DB
- ✅ `package.json` modifié (3 nouveaux scripts)
- ✅ `tasks/yacht-legal-ai-rag-system/01_analysis.md` (245 lignes)
- ✅ `tasks/yacht-legal-ai-rag-system/02_plan.md` (550 lignes)
- ✅ `tasks/yacht-legal-ai-rag-system/03_implementation_log.md` (250 lignes)

**Packages installés:**
- ✅ cheerio (web scraping)
- ✅ node-fetch (HTTP requests)
- ✅ tsx (TypeScript executor)
- ✅ p-queue (rate limiting)

**⏸️ EN ATTENTE:** Lancement effectif de `npm run ingest:all` (durée: ~45 min)

---

## 🎨 PHASE 2 : INTERFACE CHAT (STYLE GPT/GEMINI)

### ✅ Composants UI à créer/modifier
- [ ] `/src/components/chat/ChatInterface.tsx` (refonte complète)
  - [ ] Zone de messages (scrollable, auto-scroll)
  - [ ] Input textarea avec autosize
  - [ ] Bouton d'envoi + raccourci Enter
  - [ ] Upload PDF optionnel (icône paperclip)
  - [ ] Indicateur "typing..." pendant génération
  - [ ] Streaming des réponses (token par token)
  
### ✅ Features attendues
- [ ] **Markdown rendering** (code blocks, listes, liens)
- [ ] **Citations cliquables** vers les sources
- [ ] **Historique de conversation** persistant
- [ ] **Nouveau chat** (bouton + raccourci)
- [ ] **Sidebar conversations** (optionnel, toggleable)
- [ ] **Upload PDF temporaire** :
  - Analyse à la volée (sans stockage permanent)
  - Fusion contexte avec docs de référence

### 🎨 Design system
```tsx
// Palette (à définir)
const theme = {
  bg: '#0E0E0E',           // Fond dark
  surface: '#1A1A1A',      // Cartes
  border: '#2A2A2A',       // Bordures
  text: '#E0E0E0',         // Texte principal
  textMuted: '#A0A0A0',    // Texte secondaire
  accent: '#3B82F6',       // Bleu
  accentHover: '#2563EB'
}
```

### 📱 Responsive
- [ ] Desktop (1200px+) : sidebar + chat
- [ ] Tablet (768-1200px) : sidebar collapse
- [ ] Mobile (<768px) : fullscreen chat

---

## 🔍 PHASE 3 : GEMINI GROUNDING (RECHERCHE WEB TEMPS RÉEL)

### ✅ Intégration Gemini Search
- [ ] Modifier `/src/lib/chat/gemini.ts`
- [ ] Ajouter Google Search grounding:
  ```typescript
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    tools: [{
      googleSearch: {}  // Active la recherche web
    }]
  })
  ```
- [ ] Fusionner résultats:
  1. **Docs Supabase** (RAG vectoriel)
  2. **Gemini Grounding** (web temps réel)
  3. **PDF uploadé** (contexte utilisateur)

### 🔧 Logique de fusion
```typescript
// Pseudo-code
const context = {
  vectorDB: await searchSupabase(query),        // Docs de référence
  webSearch: await geminiGrounding(query),      // Infos récentes
  userPDF: uploadedFile ? await analyzePDF(file) : null
}

const prompt = buildPrompt(query, context)
const response = await gemini.generate(prompt)
```

---

## 🤖 PHASE 4 : API POUR AGENTS EXTERNES

### ✅ Endpoints à créer

#### 1. `/api/agents/query` (POST)
Permet aux agents MCP d'interroger la base documentaire
```typescript
// Request
{
  "query": "Quelles sont les obligations AML pour un broker en France?",
  "agent_id": "myba-compliance-agent",
  "context": { /* Contexte additionnel */ }
}

// Response
{
  "answer": "...",
  "sources": [...],
  "confidence": 0.92
}
```

#### 2. `/api/agents/search` (POST)
Recherche vectorielle pure (sans génération)
```typescript
// Request
{
  "query": "MLC 2006 crew rights",
  "top_k": 10,
  "filters": {
    "category": ["MLC"],
    "year": ">=2020"
  }
}

// Response
{
  "chunks": [
    {
      "content": "...",
      "metadata": {...},
      "similarity": 0.89
    }
  ]
}
```

#### 3. `/api/agents/analyze-document` (POST)
Analyse un document fourni par l'agent
```typescript
// Request (multipart/form-data)
{
  "file": <PDF blob>,
  "task": "extract_clauses",  // ou "compare_with_myba", etc.
  "reference_category": "MYBA"
}

// Response
{
  "analysis": {...},
  "recommendations": [...]
}
```

### 🔐 Sécurité
- [ ] API Keys pour agents (table `agent_credentials`)
- [ ] Rate limiting (10 req/min/agent)
- [ ] Logs d'audit (qui a demandé quoi)

---

## 📚 PHASE 5 : DOCUMENTATION

### ✅ Fichiers à créer/mettre à jour
- [x] `TODO.md` (ce fichier)
- [ ] `ARCHITECTURE.md` (diagrammes système)
- [ ] `API_DOCS.md` (endpoints agents)
- [ ] `DEPLOYMENT.md` (déploiement Vercel/Railway)
- [ ] `AGENTS_INTEGRATION.md` (guide connexion MCP)

### ✅ Diagrammes à générer
- [ ] Architecture système (mermaid)
- [ ] Flow RAG (requête → réponse)
- [ ] Schéma DB (tables + relations)

---

## 🗂️ STRUCTURE DES CATÉGORIES DE DOCUMENTS

### 📁 Taxonomie
```
documents/
├── MYBA/
│   ├── contracts/               (10 URLs)
│   ├── guidelines/              (2 URLs)
│   └── explanations/            (8 URLs)
├── AML_KYC/
│   ├── eu_regulations/          (3 URLs)
│   ├── france_specific/         (2 URLs)
│   └── monaco/                  (2 URLs)
├── MLC_2006/
│   ├── conventions/             (4 URLs)
│   ├── crew_rights/             (3 URLs)
│   └── payroll_visas/           (3 URLs)
├── PAVILLONS/
│   ├── rif_france/              (3 URLs)
│   ├── cayman_malta/            (5 URLs)
│   └── comparisons/             (4 URLs)
├── YET/
│   ├── scheme_guide/            (3 URLs)
│   └── tax_updates/             (2 URLs)
└── IA_RGPD/
    ├── gdpr_ai/                 (5 URLs)
    ├── disclaimers/             (2 URLs)
    └── liability/               (3 URLs)
```

### 📊 Métadonnées par document
```typescript
interface DocumentMetadata {
  url: string
  category: Category
  subcategory?: string
  source_type: 'pdf' | 'html' | 'article'
  language: 'fr' | 'en'
  publication_date?: string
  author?: string
  jurisdiction?: 'EU' | 'France' | 'Monaco' | 'International'
  relevance_score?: number  // Calculé par embedding
}
```

---

## 🔧 CONFIGURATION TECHNIQUE

### Environment Variables
```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx  # Pour script ingestion

# Gemini
GOOGLE_AI_API_KEY=xxx

# Auth (si agents externes)
AGENT_API_SECRET=xxx

# Vercel (production)
VERCEL_URL=https://yacht-legal-ai.vercel.app
```

### Base de données
```sql
-- Tables existantes
✅ documents
✅ document_chunks (avec pgvector)
✅ chat_sessions
✅ chat_messages

-- Nouvelles tables à créer
🆕 agent_credentials (pour API agents)
🆕 document_categories (taxonomie)
🆕 ingestion_logs (tracking)
```

---

## 📈 MÉTRIQUES DE SUCCÈS

### KPIs
- [ ] **70+ documents** ingérés avec succès
- [ ] **<2s** temps de réponse chat
- [ ] **>0.8** similarity score moyenne
- [ ] **Streaming** fonctionnel (tokens progressifs)
- [ ] **Upload PDF** opérationnel
- [ ] **Gemini grounding** actif (recherche web)
- [ ] **API agents** documentée + testée

---

## 🐛 BUGS CONNUS À CORRIGER

### Chat
- [ ] Pas de streaming (voir `/src/app/api/chat/route.ts`)
- [ ] Citations non cliquables
- [ ] Pas d'historique conversations

### RAG
- [ ] Pas de fallback si Supabase vide
- [ ] Embeddings pas mis en cache

### UI
- [ ] Interface trop basique
- [ ] Pas de dark mode (obligatoire pour style GPT)

---

## 🚢 DÉPLOIEMENT

### Production Checklist
- [ ] Variables d'env configurées
- [ ] Supabase migrations appliquées
- [ ] Documents de référence ingérés
- [ ] Tests E2E passés
- [ ] Monitoring configuré (Sentry/LogRocket)
- [ ] Rate limiting actif
- [ ] CORS configuré pour agents

### Commandes
```bash
# Build
npm run build

# Tests
npm run test
npm run test:e2e

# Deploy
vercel --prod
```

---

## 📞 INTÉGRATION AGENTS MCP

### Agents existants (à connecter)
L'utilisateur a mentionné avoir des agents spécifiques. À documenter :
- [ ] Liste des agents (noms + rôles)
- [ ] Technologies utilisées (LangChain/CrewAI/AutoGen)
- [ ] Endpoints requis par agent
- [ ] Format des requêtes/réponses

### Exemple d'intégration
```typescript
// Agent MYBA Compliance
const agent = new MYBAComplianceAgent({
  apiUrl: 'https://yacht-legal-ai.vercel.app/api/agents',
  apiKey: process.env.AGENT_API_KEY
})

const result = await agent.query(
  "Verify this charter contract against MYBA 2017 standard",
  { contract: pdfBuffer }
)
```

---

## 🔮 FUTURES AMÉLIORATIONS (POST-MVP)

### V2 Features
- [ ] Multi-agent orchestration (plusieurs agents en parallèle)
- [ ] Fine-tuning Gemini sur corpus juridique maritime
- [ ] Export conversations en PDF
- [ ] Templates de contrats pré-remplis
- [ ] Alertes réglementaires (nouvelles lois)
- [ ] Support vocal (speech-to-text)

### Optimisations
- [ ] Cache Redis pour embeddings fréquents
- [ ] CDN pour PDFs statiques
- [ ] Compression embeddings (PCA/UMAP)

---

## 📝 NOTES UTILISATEUR

> "document et documents chunks sont vides pourtant j'avais mis des documents de références"
→ **PRIORITÉ** : Ingestion automatique via script

> "interface comme GPT ou Gemini, un seul chat avec possibilité optionnel de soumettre un doc (pdf)"
→ **DESIGN** : Simplifier `/chat` page, ajouter upload drag-drop

> "je brancherai des agents spécifiques pour ça (je les ai déjà) et des tools via MCP Claude code"
→ **API** : Endpoints RESTful pour agents externes

> "n'hésite pas à me poser des questions plutôt que de faire des hallucinations"
→ **APPROCHE** : Documentation > Assumptions

---

## 🎯 PROCHAINES ÉTAPES (ORDRE D'EXÉCUTION)

### Aujourd'hui (2026-01-13)
1. ✅ Créer TODO.md (fait)
2. ⏳ Script d'ingestion `/scripts/ingest-reference-docs.ts`
3. ⏳ Lancer ingestion des 70+ URLs
4. ⏳ Refonte UI chat (pendant que ingestion tourne)
5. ⏳ Ajouter Gemini grounding
6. ⏳ Créer endpoints API agents

### Cette semaine
- [ ] Tests E2E complets
- [ ] Documentation API
- [ ] Déploiement staging

---

**🔥 ACTION IMMÉDIATE** : Créer script d'ingestion et commencer le chargement des documents de référence.
