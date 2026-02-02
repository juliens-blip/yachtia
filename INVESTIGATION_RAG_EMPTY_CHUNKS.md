# 🚨 Investigation RAG - Chunks Vides

**Date:** 2026-01-29 15:15  
**Agent:** Amp (suite de Claude)  
**Statut:** CRITIQUE - Cause racine identifiée

---

## 🔍 Problème Rapporté (Perplexity)

L'IA répond systématiquement:
> "Puisque je n'ai aucun document à disposition, je vais indiquer 'Information non disponible dans la base documentaire.'"

Même sur des questions ciblées (Malta RMI, CYC 2020/2025, TVA charter).

### 5 Problèmes Identifiés par Perplexity

1. **Mauvais ciblage des documents** - Lit des docs génériques au lieu des codes/lois ciblés
2. **Ne combine pas les sources** - 1-3 docs max au lieu de croiser 5-10 sources
3. **Déclare trop vite "base incomplète"** - Même quand l'info existe
4. **Ignore structure/contexte** - Pas d'adaptation taille/âge yacht
5. **Ne priorise pas codes/lois** - Articles de blog > textes normatifs

---

## 🔬 Investigation Claude (T-050)

### Résultats DB

```bash
# Documents table
curl -H "apikey: ..." "https://hmbattewt...supabase.co/rest/v1/documents?select=name,category"
# → 259 documents OK (tous ingérés)

# Chunks table  
curl -H "apikey: ..." "https://hmbattewt...supabase.co/rest/v1/document_chunks?select=count"
# → content-range: */0
# → VIDE ❌❌❌
```

### Cause Racine

**La table `document_chunks` est VIDE** malgré 259 documents dans `documents`.

**Conséquence:**
- Aucun embedding généré
- `search_documents()` fait un vector search sur 0 embeddings → retourne []
- Gemini reçoit 0 chunks → répond "aucun doc à disposition"

---

## 📊 Données Disponibles

### Documents par Catégorie (259 total)

| Catégorie | Count | Exemples |
|-----------|-------|----------|
| AML_KYC | 5 | ALP Assurances Enhanced KYC 2025, Rosemont AML Laws EU |
| PAVILLON_MALTA | 18 | OGSR Malta, Merchant Shipping Act, CYC 2020/2025, TMF Group |
| PAVILLON_MARSHALL | 12 | RMI Maritime Regulations, Flag State Compliance |
| PAVILLON_CAYMAN | 8 | Cayman Flag Registry, Shipping Act |
| TVA_CHARTER_MED | 22 | VAT Smartbook, IYC Guides, YW Articles, BTM Guides |
| CODES_REGS | 30+ | ISM, SOLAS, MLC, CYC, LY3, REG YC |
| ... | ... | ... |

**Corpus très riche** (exactement ce que Perplexity décrit comme manquant).

### Scripts d'Ingestion Existants

```
scripts/
├── ingest-reference-docs.ts     ← Principal (259 docs uploaded)
├── ingest-simple.mjs            ← Alternative
├── ingest-new-categories.ts     ← Ajout catégories
└── add-new-radiation-sources.ts ← Cas spécifique
```

**Problème:** Aucun script ne génère les chunks/embeddings.

---

## 🛠️ Code Existant

### Chunker (lib/chunker.ts)

✅ **Bien implémenté:**
- Chunk size: 500 tokens (~2000 chars)
- Overlap: 200 tokens (40%)
- Métadonnées: section, headers, page
- Smart chunking: préserve sentences/structures

### Scripts d'Ingestion

❌ **Tous uploadent les docs SANS chunker:**

```typescript
// ingest-reference-docs.ts (ligne ~300)
const { data, error } = await supabase
  .from('documents')
  .upsert({
    name: doc.name,
    category: doc.category,
    // ❌ PAS de chunking
    // ❌ PAS d'embeddings
  })
```

**Il manque:**
1. Appel à `chunkText(content)` après extraction PDF/URL
2. Génération embeddings via `embed()` pour chaque chunk
3. Insert dans `document_chunks` avec embeddings

---

## 📋 Plan de Correction (T-051)

### Objectif
Créer `scripts/chunk-and-embed-all-documents.ts` pour:
1. Lire les 259 documents existants
2. Extraire le contenu brut (réingest si nécessaire)
3. Chunker avec `lib/chunker.ts`
4. Générer embeddings (text-embedding-3-large, dim 3072)
5. Insert dans `document_chunks`

### Étapes

**Phase 1: Script de Chunking**
- [ ] Créer `scripts/chunk-and-embed-all-documents.ts`
- [ ] Fonction: `extractContentFromDoc(doc)` → string
- [ ] Fonction: `chunkDocument(doc, content)` → TextChunk[]
- [ ] Fonction: `embedChunks(chunks)` → Embedding[]
- [ ] Fonction: `insertChunksToDb(chunks, embeddings)`

**Phase 2: Test sur 1 doc**
- [ ] Test Malta CYC 2020/2025
- [ ] Vérifier chunks générés (attendu: ~10-20 chunks)
- [ ] Vérifier embeddings (dim 3072)
- [ ] Vérifier insert DB

**Phase 3: Traitement Batch**
- [ ] Batch 10 docs à la fois (rate limits OpenAI)
- [ ] Progress bar + logging
- [ ] Retry logic si échec

**Phase 4: Validation E2E**
- [ ] Test query: "Malta commercial yacht requirements"
- [ ] Vérifier chunks retournés (attendu: 5-10)
- [ ] Vérifier Gemini répond avec citations

---

## 🎯 Critères de Succès

| Métrique | Avant | Objectif |
|----------|-------|----------|
| Chunks dans DB | 0 | ~3000-5000 |
| Embeddings générés | 0 | ~3000-5000 |
| Docs retournés par search | 0 | 5-10 par query |
| Réponses Gemini avec citations | 0% | 80%+ |
| Fallback "aucun doc" | 100% | 0% |

---

## 🔗 Fichiers Critiques

- `/yacht-legal-ai/lib/chunker.ts` - Chunking logic ✅
- `/yacht-legal-ai/lib/embed.ts` - Embedding generation
- `/yacht-legal-ai/scripts/ingest-reference-docs.ts` - Ingestion actuelle (à modifier)
- `/yacht-legal-ai/scripts/chunk-and-embed-all-documents.ts` - **À CRÉER**

---

## ⏭️ Prochaine Action

**T-051:** ✅ SOLUTION DOCUMENTÉE - `SOLUTION_RAG_CHUNKS_VIDES.md`

**Blocage:** Réseau offline → impossible de télécharger PDFs/HTMLs

**Action requise:** Julien doit exécuter `npm run ingest:all` une fois le réseau disponible

**Estimation:** ~45-60 min pour ingérer 259 documents → 3000-5000 chunks
