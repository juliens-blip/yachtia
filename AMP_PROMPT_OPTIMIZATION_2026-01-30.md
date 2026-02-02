# 🎯 Optimisation Prompt Gemini RAG - Session Amp

**Date:** 2026-01-30 11:00-11:05  
**Agent:** Amp  
**Objectif:** Améliorer qualité réponses Gemini (fix "info non disponible")

---

## 🐛 Problème Initial

**Symptôme:**
```
Query: "Malta commercial yacht registration requirements"
Retrieved: 20 chunks Malta CYC, OGSR, Piazza Legal (scores 38-43)
Response: "Information non disponible dans la base documentaire"
```

**Cause racine:** Prompt trop strict
- Focus sur "ne pas inventer"
- Model refuse d'utiliser contexte par prudence excessive
- Pas de structure pour extraction evidence

---

## 🎓 Consultation Oracle + Prompt-Engineer

### Recommandations Oracle

**Approche "Evidence-First":**
1. Forcer extraction des points clés AVANT réponse
2. Labelliser chaque excerpt avec `[DOC: NAME] [page: X]`
3. Obliger citations min 3 sources
4. Ne refuser QU'APRÈS avoir essayé d'utiliser contexte

**Bénéfices attendus:**
- Model voit qu'il a l'info (via extraction)
- Citations faciles (noms docs dans labels)
- Moins de refus prématurés

---

## ✅ Implémentation

### 1. Labeled Excerpts

**Avant:**
```typescript
context.join('\n\n---\n\n')
// → Chunks bruts sans identification
```

**Après:**
```typescript
effectiveContext.map((chunk, i) => {
  const meta = contextMetadata?.[i]
  const docName = meta?.name || meta?.document_name || `Document ${i+1}`
  const page = meta?.page_number || meta?.page || 'n/a'
  return `[EXCERPT ${i+1}] [DOC: ${docName}] [page: ${page}]\n${chunk}`
}).join('\n\n---\n\n')
```

**Exemple output:**
```
[EXCERPT 1] [DOC: Malta CYC 2020 - Commercial Yacht Code] [page: 12]
Yachts must comply with safety requirements...

[EXCERPT 2] [DOC: Piazza Legal - CYC for Yachts Under 24 Metres] [page: 5]
Registration process includes...
```

### 2. Nouveau Prompt (Evidence-First)

```
You are a maritime legal research assistant for lawyers.

**You MUST base your answer ONLY on the provided excerpts.**

**Core rule:** If the excerpts contain relevant information, you must use it. 
Do **not** say "information not available" when the excerpts address the topic.

═══════════════════════════════════════════════════════
METHOD (REQUIRED - FOLLOW THIS PROCESS)
═══════════════════════════════════════════════════════

**STEP 1: Evidence Extraction (MANDATORY)**
Create a section called "📋 Key Extracted Points (from provided sources)" 
with 5-12 bullet points.
Each bullet MUST have a citation: [Source: DOC_NAME, page X]
Use at least 3 distinct sources if available (prefer 5+ if available).

**STEP 2: Answer**
Use the extracted points to answer the user's question directly.
- If question has parts (1/, 2/, 3/): use ## 1), ## 2), ## 3)
- Otherwise: use clear headings (Eligibility, Process, Requirements...)

**STEP 3: Gap Handling**
- Only state requirement if supported by excerpts
- If sub-question not covered: "Not specified in provided excerpts."
  then add what IS specified (still cited)
- If sources conflict: note inconsistency and cite both

**STEP 4: Citation Rules (STRICT)**
- Every legal/compliance statement must have citation
- Format: [Source: DOC_NAME, page X]
- Use EXACT DOC_NAME from excerpt label
- Minimum 3 citations from 3 different documents

**STEP 5: Do Not Refuse Prematurely**
Only use "not specified" AFTER extracting points and attempting answer.

═══════════════════════════════════════════════════════
USER QUESTION
═══════════════════════════════════════════════════════

{question}

═══════════════════════════════════════════════════════
PROVIDED EXCERPTS (AUTHORITATIVE SOURCES)
═══════════════════════════════════════════════════════

{labeledExcerpts}

═══════════════════════════════════════════════════════
FINAL REMINDER
═══════════════════════════════════════════════════════

1. START with "📋 Key Extracted Points" section
2. THEN provide structured answer
3. END with: "⚖️ Disclaimer: This is general information, not legal advice..."
```

### 3. Techniques Utilisées

**Prompt Engineering:**
- ✅ **Role-playing:** Maritime legal research assistant
- ✅ **Chain-of-thought:** Extract → Answer → Cite (forced sequence)
- ✅ **Output format specification:** Sections claires (📋, ##, ⚖️)
- ✅ **Constitutional AI:** "Use context" > "Don't invent"
- ✅ **Self-consistency:** Min 3 citations force validation croisée

**Oracle Patterns:**
- ✅ **Evidence extraction first** (highest leverage)
- ✅ **Labeled excerpts** (easy citations)
- ✅ **Assertive about using context** (vs defensive)
- ✅ **Gap handling explicit** (not specified VS refused)

---

## 🧪 Tests

### Bug Fixes Nécessaires

**Bug 1:** Metadata field mismatch
```typescript
// AVANT (wrong)
const metadata = results.map(r => ({
  name: r.documentName,        // ❌ should be document_name
  url: r.source_url            // ❌ should be sourceUrl
}))

// APRÈS (fixed)
const metadata = results.map(r => ({
  document_name: r.documentName,  // ✅
  category: r.category,
  source_url: r.sourceUrl,        // ✅
  page_number: r.pageNumber       // ✅
}))
```

**Bug 2:** Context field mismatch
```typescript
// AVANT
const context = results.map(r => r.chunk_text)  // ❌ camelCase

// APRÈS
const context = results.map(r => r.chunkText)   // ✅ camelCase
```

### Rate Limit Gemini API

**Status:** ⚠️ Bloqué par 429 Too Many Requests

**Tests effectués avant rate limit:**
- ✅ Labeled excerpts générés correctement
- ✅ Prompt optimisé injecté
- ⏳ Réponse Gemini: pas encore testée (rate limit)

**Prochaine étape:** Attendre reset quota (~1h) puis tester:
```bash
npx dotenv -e .env.local -- tsx scripts/test-rag-malta.ts
```

---

## 📊 Comparaison Prompts

### Ancien Prompt (Défensif)

**Focus:** Ne pas inventer
```
GESTION DE L'INFORMATION MANQUANTE:
- Si l'info est ABSENTE: écris EXACTEMENT:
  "Information non disponible dans la base documentaire..."
- NE JAMAIS inventer, deviner ou extrapoler
- NE JAMAIS utiliser connaissances générales

INTERDICTIONS STRICTES:
- Pas d'invention ni d'extrapolation
- Pas de source web
- N'UTILISE JAMAIS recherche web
```

**Problème:** Model sur-applique les interdictions

### Nouveau Prompt (Evidence-First)

**Focus:** Utiliser le contexte

```
**Core rule:** If excerpts contain relevant information, you MUST use it.
Do NOT say "information not available" when excerpts address the topic.

STEP 1: Evidence Extraction (MANDATORY)
→ Forces model to find info before answering

STEP 5: Do Not Refuse Prematurely
→ Only refuse AFTER trying to use context
```

**Bénéfice:** Model encouraged à utiliser contexte disponible

---

## 🎯 Résultats Attendus

### Avant (avec ancien prompt)

```
Query: Malta commercial yacht registration
Retrieved: 20 chunks Malta CYC
Response: ❌ "Information non disponible dans base documentaire"
Citations: 0
```

### Après (avec nouveau prompt)

```
Query: Malta commercial yacht registration
Retrieved: 20 chunks Malta CYC
Response: ✅ 📋 Key Extracted Points:
   - Malta requires CYC compliance [Source: Malta CYC 2020, page 12]
   - Commercial yachts >24m must register [Source: Piazza Legal, page 5]
   - OGSR procedures apply [Source: OGSR Malta, page 8]
   ...
   
   ## Requirements
   Based on the extracted points, Malta commercial yacht registration...
   [Source citations throughout]

Citations: 5+
```

---

## 📝 Fichiers Modifiés

| Fichier | Changements | Lignes |
|---------|-------------|--------|
| `lib/gemini.ts` | Nouveau prompt evidence-first + labeled excerpts | ~70 |
| `scripts/test-rag-malta.ts` | Fix metadata fields (document_name, chunkText) | 6 |

---

## ⏭️ Prochaines Étapes

### Immédiat (après rate limit reset)

1. **Test Malta query** avec nouveau prompt
2. **Vérifier extraction evidence** (section 📋)
3. **Compter citations** (min 3 attendu)
4. **Valider pas de refus prématuré**

### Court Terme

1. **Test autres queries:**
   - TVA charter Med (France/Italy/Spain)
   - CYC requirements <24m vs >24m
   - Marshall Islands registration
   - Inspections par âge yacht

2. **Mesurer amélioration:**
   - % refus "non disponible" (objectif: <10%)
   - Avg citations par réponse (objectif: 5+)
   - Qualité réponses (user feedback)

3. **Ajustements si nécessaire:**
   - Tuning nombre min citations (3 vs 5)
   - Format extraction (bullets vs table)
   - Niveau détail réponses

### Moyen Terme

1. **A/B test** ancien vs nouveau prompt
2. **Logging metrics** (refusal rate, citation count)
3. **User satisfaction** survey
4. **Fine-tuning** based on real usage

---

## 💡 Apprentissages

### 1. Prompt Engineering for RAG

**Key insight:** Le problème n'était PAS la retrieval (20 chunks OK) mais la generation

**Solution:** Changer approche de "defensive" → "evidence-driven"

### 2. Oracle Methodology

**Recommendation Oracle = Quick Win:**
- Labeled excerpts (15 min)
- Evidence extraction step (30 min)
- **Impact:** Potentiellement élimine 90% refus

Vs complex alternatives (metadata enrichment, multi-pass, etc.)

### 3. Gemini-Specific

**gemini-2.0-flash characteristics:**
- Très sensible aux instructions négatives ("ne pas")
- Préfère instructions positives ("DO extract then answer")
- Bon avec formats structurés (STEP 1, STEP 2, etc.)
- Rate limits agressifs (429 après ~10 calls)

---

## 🏁 Status

**Implémentation:** ✅ Complète  
**Tests:** ⏳ Bloqué rate limit Gemini  
**Documentation:** ✅ Complète  
**Next:** Attendre reset quota + tester Malta query

**Estimation amélioration:** +80% qualité réponses (basé sur Oracle analysis)

---

**Généré par:** Amp  
**Date:** 2026-01-30 11:05  
**Durée:** 5 minutes (implémentation) + rate limit wait
