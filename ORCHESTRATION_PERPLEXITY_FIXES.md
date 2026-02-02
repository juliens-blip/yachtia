# 🎯 ORCHESTRATION - Fixes Problèmes Perplexity RAG

**Date:** 2026-01-24  
**Orchestrateur:** Claude  
**Mission:** Corriger 6 problèmes identifiés par Perplexity sur choix documents RAG

---

## 📋 Problèmes Identifiés

### ❌ Problème 1: Mauvais choix de documents
- Priorise articles généraux (OB Magazine, blogs) au lieu de codes/lois (LY3, REG Yacht Code, OGSR, Merchant Shipping Act)
- Pour Malte: ignore OGSR Malta, Merchant Shipping Act, Registration Process
- Pour Cayman/REG: ne remonte pas LY3 / REG Yacht Code / Master's Guide

### ❌ Problème 2: Fusion insuffisante de sources
- Se contente de 1-2 documents seulement
- Ne combine pas: OGSR + Merchant Shipping Act + Registration Process + guides cabinets

### ❌ Problème 3: Déclarations fausses "base insuffisante"
- Dit "pas d'info sur éligibilité nationalité/société" alors que docs OGSR + EMD le détaillent
- Dit "pas d'info inspections âge" alors que guides cabinets les donnent (10-15, 15-20, 20-25, >25 ans)

### ❌ Problème 4: Pas de contexte chiffré (50m, année 2000)
- Ne tire pas conséquences: yacht 45m construit 2000 = >20-25 ans → inspections renforcées/waivers
- Pour 50m Cayman/REG: ne considère pas >500 GT → pleinement MLC/SOLAS

### ❌ Problème 5: Pas assez spécifique aux codes cités
- Question mentionne "selon LY3 et REG Yacht Code" → va chercher articles flags au lieu de ces docs
- Ne cite pas définition LY3/REG: "large commercial yacht" (≥24m, <13 pax)

### ❌ Problème 6: Bruit dans sources
- Question Malte → sources incluent Monaco et VAT Italie
- Sélection finale pas filtrée par: pavillon, thème (eligibility vs VAT)

---

## 🎯 Plan de Correction

### Phase 1: Système de Tags & Métadonnées (CODEX)

**T011-PERPLEXITY:** Ajouter tags structurés aux documents
- Schema DB: `document_type` (CODE/OGSR/LOI/GUIDE/ARTICLE), `flag` (Malta/Cayman/Marshall/etc), `themes` (eligibility/inspection/manning/etc)
- Migration SQL: ALTER TABLE documents ADD COLUMN tags
- Update ingestion scripts pour auto-tagging via règles

**T012-PERPLEXITY:** Améliorer extracteur contexte
- Extraire: taille yacht (m/ft), année construction, pavillon, codes mentionnés (LY3/REG/CYC/OGSR)
- Calculer âge automatiquement (2026 - année)
- Détecter si >500 GT probable (>50m)

### Phase 2: Re-ranking Intelligent (CODEX)

**T013-PERPLEXITY:** Re-ranking avec boosts hiérarchiques
- Boost x3.0: TYPE_DOC = CODE/OGSR/LOI
- Boost x2.5: Match exact pavillon question
- Boost x2.0: Code mentionné dans question (LY3, REG, CYC)
- Boost x1.5: Thème exact (eligibility/inspection/manning)
- Penalty x0.3: Pavillon différent de question
- Penalty x0.5: Article généraliste (magazine/blog)

### Phase 3: Multi-Source Fusion (CLAUDE)

**T014-CLAUDE:** Améliorer prompt Gemini pour fusion sources
- RÈGLE: Analyser MINIMUM 5 documents différents
- RÈGLE: Croiser CODE + OGSR + GUIDE cabinet obligatoire
- RÈGLE: Si <3 sources différentes citées → refuser réponse

**T015-CLAUDE:** Filtrage anti-bruit
- Vérifier pavillon match dans top-10 chunks avant envoi Gemini
- Éliminer chunks avec pavillon contradictoire
- Logger sources éliminées pour debug

### Phase 4: Tests & Validation (CLAUDE)

**T016-CLAUDE:** Créer tests E2E Perplexity
- Question Malte (45m, 2000): éligibilité + inspections âge
- Question Cayman/REG (50m): obligations LY3 + REG Yacht Code
- Valider: 5+ sources, codes/lois prioritaires, pas bruit

---

## 📤 Distribution des Tâches

### CODEX (Backend/Tags/Re-ranking)
- T011-PERPLEXITY: Tags structurés DB + ingestion
- T012-PERPLEXITY: Extracteur contexte amélioré
- T013-PERPLEXITY: Re-ranking hiérarchique

### CLAUDE (Orchestrateur/Prompts/Tests)
- T014-CLAUDE: Prompt fusion multi-sources
- T015-CLAUDE: Filtrage anti-bruit
- T016-CLAUDE: Tests E2E validation

---

## ✅ Critères de Succès

- [ ] Tags PAVILLON + TYPE_DOC + THEMES sur tous documents
- [ ] Extracteur détecte: taille, âge, pavillon, codes mentionnés
- [ ] Re-ranking boost x3 pour CODE/OGSR/LOI
- [ ] Prompt exige 5+ documents analysés
- [ ] Filtrage élimine pavillon contradictoire
- [ ] Tests E2E: codes/lois en top-3 sources, 0% bruit pavillon

---

**Status:** 🚀 READY TO LAUNCH
