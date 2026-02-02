# 🔧 Solution: Erreur "relation already exists"

## 🐛 Problème Identifié

**Erreur:** `ERROR: 42P07: relation "idx_documents_category" already exists`

**Cause:** Les migrations ont déjà été exécutées par Codex via l'API Supabase Management. Les tables, index et fonctions existent déjà dans votre base de données.

**Les `CREATE INDEX` n'avaient pas `IF NOT EXISTS`, causant l'erreur à la réexécution.**

---

## ✅ Solution Rapide (RECOMMANDÉ)

### Option A: Vérifier si tout est déjà en place

**Les migrations sont probablement déjà appliquées. Vérifiez:**

1. Ouvrir Supabase Dashboard: https://supabase.com/dashboard/project/hmbattewtlmjbufiwuxt
2. Menu **SQL Editor**
3. Copier-coller ce script de vérification:

```sql
-- Vérifier si tout est déjà en place
SELECT 'pgvector extension' as check_type, EXISTS (
  SELECT 1 FROM pg_extension WHERE extname = 'vector'
) as is_ready;

SELECT 'tables' as check_type, COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('documents', 'document_chunks', 'conversations', 'audit_logs');

SELECT 'search function' as check_type, EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_name = 'search_similar_chunks'
) as is_ready;
```

**Si résultat:**
- `pgvector extension: true` ✅
- `tables count: 4` ✅  
- `search function: true` ✅

→ **Tout est déjà en place! Passez directement au test (étape 3 ci-dessous)**

---

### Option B: Réappliquer avec migrations corrigées (si vérification échoue)

**Les fichiers ont été corrigés pour être idempotents (peuvent s'exécuter plusieurs fois):**

1. **Sauvegarder** le fichier `003_create_document_chunks.sql` ouvert dans votre IDE
2. Remplacer son contenu par:

```sql
-- Migration 003: Create document_chunks table
-- Description: Table pour stocker les chunks de texte avec embeddings vectoriels
-- Date: 2026-01-12

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_vector vector(768) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Standard indexes
CREATE INDEX IF NOT EXISTS idx_chunk_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunk_index ON document_chunks(chunk_index);

-- Vector index for semantic search (IVFFlat for <100ms latency)
CREATE INDEX IF NOT EXISTS idx_chunk_vector ON document_chunks
USING ivfflat (chunk_vector vector_cosine_ops)
WITH (lists = 100);

-- Comments
COMMENT ON TABLE document_chunks IS 'Stores document text chunks with vector embeddings for RAG';
COMMENT ON COLUMN document_chunks.chunk_vector IS 'Gemini embedding (768 dims) for semantic search';
COMMENT ON COLUMN document_chunks.chunk_index IS 'Sequential index of chunk in document (0-based)';
COMMENT ON COLUMN document_chunks.metadata IS 'Additional metadata (page number, section title, etc.)';
```

3. Sauvegarder le fichier

4. Maintenant vous pouvez **réexécuter toutes les migrations sans erreur** (dans l'ordre 001 → 007)

---

## 🚀 Étape Suivante: Tester l'Application

**Les migrations sont en place (déjà faites par Codex). Vous pouvez tester:**

```bash
cd /home/julien/Documents/iayacht/yacht-legal-ai
npm run dev
```

Ouvrir: http://localhost:3000

**Test complet:**
1. Aller sur `/documents` → Uploader un PDF
2. Aller sur `/chat` → Poser une question
3. L'IA devrait répondre avec sources ✅

---

## 📊 État Actuel de la Base de Données

D'après les logs de Codex, voici ce qui a déjà été créé:

✅ **Extension pgvector** activée  
✅ **4 tables** créées:
- `documents` (métadonnées PDFs)
- `document_chunks` (chunks + embeddings)
- `conversations` (historique chat)
- `audit_logs` (logs RGPD)

✅ **Fonction de recherche** `search_similar_chunks()` créée  
✅ **Politiques RLS** appliquées  
✅ **Storage buckets** créés: `documents`, `brochures`, `plans`, `models`

**Vous n'avez RIEN à faire côté migrations!** Tout est déjà en place.

---

## 🎯 Action Immédiate

**SKIP les migrations Supabase** → Passer directement au test:

```bash
cd yacht-legal-ai
npm run dev
```

Voir: [DEMARRAGE_RAPIDE.md](../DEMARRAGE_RAPIDE.md) (section 2 et 3)
