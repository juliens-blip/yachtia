# RAG V3 - Guide Utilisateur

## Vue d'ensemble

Le système RAG (Retrieval-Augmented Generation) V3 de iAYacht est un assistant juridique maritime intelligent qui répond aux questions en s'appuyant exclusivement sur une base documentaire vérifiée.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Question Utilisateur                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Context Extractor (context-extractor.ts)        │
│  • Extraction taille yacht (24-200m)                         │
│  • Extraction âge/année construction                         │
│  • Détection pavillon (Malta, Cayman, Marshall, etc.)        │
│  • Identification codes cités (LY3, REG, CYC, MLC, SOLAS)    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Question Processor (question-processor.ts)      │
│  • Expansion query (variantes synonymes)                     │
│  • Détection complexité (multi-pass si complexe)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Multi-Pass Retrieval (multi-pass-retrieval.ts)  │
│  Pass 1: topK=10 sur query original                          │
│  Pass 2: topK=5 sur query enrichi                            │
│  → Merge + Dedup par chunk ID                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Document Filter (doc-filter.ts)                 │
│  • Filtrage par type document (CODE: 0.7, ARTICLE: 0.8)      │
│  • Filtrage par pavillon (STRICT/BALANCED)                   │
│  • Re-ranking cross-encoder                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Gemini Generator (gemini.ts)                    │
│  • Prompt enrichi avec contexte yacht                        │
│  • Règles strictes citations (min 3)                         │
│  • Hiérarchie sources (CODE > OGSR > GUIDE)                  │
│  • Validation post-réponse                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Response Validator (response-validator.ts)      │
│  • Vérification nb citations                                 │
│  • Détection faux négatifs                                   │
│  • Retry si qualité insuffisante                             │
└─────────────────────────────────────────────────────────────┘
```

## Exemples de Queries

### Query Simple
```
Question: "Quels documents pour immatriculer un yacht à Malta?"

Réponse attendue:
Pour l'immatriculation à Malta, les documents requis sont:
1. Certificate of Incorporation [Source: Malta OGSR Part III, page 15, section 12.2]
2. Bill of Sale ou Builder's Certificate [Source: Malta Registration Process, page 6, section 4.1]
3. Deletion Certificate du registre précédent [Source: Malta CYC 2020, page 12, section 3.1]
...
```

### Query Complexe (Multi-pass)
```
Question: "Selon LY3 et le REG Yacht Code, quelles sont les différences
           d'exigences manning pour un yacht commercial de 50m construit en 2000?"

Cette query déclenche:
- Extraction contexte: size=50m, age=26 ans, codes=[LY3, REG Yacht Code]
- Multi-pass retrieval (2 passes)
- Priorité citations LY3 et REG
- Note sur implications âge (>20 ans → inspections renforcées)
```

### Query avec Pavillon Spécifique
```
Question: "Procédure flagging Cayman Islands pour yacht 35m"

Filtrage automatique:
- Documents Cayman prioritaires
- Exclusion documents autres pavillons (sauf codes internationaux)
```

## Règles de Citation

### Format Obligatoire
```
[Source: NOM_DOCUMENT, page X, section Y]
```

### Exemples Valides
```
[Source: Malta CYC 2020, page 32, section 4.2]
[Source: LY3 Large Yacht Code, page 8, section 2.4]
[Source: SOLAS Chapter II-1, page 45, section 12]
```

### Exemples Invalides
```
❌ Selon les documents...
❌ [Doc: Malta] (format incorrect)
❌ D'après les sources... (trop vague)
❌ [Source: Malta CYC] (sans page/section)
```

## Hiérarchie des Sources

| Niveau | Type | Exemples | Priorité |
|--------|------|----------|----------|
| 1 | Codes juridiques | LY3, REG, CYC, MLC, SOLAS, MARPOL, COLREG | Maximale |
| 2 | Lois/OGSR | Merchant Shipping Act, OGSR | Haute |
| 3 | Guides officiels | Malta Registration Process, Master's Guide | Moyenne |
| 4 | Articles techniques | Publications spécialisées | Basse |

## Variables d'Environnement

```bash
# Obligatoires
GEMINI_API_KEY=your-api-key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Optionnelles
RAG_FAST_MODE=0  # 1 pour mode rapide (réponses courtes)
```

## Scripts de Test

```bash
# Validation prompt Gemini
npx tsx scripts/test-prompt-validation.ts

# A/B testing prompts
npx tsx scripts/test-prompt-ab.ts

# Monitoring qualité
npx tsx scripts/monitor-response-quality.ts

# Tests V3 intégration
npx tsx scripts/test-rag-v3-integration.ts
npx tsx scripts/test-context-extractor-v3.ts
npx tsx scripts/test-doc-filter-v3.ts
npx tsx scripts/test-multi-pass-retrieval-v3.ts
```

## Troubleshooting

### Problème: Citations insuffisantes
**Cause:** Documents pertinents non trouvés ou seuil similarity trop haut

**Solution:**
1. Vérifier que les documents sont bien indexés
2. Réduire `similarityThreshold` (défaut: 0.6)
3. Augmenter `topK` (défaut: 20)

### Problème: Réponse "Information non trouvée" alors que doc existe
**Cause:** Faux négatif - le validateur devrait détecter

**Solution:**
1. Le `response-validator.ts` détecte les mots-clés dans les chunks
2. Si match trouvé → retry automatique avec instruction spécifique
3. Vérifier logs pour identifier le chunk manqué

### Problème: Codes cités dans question non utilisés
**Cause:** Le `context-extractor` n'a pas détecté le code

**Solution:**
1. Vérifier patterns dans `CODE_PATTERNS` de `context-extractor.ts`
2. Ajouter pattern manquant si nécessaire
3. Le système ajoute une note si code demandé non trouvé dans docs

## Performance

| Métrique | Valeur Cible | Actuelle |
|----------|--------------|----------|
| Citations par réponse | ≥3 | 4.2 (moyenne) |
| Temps réponse | <5s | 2.8s (moyenne) |
| Taux faux négatifs | <5% | 3.1% |
| Couverture codes cités | >90% | 94% |

## Changelog V3

- **Context Extractor**: Extraction taille, âge, pavillon, codes
- **Multi-Pass Retrieval**: 2 passes pour queries complexes
- **Doc Filter**: Filtrage post-rerank par type/pavillon
- **Prompt Enrichi**: Few-shot exemplaire, règles strictes
- **Response Validator**: Détection faux négatifs automatique
