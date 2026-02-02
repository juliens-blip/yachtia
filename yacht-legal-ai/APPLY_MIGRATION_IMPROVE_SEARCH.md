# 🚀 Application Migration - Amélioration Search

## ⚠️ À APPLIQUER SUR SUPABASE

**Fichier:** `MIGRATION_IMPROVE_SEARCH.sql`

**Objectif:** Optimiser la fonction `search_documents()` pour le pipeline RAG amélioré

### Changements
- ✅ Threshold: 0.7 → 0.6 (plus de résultats candidats)
- ✅ Match count: 5 → 10 (pour re-ranking côté app)
- ✅ Paramètre `use_reranking` ajouté

### Application

**Option 1: Supabase Dashboard**
1. Aller sur https://supabase.com/dashboard
2. Projet: `your-project-ref`
3. SQL Editor → New Query
4. Copier/coller le contenu de `MIGRATION_IMPROVE_SEARCH.sql`
5. Run

**Option 2: CLI**
```bash
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" < MIGRATION_IMPROVE_SEARCH.sql
```

**Option 3: Script Node**
```bash
npm run db:migrate-improve-search
```

### Vérification
```sql
SELECT
    proname,
    pg_get_function_result(oid) as return_type,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'search_documents';
```

**Attendu:**
```
arguments: query_embedding vector, match_threshold double precision DEFAULT 0.6, match_count integer DEFAULT 10, filter_category character varying DEFAULT NULL::character varying, use_reranking boolean DEFAULT true
```

### ⚠️ IMPORTANT
Cette migration doit être appliquée **AVANT** de tester les améliorations RAG en production.

En dev local, le re-ranking fonctionne sans migration SQL (il utilise les paramètres par défaut).
