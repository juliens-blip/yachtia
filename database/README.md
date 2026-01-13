# Database Migrations - Yacht Legal AI

Ce dossier contient toutes les migrations SQL pour Supabase.

## Ordre d'Exécution

Les migrations doivent être exécutées dans l'ordre numérique:

1. **001_enable_pgvector.sql** - Activer extension pgvector
2. **002_create_documents.sql** - Table documents
3. **003_create_document_chunks.sql** - Table chunks avec embeddings
4. **004_create_conversations.sql** - Table conversations
5. **005_create_audit_logs.sql** - Table audit logs (RGPD)
6. **006_create_search_function.sql** - Fonction recherche vectorielle
7. **007_create_rls_policies.sql** - Politiques Row Level Security

## Comment Exécuter

### Option 1: Via Supabase SQL Editor (Recommandé)

1. Ouvrir [Supabase Dashboard](https://app.supabase.com)
2. Sélectionner le projet `hmbattewtlmjbufiwuxt`
3. Aller dans **SQL Editor**
4. Copier-coller chaque fichier SQL dans l'ordre
5. Cliquer sur **Run** pour chaque migration

### Option 2: Via Supabase CLI

```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Se connecter
supabase login

# Exécuter les migrations
supabase db push --db-url "postgresql://postgres:...@db.hmbattewtlmjbufiwuxt.supabase.co:5432/postgres"
```

### Option 3: Via psql

```bash
psql "postgresql://postgres:YOUR_PASSWORD@db.hmbattewtlmjbufiwuxt.supabase.co:5432/postgres" < migrations/001_enable_pgvector.sql
psql "postgresql://postgres:YOUR_PASSWORD@db.hmbattewtlmjbufiwuxt.supabase.co:5432/postgres" < migrations/002_create_documents.sql
# etc.
```

## Vérification Post-Migration

Après avoir exécuté toutes les migrations, vérifier:

```sql
-- Vérifier pgvector
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Vérifier les tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Devrait retourner: audit_logs, conversations, document_chunks, documents

-- Vérifier les indexes
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Vérifier la fonction search_documents
SELECT proname FROM pg_proc WHERE proname = 'search_documents';

-- Vérifier les RLS policies
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public';
```

## Structure Base de Données

```
documents
├── id (UUID, PK)
├── name (VARCHAR)
├── category (VARCHAR) - MYBA, AML, MLC, etc.
├── file_path (VARCHAR) - Supabase Storage path
├── content_vector (vector(768)) - Full-doc embedding
├── metadata (JSONB)
└── is_public (BOOLEAN)

document_chunks
├── id (UUID, PK)
├── document_id (UUID, FK → documents)
├── chunk_text (TEXT)
├── chunk_vector (vector(768)) - Semantic search
├── chunk_index (INT)
└── page_number (INT)

conversations
├── id (UUID, PK)
├── user_id (UUID)
├── messages (JSONB) - [{role, content, timestamp}]
└── document_ids (UUID[])

audit_logs
├── id (UUID, PK)
├── action (VARCHAR) - upload, view, chat, delete, etc.
├── user_id (UUID)
├── document_id (UUID, FK)
├── timestamp (TIMESTAMP)
└── metadata (JSONB)
```

## Notes Importantes

1. **pgvector dimension:** 768 (Gemini text-embedding-004)
2. **IVFFlat index:** Paramètre `lists = 100` optimal pour 10k-100k vecteurs
3. **RLS:** Activé sur toutes les tables pour sécurité
4. **RGPD:** Audit logs avec rétention 2 ans automatique
5. **Performance:** Index sur category, timestamp, user_id pour requêtes rapides

## Rollback (si nécessaire)

Pour annuler les migrations:

```sql
-- Désactiver RLS
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Supprimer tables (CASCADE supprime aussi les chunks)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS documents CASCADE;

-- Supprimer fonction
DROP FUNCTION IF EXISTS search_documents;
DROP FUNCTION IF EXISTS delete_old_audit_logs;

-- Désactiver pgvector (optionnel)
DROP EXTENSION IF EXISTS vector;
```

**⚠️ ATTENTION:** Cette opération supprime toutes les données !
