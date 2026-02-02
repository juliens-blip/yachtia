# 🔴 T-050 - PLAN: Réparer Fonction search_documents

**Date:** 2026-01-29 09:25  
**Planificateur:** Claude (APEX Workflow)  
**Priorité:** CRITICAL

---

## 🎯 DIAGNOSTIC CONFIRMÉ

**Problème:** La fonction RPC `search_documents` retourne 0 résultats alors que:
- ✅ DB contient 249 documents
- ✅ DB contient 9908 chunks
- ✅ Tous les chunks ont un `chunk_vector` valide (768 dimensions)
- ✅ Embedding generation fonctionne (768 dims)
- ❌ `supabaseAdmin.rpc('search_documents', {...})` → retourne `[]`

**Hypothèse validée:** La fonction SQL `search_documents` est soit:
1. Non déployée sur Supabase (migration non appliquée)
2. Bugguée (WHERE clause trop stricte)
3. Mauvaise signature (paramètres incompatibles)

---

## 📋 PLAN D'ACTION

### Phase 1: Vérifier Fonction SQL Actuelle (5 min)

**Actions:**
1. ✅ Se connecter à Supabase Dashboard → SQL Editor
2. ✅ Vérifier fonction existe: 
   ```sql
   SELECT routine_name, routine_type 
   FROM information_schema.routines 
   WHERE routine_name = 'search_documents';
   ```
3. ✅ Si existe, afficher code:
   ```sql
   SELECT pg_get_functiondef(oid) 
   FROM pg_proc 
   WHERE proname = 'search_documents';
   ```

**Expected outcome:** Identifier si fonction existe et son code exact.

---

### Phase 2: Redéployer Fonction Corrigée (10 min)

**Fichier source:** `MIGRATION_IMPROVE_SEARCH.sql`

**Actions:**
1. ✅ Lire migration actuelle
2. ✅ Créer fonction test avec logging
3. ✅ Appliquer via Supabase Dashboard SQL Editor
4. ✅ Tester avec query manual

**Code fonction attendue:**
```sql
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_category varchar
) 
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_name text,
  category text,
  chunk_text text,
  similarity float,
  page_number int,
  chunk_index int,
  source_url text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id as chunk_id,  -- IMPORTANT: colonne est 'id' pas 'chunk_id'
    dc.document_id,
    d.name as document_name,
    d.category,
    dc.chunk_text,
    1 - (dc.chunk_vector <=> query_embedding) as similarity,
    dc.page_number,
    dc.chunk_index,
    d.source_url
  FROM document_chunks dc
  INNER JOIN documents d ON dc.document_id = d.id
  WHERE 
    (filter_category IS NULL OR d.category = filter_category)
    AND (1 - (dc.chunk_vector <=> query_embedding)) > match_threshold
  ORDER BY dc.chunk_vector <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Clé:** Utiliser `dc.id as chunk_id` car la colonne réelle s'appelle `id`.

---

### Phase 3: Tester Fonction Déployée (5 min)

**Script test:**
```typescript
import { supabaseAdmin } from './lib/supabase'
import { generateEmbedding } from './lib/gemini'

const embedding = await generateEmbedding('yacht sale contract')
const { data, error } = await supabaseAdmin.rpc('search_documents', {
  query_embedding: embedding,
  match_threshold: 0.1,
  match_count: 10,
  filter_category: null
})

console.log('Results:', data?.length || 0)
// Expected: ≥5 résultats
```

**Critère succès:** `data.length >= 5`

---

### Phase 4: Tester Pipeline E2E (10 min)

**Test complet via API:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the obligations of the seller in a yacht sale contract?"}'
```

**Vérifier:**
- ✅ Logs `[RAG] Chunks retrieved: { total: >0, unique: >0 }`
- ✅ Réponse contient citations `[Source: ...]`
- ✅ Pas de message "Information non disponible"

---

### Phase 5: Documentation & Validation (5 min)

**Actions:**
1. ✅ Mettre à jour `CLAUDE.md` avec résolution
2. ✅ Créer `03_implementation_log.md` avec détails fix
3. ✅ Marquer T-050 comme ✅ RESOLVED
4. ✅ Ajouter note dans README pour éviter régression

---

## 🛠️ OUTILS REQUIS

- [x] Accès Supabase Dashboard (https://app.supabase.com)
- [x] Clés API (.env.local)
- [x] Migration SQL source
- [ ] Script test automatisé
- [ ] Dev server running (npm run dev)

---

## ⏱️ TIMELINE

| Phase | Durée | Status |
|-------|-------|--------|
| 1. Vérif fonction | 5 min | ⏳ TODO |
| 2. Redéploy | 10 min | ⏳ TODO |
| 3. Test RPC | 5 min | ⏳ TODO |
| 4. Test E2E | 10 min | ⏳ TODO |
| 5. Documentation | 5 min | ⏳ TODO |
| **TOTAL** | **35 min** | **0% done** |

---

## 🚨 POINTS DE BLOCAGE POTENTIELS

1. **Accès Supabase Dashboard:** Si pas de login → utiliser agent APEX pour automatiser via API
2. **Fonction protégée:** Si DROP FUNCTION échoue → utiliser CASCADE
3. **RLS policies:** Si SELECT bloqué → vérifier policies sur `document_chunks`

---

## 📊 CRITÈRES DE SUCCÈS

- [ ] Fonction `search_documents` retourne ≥5 résultats avec embedding test
- [ ] API `/api/chat` retourne réponse avec citations (pas "Information non disponible")
- [ ] Logs montrent `[RAG] Chunks retrieved: { total: >0 }`
- [ ] Test automatisé passe (script debug-rag-pipeline.ts)

---

**Status:** ⏳ Plan créé, prêt pour implémentation  
**Prochaine étape:** Passer à Phase 1 (vérification fonction SQL)
