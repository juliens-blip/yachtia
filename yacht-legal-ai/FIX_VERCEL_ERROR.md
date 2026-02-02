# 🚨 Fix Erreur Vercel - "structure does not match function result type"

## Erreur

```
Vector search failed: structure of query does not match function result type
```

## 🔍 Cause

La fonction SQL `search_documents` dans Supabase **PRODUCTION** n'a pas le champ `source_url`, mais le code TypeScript déployé sur Vercel l'attend.

## ✅ Solution

### Étape 1: Vérifier quelle base Supabase est utilisée

**Production Vercel utilise quelle base Supabase ?**

Vérifier les variables d'environnement Vercel :
1. Aller sur https://vercel.com/dashboard
2. Sélectionner projet `brisack`
3. Settings → Environment Variables
4. Vérifier `NEXT_PUBLIC_SUPABASE_URL`

**Est-ce la même URL que votre `.env.local` ?**
- `.env.local`: `https://hmbattewtlmjbufiwuxt.supabase.co`
- Vercel Production: `???`

---

### Étape 2: Appliquer la migration sur la BONNE base Supabase

**Si Vercel utilise une BASE DIFFÉRENTE :**

1. Aller sur https://supabase.com/dashboard
2. **Sélectionner le projet de PRODUCTION** (celui dont l'URL est dans Vercel)
3. SQL Editor
4. Copier-coller le SQL de [MIGRATION_STEP2_OPTION_B.sql](file:///home/julien/Documents/iayacht/yacht-legal-ai/MIGRATION_STEP2_OPTION_B.sql)
5. RUN

**Si Vercel utilise la MÊME base (`hmbattewtlmjbufiwuxt`) :**

La migration a déjà été appliquée, mais peut-être que le déploiement Vercel a eu lieu AVANT le push des corrections TypeScript.

→ **Redéployer sur Vercel**

---

### Étape 3: Redéployer sur Vercel

**Option A: Redéploiement automatique (recommandé)**

Le dernier push a déjà déclenché un redéploiement. Attendre 2-3 minutes et vérifier :
- https://vercel.com/dashboard → Déploiements
- Vérifier que le dernier commit `9b8080a` (fix ESLint) est déployé

**Option B: Redéploiement manuel**

1. Aller sur https://vercel.com/dashboard
2. Sélectionner projet `brisack`
3. Deployments → Dernier déploiement → ... (menu) → Redeploy

---

## 🧪 Test de la fonction SQL

**Pour vérifier si la fonction retourne bien `source_url` :**

Dans Supabase SQL Editor (de la base de PRODUCTION) :

```sql
-- Test de la fonction search_documents
SELECT * FROM search_documents(
  ARRAY[0.1, 0.2, 0.3]::vector(768),  -- Vecteur test (remplir les 768 valeurs avec des 0)
  0.1,  -- threshold très bas pour avoir des résultats
  1,    -- 1 seul résultat
  NULL  -- toutes catégories
);
```

**Résultat attendu :**
Une ligne avec colonnes : `chunk_id`, `document_id`, `document_name`, `category`, `chunk_text`, `similarity`, `page_number`, `chunk_index`, **`source_url`**

**Si `source_url` n'apparaît PAS :**
→ La migration n'a pas été appliquée sur cette base
→ Appliquer [MIGRATION_STEP2_OPTION_B.sql](file:///home/julien/Documents/iayacht/yacht-legal-ai/MIGRATION_STEP2_OPTION_B.sql)

---

## 📊 Checklist de Résolution

- [ ] **Vérifier URL Supabase de production** (Vercel env vars)
- [ ] **Appliquer migration SQL sur la BONNE base** (celle de production)
- [ ] **Tester fonction SQL** avec query ci-dessus (vérifier `source_url` présent)
- [ ] **Redéployer Vercel** (attendre commit `9b8080a`)
- [ ] **Tester chat** sur https://brisack.vercel.app/chat
- [ ] **Vérifier logs Vercel** - plus d'erreur "structure does not match"

---

## 🔧 Si le problème persiste

**Vérifier les types TypeScript correspondent exactement :**

La fonction SQL retourne :
```sql
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  document_name varchar,
  category varchar,
  chunk_text text,
  similarity float,
  page_number int,
  chunk_index int,
  source_url text   ← DOIT ÊTRE PRÉSENT
)
```

Le code TypeScript attend :
```typescript
type SearchDocumentsRow = {
  chunk_id: string
  document_id: string
  document_name: string
  category: string
  chunk_text: string
  similarity: number
  page_number: number | null
  chunk_index: number
  source_url?: string   ← DOIT ÊTRE PRÉSENT
}
```

✅ Si les deux correspondent → OK  
❌ Si `source_url` manque dans SQL → Appliquer migration  
❌ Si `source_url` manque dans TypeScript → Bug (mais déjà corrigé dans dernier push)

---

## 🎯 Résolution Rapide

**La plus probable :**

1. **Bases Supabase différentes** (dev vs prod)
   → Appliquer migration sur la base de prod

2. **Déploiement Vercel ancien**
   → Attendre redéploiement automatique (2-3 min)

3. **Les deux** (migration pas appliquée + vieux code déployé)
   → Appliquer migration + attendre redéploiement

---

## 📞 Commandes de Diagnostic

```bash
# Vérifier le dernier commit déployé sur Vercel
# (devrait être 9b8080a après quelques minutes)

# Vérifier variables d'environnement Vercel
vercel env ls

# Forcer redéploiement
vercel --prod
```

---

## ✅ Solution Finale

Une fois que :
- ✅ Migration SQL appliquée sur base de production
- ✅ Dernier commit (`9b8080a`) déployé sur Vercel
- ✅ Fonction SQL retourne bien `source_url`

Le chat devrait fonctionner sans erreur sur https://brisack.vercel.app/chat

🎉 **Prêt !**
