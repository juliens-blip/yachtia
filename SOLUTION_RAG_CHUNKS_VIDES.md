# 🔧 SOLUTION: RAG Chunks Vides - Guide Complet

**Date:** 2026-01-29 15:50  
**Agent:** Amp  
**Statut:** ⚠️ BLOQUÉ PAR RÉSEAU OFFLINE - Solution documentée

---

## 🚨 Problème Critique

**Symptôme:** L'IA répond systématiquement "Puisque je n'ai aucun document à disposition..."

**Cause racine:** Table `document_chunks` vide (0 rows) malgré 259 documents dans `documents`

```sql
SELECT COUNT(*) FROM documents;        -- 259 ✅
SELECT COUNT(*) FROM document_chunks;  -- 0   ❌
```

**Conséquence:** Vector search retourne [] → Gemini reçoit 0 contexte → fallback internet 100%

---

## 📊 État Actuel

### Documents Existants
- **259 documents** ingérés dans table `documents`
- **Tous** ont `file_url` et `source_url` valides
- **Catégories:** PAVILLON_MALTA (18), TVA_CHARTER_MED (22), PAVILLON_MARSHALL (12), CODES_REGS (30+), MYBA, AML_KYC, etc.
- **Aucun** n'a de champ `content` (juste métadonnées + URLs)

### Storage Supabase
- **1 seul PDF** dans bucket `documents/documents/`
- **Les 259 autres** ne sont PAS stockés dans Supabase Storage
- **Implication:** Chunking nécessite re-téléchargement depuis URLs

### Réseau
- **Status:** ❌ OFFLINE (getaddrinfo ENOTFOUND)
- **URLs testées:** www.yachtmca.com, autres → FAIL
- **Blocage:** Impossible de télécharger PDFs/HTMLs

---

## ✅ Solution Complète

### Option 1: Ingestion Automatique (RECOMMANDÉ)

**Quand:** Une fois le réseau disponible

**Script:** `scripts/ingest-reference-docs.ts` (DÉJÀ COMPLET)

**Fonctionnalités:**
- ✅ Télécharge PDFs + scrape HTML
- ✅ Extrait texte (pdf-parse + cheerio)
- ✅ Chunking (500 tokens, 200 overlap, métadonnées)
- ✅ Génère embeddings (batch de 10, 768 dims)
- ✅ Insère dans `document_chunks`
- ✅ Rate limiting + retry logic + stats

**Commande:**
```bash
cd /home/julien/Documents/iayacht/yacht-legal-ai
npm run ingest:all 2>&1 | tee logs/ingestion-full-$(date +%Y%m%d-%H%M%S).log
```

**Durée estimée:** ~45-60 min (259 docs, rate limits OpenAI)

**Résultat attendu:**
- `document_chunks`: 3000-5000 chunks insérés
- Embeddings: 768 dimensions chacun
- Avg: 12-20 chunks/document

### Option 2: Ingestion Sélective (si Option 1 échoue)

**Scénario:** Certaines URLs sont cassées

**Script à créer:** `scripts/reingest-from-urls-robust.ts`

**Logique:**
```typescript
1. Fetch 259 documents from DB
2. For each document:
   - Try download from file_url (timeout 30s)
   - If fail, try source_url
   - If fail, skip and log error
   - If success:
     * Extract text
     * Chunk (500 tokens, 200 overlap)
     * Generate embeddings (batch 10)
     * Insert into document_chunks
3. Report:
   - Succès: X/259
   - Échecs: Y URLs (with reasons)
   - Chunks créés: Z total
```

**Avantages:** Resilient aux URLs cassées

**Inconvénient:** Plus de code à écrire

---

## 🚀 Étapes d'Exécution (Pour Julien)

### Pré-requis

1. **Vérifier réseau:** `ping google.com` ou `curl -I https://www.yachtmca.com`
2. **Vérifier env:** `.env.local` contient `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. **Vérifier dépendances:** `npm install` (déjà fait normalement)

### Exécution

```bash
# 1. Aller dans le projet
cd ~/Documents/iayacht/yacht-legal-ai

# 2. Créer dossier logs si nécessaire
mkdir -p logs

# 3. Lancer l'ingestion
npm run ingest:all 2>&1 | tee logs/ingestion-$(date +%Y%m%d-%H%M%S).log

# 4. Pendant l'exécution, surveiller:
# - Progression (batch X/Y)
# - Erreurs (URLs cassées, rate limits)
# - Chunks créés

# 5. En cas d'interruption:
# Le script est idempotent: il skip les docs déjà chunkés
# Relancer simplement la même commande
```

### Monitoring

**Terminal 1:**
```bash
# Suivre les logs en temps réel
tail -f logs/ingestion-<timestamp>.log
```

**Terminal 2:**
```bash
# Vérifier progression DB (toutes les 30s)
watch -n 30 'curl -s -H "apikey: <SERVICE_ROLE_KEY>" "https://<PROJECT>.supabase.co/rest/v1/document_chunks?select=count" -H "Range-Unit: items" -H "Prefer: count=exact" | grep -o "content-range: [0-9]*/[0-9]*"'
```

### Post-Vérification

```bash
# 1. Compter chunks
npm run db:count-chunks  # Script à créer ou SQL direct

# 2. Tester RAG
npm run test:e2e

# 3. Question test
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the requirements for Malta commercial yacht registration?"}'

# Attendu: Réponse avec 3+ citations du CYC, OGSR Malta, etc.
```

---

## 📋 Vérifications Détaillées

### 1. Chunks Créés

```sql
-- Total chunks
SELECT COUNT(*) as total_chunks FROM document_chunks;
-- Attendu: 3000-5000

-- Avg chunks par document
SELECT 
  COUNT(DISTINCT document_id) as total_docs,
  COUNT(*) as total_chunks,
  ROUND(COUNT(*)::numeric / COUNT(DISTINCT document_id), 2) as avg_chunks_per_doc
FROM document_chunks;
-- Attendu: 259 docs, 3000-5000 chunks, avg 12-20

-- Documents sans chunks
SELECT d.id, d.name, d.category
FROM documents d
LEFT JOIN document_chunks dc ON dc.document_id = d.id
WHERE dc.id IS NULL;
-- Attendu: 0 rows (ou quelques docs si URLs cassées)
```

### 2. Embeddings Valides

```sql
-- Dimension embeddings
SELECT 
  chunk_index,
  array_length(chunk_vector, 1) as embedding_dim
FROM document_chunks
LIMIT 5;
-- Attendu: embedding_dim = 768 pour tous

-- Chunks sans embeddings
SELECT COUNT(*) 
FROM document_chunks 
WHERE chunk_vector IS NULL 
   OR array_length(chunk_vector, 1) != 768;
-- Attendu: 0
```

### 3. Test RAG End-to-End

```typescript
// scripts/test-rag-after-ingestion.ts
import './load-env'
import { searchDocuments } from '../lib/search-documents'
import { generateAnswer } from '../lib/gemini'

async function main() {
  const question = "What are the requirements for Malta commercial yacht registration?"
  
  console.log(`Question: ${question}\n`)
  
  // Step 1: Search documents
  const results = await searchDocuments(question, {})
  console.log(`✅ Retrieved ${results.length} chunks`)
  
  if (results.length === 0) {
    console.error('❌ FAIL: No chunks retrieved')
    process.exit(1)
  }
  
  // Step 2: Generate answer
  const context = results.map(r => r.chunk_text)
  const metadata = results.map(r => ({
    name: r.documentName,
    category: r.category,
    url: r.source_url
  }))
  
  const answer = await generateAnswer(question, context, [], metadata)
  
  console.log(`\n✅ Answer:\n${answer}\n`)
  
  // Validation
  const hasCitations = answer.includes('[Source:')
  const mentionsMalta = answer.toLowerCase().includes('malta')
  
  if (!hasCitations) {
    console.error('❌ FAIL: No citations in answer')
    process.exit(1)
  }
  
  if (!mentionsMalta) {
    console.error('⚠️  WARNING: Answer doesn\'t mention Malta')
  }
  
  console.log('✅ TEST PASSED')
}

main()
```

---

## 🎯 Métriques de Succès

| Métrique | Avant | Objectif | Commande |
|----------|-------|----------|----------|
| **Documents** | 259 | 259 | `SELECT COUNT(*) FROM documents` |
| **Chunks** | 0 | 3000-5000 | `SELECT COUNT(*) FROM document_chunks` |
| **Avg chunks/doc** | 0 | 12-20 | `SELECT AVG(chunk_count) FROM ...` |
| **Embedding dim** | N/A | 768 | `SELECT array_length(chunk_vector, 1) ...` |
| **Search results** | 0 | 5-10 | Test RAG query |
| **Citations** | 0% | 80%+ | Test Gemini answers |
| **Fallback internet** | 100% | <20% | Monitor logs |

---

## ⚠️ Problèmes Potentiels & Solutions

### 1. Rate Limiting OpenAI

**Symptôme:** Erreur 429 "Rate limit exceeded"

**Solution:**
```typescript
// Dans ingest-reference-docs.ts
const BATCH_SIZE = 5  // Réduire de 10 → 5
const DELAY_BETWEEN_BATCHES = 5000  // Augmenter de 2s → 5s
```

### 2. URLs Cassées

**Symptôme:** Échec download pour certains documents

**Solution:**
- Noter les URLs cassées dans logs
- Créer issue pour mise à jour `reference-urls.ts`
- Chercher sources alternatives
- Re-run ingestion après mise à jour

### 3. Embeddings Dimension Mismatch

**Symptôme:** Erreur "dimension mismatch" lors de vector search

**Vérification:**
```sql
SELECT DISTINCT array_length(chunk_vector, 1) as dim
FROM document_chunks;
-- Doit retourner UNE SEULE valeur: 768
```

**Solution:** Si plusieurs dimensions trouvées:
```sql
-- Supprimer chunks avec mauvaise dimension
DELETE FROM document_chunks
WHERE array_length(chunk_vector, 1) != 768;

-- Re-ingérer ces documents
```

### 4. Out of Memory

**Symptôme:** Node crashes avec "JavaScript heap out of memory"

**Solution:**
```bash
# Augmenter heap size
NODE_OPTIONS="--max-old-space-size=4096" npm run ingest:all
```

---

## 🛠️ Scripts Utilitaires

### 1. Compter Chunks

```bash
cat > scripts/count-chunks.ts << 'EOF'
import './load-env'
import { supabaseAdmin } from '../lib/supabase'

async function main() {
  const { count, error } = await supabaseAdmin
    .from('document_chunks')
    .select('*', { count: 'exact', head: true })
  
  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }
  
  console.log(`Total chunks: ${count}`)
}

main()
EOF

npm run count-chunks
```

### 2. Lister Documents Sans Chunks

```bash
cat > scripts/find-missing-chunks.ts << 'EOF'
import './load-env'
import { supabaseAdmin } from '../lib/supabase'

async function main() {
  const { data: docs, error: docsError } = await supabaseAdmin
    .from('documents')
    .select('id, name, category')
  
  if (docsError || !docs) {
    console.error('Error:', docsError)
    process.exit(1)
  }
  
  const missing = []
  
  for (const doc of docs) {
    const { count } = await supabaseAdmin
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', doc.id)
    
    if (count === 0) {
      missing.push(doc)
    }
  }
  
  console.log(`Documents without chunks: ${missing.length}/${docs.length}`)
  missing.forEach(d => console.log(`  - [${d.category}] ${d.name}`))
}

main()
EOF

npm run find-missing
```

### 3. Supprimer Tous les Chunks (Reset)

```bash
cat > scripts/reset-chunks.ts << 'EOF'
import './load-env'
import { supabaseAdmin } from '../lib/supabase'

async function main() {
  console.log('⚠️  WARNING: This will DELETE ALL chunks!')
  
  const { error } = await supabaseAdmin
    .from('document_chunks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')  // Delete all
  
  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }
  
  console.log('✅ All chunks deleted')
}

main()
EOF

# À utiliser UNIQUEMENT si ingestion échoue complètement
npm run reset-chunks
```

---

## 📝 Checklist Finale

### Avant Ingestion
- [ ] Réseau opérationnel (test `curl` ou `ping`)
- [ ] `.env.local` complet (GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY)
- [ ] `npm install` à jour
- [ ] Dossier `logs/` créé

### Pendant Ingestion
- [ ] Surveiller logs (erreurs, progression)
- [ ] Vérifier DB chunks count augmente
- [ ] Noter URLs cassées si erreurs

### Après Ingestion
- [ ] Vérifier chunk count (3000-5000)
- [ ] Vérifier embedding dim (768)
- [ ] Vérifier documents sans chunks (0)
- [ ] Tester RAG query (Malta, TVA, etc.)
- [ ] Vérifier citations présentes (80%+)
- [ ] Tester E2E avec `npm run test:e2e`

### Si Succès
- [ ] Commiter modifications
- [ ] Push vers repo
- [ ] Mettre à jour CLAUDE.md avec résultats
- [ ] Fermer ticket/issue Perplexity

---

## 🎉 Résultat Attendu

**AVANT:**
```
User: "Malta commercial yacht requirements?"
AI: "Puisque je n'ai aucun document à disposition..."
```

**APRÈS:**
```
User: "Malta commercial yacht requirements?"
AI: "Pour enregistrer un yacht commercial à Malte, voici les principales exigences:

1. Éligibilité propriétaire: Selon l'OGSR Malta, les propriétaires doivent... [Source: OGSR Malta Yacht Code, page 12]

2. Conformité CYC 2020/2025: Le yacht doit satisfaire... [Source: CYC Code Complete 2020 Edition, section 3.2]

3. Inspections et surveys: Pour un yacht de 38m construit en 2010... [Source: Transport Malta Registration Process]

(3+ citations minimum, contexte précis, 0% fallback internet)
```

---

**🚀 PRÊT À EXÉCUTER**

**Commande:**
```bash
cd ~/Documents/iayacht/yacht-legal-ai
npm run ingest:all 2>&1 | tee logs/ingestion-$(date +%Y%m%d-%H%M%S).log
```

**Note pour Julien:** Une fois le réseau opérationnel, lance cette commande et laisse tourner ~1h. Amp ne peut pas l'exécuter maintenant (réseau offline).

---

**Généré par:** Amp  
**Date:** 2026-01-29 15:50  
**Status:** ⏳ EN ATTENTE RÉSEAU
