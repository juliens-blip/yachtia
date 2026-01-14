# Guide de Déploiement - Yacht Legal AI

## Prérequis

- Node.js 18+
- Compte Supabase (plan gratuit OK)
- Clé API Gemini (Google AI Studio)
- Compte Vercel (optionnel, pour déploiement)

## 1. Configuration Supabase

### Créer le projet

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon key**: Pour le client public
   - **service_role key**: Pour les scripts serveur

### Appliquer les migrations

Dans le SQL Editor de Supabase, exécutez les migrations dans l'ordre:

```sql
-- 1. Activer pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2-8. Exécuter les fichiers dans database/migrations/
-- 001_enable_pgvector.sql
-- 002_create_documents.sql
-- 003_create_document_chunks.sql
-- 004_create_conversations.sql
-- 005_create_audit_logs.sql
-- 006_create_search_function.sql
-- 007_create_rls_policies.sql
-- 008_create_agent_credentials.sql
```

### Vérifier l'installation

```sql
-- Vérifier que pgvector est actif
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Vérifier les tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

## 2. Configuration Gemini

1. Allez sur [Google AI Studio](https://aistudio.google.com)
2. Créez une clé API
3. Notez la clé: `AIza...`

## 3. Configuration locale

### Cloner et installer

```bash
cd ~/Documents/iayacht/yacht-legal-ai
npm install
```

### Créer .env.local

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Gemini
GEMINI_API_KEY=AIzaSy...

# Optionnel
MAX_REQUESTS_PER_MINUTE=10
NODE_ENV=development
```

### Tester en local

```bash
npm run dev
# Ouvrir http://localhost:3000
```

## 4. Ingestion des documents

### Lancer l'ingestion complète

```bash
# Ingérer tous les documents de référence
node scripts/ingest-simple.mjs

# Vérifier l'état
npm run ingest:verify
```

### Résultat attendu

```
Documents totaux: 57+
Chunks totaux: 183+
Catégories: 7
```

## 5. Déploiement Vercel

### Via CLI

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Production
vercel --prod
```

### Via GitHub

1. Connectez votre repo à Vercel
2. Configurez les variables d'environnement:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
3. Déployez automatiquement à chaque push

### Variables d'environnement Vercel

Dans Settings > Environment Variables:

| Variable | Environnement |
|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production |
| `GEMINI_API_KEY` | Production |

## 6. Configuration production

### Domaine personnalisé

1. Dans Vercel > Settings > Domains
2. Ajoutez votre domaine
3. Configurez les DNS selon les instructions

### HTTPS

Automatique avec Vercel (Let's Encrypt).

### Monitoring

#### Sentry (recommandé)

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

#### Logs

Les logs sont disponibles dans:
- Vercel Dashboard > Deployments > Logs
- Supabase Dashboard > Logs

## 7. Créer des clés API agents

### Via script Node

```javascript
// scripts/create-agent-key.mjs
import { createAgentCredential } from '../lib/agent-auth.js';

const result = await createAgentCredential({
  agentName: 'myba-compliance-agent',
  agentDescription: 'Agent de conformité MYBA',
  allowedEndpoints: ['/api/agents/query', '/api/agents/search'],
  maxRequestsPerDay: 1000
});

console.log('API Key (save this, shown only once):', result.apiKey);
console.log('Credential ID:', result.credentialId);
```

### Via SQL

```sql
-- Générer une clé (à hasher côté app)
INSERT INTO agent_credentials (
  api_key_hash,
  api_key_prefix,
  agent_name,
  allowed_endpoints,
  max_requests_per_day
) VALUES (
  'hash_sha256_de_votre_cle',
  'sk_live_xxx...',
  'mon-agent',
  ARRAY['/api/agents/query', '/api/agents/search'],
  1000
);
```

## 8. Checklist pré-production

### Sécurité

- [ ] Variables d'environnement configurées
- [ ] `SUPABASE_SERVICE_ROLE_KEY` jamais exposé côté client
- [ ] RLS activé sur toutes les tables
- [ ] CORS configuré correctement
- [ ] Rate limiting activé

### Performance

- [ ] Build réussi sans erreurs
- [ ] Documents ingérés
- [ ] Index pgvector créé
- [ ] Temps de réponse < 2s

### Fonctionnel

- [ ] Chat fonctionne
- [ ] Upload PDF fonctionne
- [ ] API agents accessible
- [ ] Recherche retourne des résultats

### Monitoring

- [ ] Logs accessibles
- [ ] Alertes configurées (optionnel)
- [ ] Backup DB (Supabase automatique)

## 9. Maintenance

### Mise à jour des documents

```bash
# Ajouter de nouveaux documents
node scripts/ingest-simple.mjs --category MYBA

# Réingérer tout
node scripts/ingest-simple.mjs --force
```

### Nettoyage RGPD

```sql
-- Supprimer les logs > 2 ans (automatique via cron)
SELECT delete_old_audit_logs();
```

### Backup

Supabase effectue des backups automatiques quotidiens (plans payants).

## 10. Troubleshooting

### Build échoue

```bash
# Nettoyer le cache
rm -rf .next node_modules
npm install
npm run build
```

### Erreur pgvector

```sql
-- Vérifier l'extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### Clé API Gemini expirée

1. Allez sur Google AI Studio
2. Générez une nouvelle clé
3. Mettez à jour `.env.local` et Vercel

### Rate limit Gemini

- Free tier: ~60 requêtes/minute
- Ajoutez des délais dans les scripts d'ingestion
- Passez au plan payant si nécessaire

## URLs de référence

- **Production**: https://yachtia.vercel.app
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Google AI Studio**: https://aistudio.google.com
