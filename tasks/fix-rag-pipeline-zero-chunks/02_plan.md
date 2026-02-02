# Phase 2: Plan de Correction - RAG Zero Chunks Bug

**Date:** 2026-01-29 14:45  
**Agent:** APEX  
**Statut:** ✅ PLAN VALIDÉ

---

## 🚨 CAUSE ROOT CONFIRMÉE

**Incompatibilité dimensionnelle totale:**
- **Base de données:** Embeddings en dimension **9714** (format inconnu/corrompu)
- **Code actuel:** Gemini génère des embeddings **768-dimensional**
- **Fonction SQL:** `search_documents` attend 768-dim mais compare avec 9714-dim → **0 résultats systématiquement**

---

## 📊 DIAGNOSTIC COMPLET

### Traces système
```
✅ Total chunks dans DB: 659
❌ Dimension vectors: 9714 (attendu: 768)
❌ search_documents avec 768-dim: 0 résultats (incompatibilité)
✅ Fonction SQL existe et fonctionne
```

### Hypothèses validées
- ❌ H1: Threshold trop strict → **Non, problème plus profond**
- ❌ H2: Déduplication agressive → **Non**
- ❌ H3: Query expansion → **Non**
- ✅ **H4 (root cause): Incompatibilité dimensionnelle des embeddings**

---

## 🎯 PLAN DE CORRECTION

### Option 1: Re-ingestion complète (RECOMMANDÉE)
**Durée:** 30-45 min  
**Fiabilité:** ✅ 100%

**Étapes:**
1. Vider la table `document_chunks`
2. Re-générer tous les embeddings avec Gemini (768-dim)
3. Re-ingérer tous les documents sources
4. Valider avec tests E2E

**Avantages:**
- Solution définitive et propre
- Garantit cohérence totale
- Profiter pour vérifier overlap 200 tokens

**Inconvénients:**
- Temps de traitement ~30 min
- Nécessite accès aux documents sources

### Option 2: Migration graduelle (FALLBACK)
**Durée:** 10-15 min  
**Fiabilité:** ⚠️ 70% (temporaire)

**Étapes:**
1. Créer nouvelle colonne `chunk_vector_gemini` (768-dim)
2. Régénérer embeddings pour chunks existants
3. Modifier `search_documents` pour utiliser nouvelle colonne
4. Cleanup ancienne colonne après validation

**Avantages:**
- Plus rapide
- Pas besoin des sources

**Inconvénients:**
- Migration complexe
- Risque de bugs résiduels
- Cleanup nécessaire après

---

## 🚀 PLAN D'EXÉCUTION (Option 1 - Recommandée)

### Phase 1: Préparation (5 min)

#### 1.1 Vérifier documents sources disponibles
```bash
cd yacht-legal-ai
ls -la documents/ public/
```

#### 1.2 Sauvegarder métadonnées actuelles
```sql
-- Via Supabase Dashboard ou script
SELECT id, name, category, created_at 
FROM documents 
ORDER BY created_at DESC;
```

#### 1.3 Créer script de cleanup
```typescript
// scripts/cleanup-chunks.ts
await supabase.from('document_chunks').delete().neq('id', '00000000-0000-0000-0000-000000000000')
await supabase.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000')
```

---

### Phase 2: Cleanup DB (2 min)

```bash
npx tsx scripts/cleanup-chunks.ts
```

**Validation:**
- Vérifier `COUNT(*)` sur `document_chunks` = 0
- Vérifier `COUNT(*)` sur `documents` = 0

---

### Phase 3: Re-ingestion (25 min)

#### 3.1 Identifier tous les scripts d'ingestion existants
```bash
ls -la scripts/ingest-*.ts scripts/add-*.ts
```

#### 3.2 Vérifier qu'ils utilisent bien `generateEmbedding()` Gemini
```bash
grep -n "generateEmbedding" scripts/ingest-*.ts
```

#### 3.3 Lancer ingestion dans l'ordre
```bash
# Ordre suggéré:
npx tsx scripts/ingest-reference-docs.ts      # Docs de base
npx tsx scripts/ingest-new-categories.ts       # Catégories
npx tsx scripts/add-new-radiation-sources.ts   # Sources spécifiques
# etc.
```

**Logs à surveiller:**
- Confirmation dimension 768
- Nombre de chunks générés
- Pas d'erreurs SQL

---

### Phase 4: Validation (10 min)

#### 4.1 Vérifier dimension des embeddings
```bash
npx tsx scripts/check-vector-dimension.ts
```

**Attendu:**
```
✅ Vector dimension: 768
✅ search_documents OK: 5+ results
```

#### 4.2 Test direct de recherche
```typescript
// scripts/test-search-after-fix.ts
const result = await searchDocuments('Malta registration requirements', undefined, 5, 0.6)
console.log('Results:', result.length, 'chunks')
// Attendu: 5+ chunks
```

#### 4.3 Tests E2E complets
```bash
npm run test:e2e
```

**Critères de succès:**
- 5/5 questions PASS
- 3+ citations minimum par réponse
- Latence < 5s
- 0% fallback internet

---

### Phase 5: Monitoring production (ongoing)

```bash
npm run dev
# Tester plusieurs questions manuellement
tail -f logs/gemini-rag.log
```

**Questions de test:**
1. "Quelles sont les obligations du vendeur dans un contrat de vente de yacht?"
2. "Comment fonctionne la garantie des vices cachés?"
3. "Quelle est la procédure pour un litige maritime?"
4. "Quels documents sont nécessaires pour immatriculer un yacht à Malta?"
5. "Quelles sont les responsabilités du capitaine?"

---

## 📋 CHECKLIST VALIDATION

### Avant de commencer
- [ ] Documents sources disponibles (ou scripts d'ingestion OK)
- [ ] Backup métadonnées effectué
- [ ] Script cleanup créé et testé en dry-run

### Pendant l'exécution
- [ ] DB nettoyée (0 chunks)
- [ ] Ingestion complète lancée
- [ ] Logs surveillés (pas d'erreur)
- [ ] Dimension 768 confirmée

### Après correction
- [ ] `check-vector-dimension.ts` → 768-dim ✅
- [ ] `test-search-after-fix.ts` → 5+ chunks ✅
- [ ] `npm run test:e2e` → 5/5 PASS ✅
- [ ] Tests manuels dev → Réponses avec citations ✅

---

## 🔧 SCRIPTS À CRÉER

1. **cleanup-chunks.ts** - Vider les tables
2. **check-vector-dimension.ts** - Déjà créé ✅
3. **test-search-after-fix.ts** - Test post-correction
4. **list-ingestion-scripts.sh** - Lister ordre d'ingestion

---

## 🚨 ROLLBACK PLAN

Si échec après Phase 3:

1. **Vérifier les logs d'ingestion** pour identifier l'erreur
2. **Re-vérifier fonction SQL** `search_documents` (dimension attendue)
3. **Tester un seul document** pour isoler le problème
4. **Contact user** si documents sources manquants

---

## ⏱️ ESTIMATION TEMPS

| Phase | Durée | Total cumulé |
|-------|-------|--------------|
| Préparation | 5 min | 5 min |
| Cleanup DB | 2 min | 7 min |
| Re-ingestion | 25 min | 32 min |
| Validation | 10 min | 42 min |
| Monitoring | 5 min | 47 min |

**Total estimé:** ~47 minutes

---

**Prochaine étape:** Phase 3 - Implémentation avec création des scripts manquants
