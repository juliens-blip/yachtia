# API Documentation - Yacht Legal AI

## Vue d'ensemble

L'API Agents permet aux agents MCP et applications externes d'interroger la base documentaire juridique maritime.

**Base URL**: `https://yachtia.vercel.app/api/agents` (production)
**Base URL locale**: `http://localhost:3000/api/agents`

## Authentification

Toutes les requêtes doivent inclure un header `Authorization` avec un Bearer token.

```bash
Authorization: Bearer sk_live_xxxxxxxxxxxxxxxx
```

### Obtenir une clé API

Contactez l'administrateur pour obtenir une clé API. Chaque clé est associée à:
- Un nom d'agent unique
- Une liste d'endpoints autorisés
- Un quota journalier de requêtes

### Format des clés

| Préfixe | Environnement | Exemple |
|---------|---------------|---------|
| `sk_live_` | Production | `sk_live_a1b2c3d4e5f6g7h8i9j0...` |
| `sk_test_` | Développement | `sk_test_x1y2z3...` |

## Endpoints

---

### POST /api/agents/query

Effectue une recherche RAG et génère une réponse avec Gemini.

#### Request

```bash
curl -X POST https://yachtia.vercel.app/api/agents/query \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Quelles sont les obligations AML pour un broker en France?",
    "category": "AML_KYC",
    "maxSources": 5
  }'
```

#### Parameters

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `query` | string | Oui | Question à poser (max 2000 chars) |
| `category` | string | Non | Filtrer par catégorie (MYBA, AML_KYC, MLC_2006, etc.) |
| `maxSources` | number | Non | Nombre max de sources (1-20, défaut: 5) |

#### Response (200 OK)

```json
{
  "answer": "Les obligations AML pour un broker en France incluent...",
  "sources": [
    {
      "documentName": "AML France Regulations 2024",
      "category": "AML_KYC",
      "similarity": 92,
      "pageNumber": 15
    },
    {
      "title": "TRACFIN Guidelines",
      "url": "https://example.com/tracfin",
      "category": "WEB_SEARCH",
      "similarity": 88
    }
  ],
  "groundingUsed": true,
  "responseTime": 1523,
  "metadata": {
    "agentName": "myba-compliance-agent",
    "chunksUsed": 4,
    "totalSources": 6
  }
}
```

---

### POST /api/agents/search

Recherche vectorielle pure sans génération de réponse.

#### Request

```bash
curl -X POST https://yachtia.vercel.app/api/agents/search \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "MLC 2006 crew rights",
    "category": "MLC_2006",
    "limit": 10,
    "threshold": 0.7
  }'
```

#### Parameters

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `query` | string | Oui | Requête de recherche |
| `category` | string | Non | Filtrer par catégorie |
| `limit` | number | Non | Nombre max de résultats (1-50, défaut: 10) |
| `threshold` | number | Non | Score minimum de similarité (0-1, défaut: 0.7) |

#### Response (200 OK)

```json
{
  "chunks": [
    {
      "id": "uuid-chunk-1",
      "content": "Selon la MLC 2006, les membres d'équipage ont droit...",
      "documentName": "MLC 2006 Convention",
      "category": "MLC_2006",
      "similarity": 0.94,
      "pageNumber": 42,
      "documentId": "uuid-doc-1"
    }
  ],
  "totalFound": 8,
  "responseTime": 156,
  "metadata": {
    "agentName": "crew-rights-agent",
    "threshold": 0.7,
    "limit": 10
  }
}
```

---

### POST /api/agents/analyze-document

Analyse un document PDF uploadé.

#### Request

```bash
curl -X POST https://yachtia.vercel.app/api/agents/analyze-document \
  -H "Authorization: Bearer sk_live_xxx" \
  -F "file=@contract.pdf" \
  -F "prompt=Identifie les clauses problématiques de ce contrat"
```

#### Parameters (FormData)

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `file` | File | Oui | Fichier PDF (max 10MB) |
| `prompt` | string | Non | Instructions d'analyse personnalisées |

#### Response (200 OK)

```json
{
  "analysis": "Ce contrat charter présente les points d'attention suivants:\n\n1. **Clause de responsabilité (Section 12)**...",
  "metadata": {
    "fileName": "contract.pdf",
    "fileSize": 245678,
    "fileType": "application/pdf",
    "pageCount": 15,
    "textLength": 34567,
    "uploadedAt": "2026-01-14T10:30:00Z"
  },
  "responseTime": 3421,
  "agentName": "document-analyzer"
}
```

---

## Codes d'erreur

| Code | Signification | Exemple |
|------|---------------|---------|
| 400 | Requête invalide | `{"error": "Invalid query. Provide a non-empty string."}` |
| 401 | Non authentifié | `{"error": "Missing or invalid Authorization header"}` |
| 403 | Endpoint non autorisé | `{"error": "Endpoint not allowed for this API key"}` |
| 429 | Rate limit dépassé | `{"error": "Rate limit exceeded. Maximum 1000 requests per day."}` |
| 500 | Erreur serveur | `{"error": "Internal server error"}` |

## Rate Limiting

- **Quota par défaut**: 1000 requêtes/jour par clé API
- **Fenêtre**: 24 heures glissantes
- **Header de réponse**: Pas de headers X-RateLimit (prévu v2)

## Catégories disponibles

| Valeur | Description |
|--------|-------------|
| `MYBA` | Contrats MYBA (charter, vente) |
| `AML_KYC` | Anti-Money Laundering, KYC |
| `MLC_2006` | Convention Maritime Labour |
| `PAVILLONS` | Registres maritimes (RIF, Cayman, Malta) |
| `YET` | Yacht Engaged in Trade |
| `IA_RGPD` | IA et protection données |
| `DROIT_SOCIAL` | Droit du travail maritime |

## Exemples d'intégration

### Python

```python
import requests

API_KEY = "sk_live_xxx"
BASE_URL = "https://yachtia.vercel.app/api/agents"

def query_yacht_legal(question: str, category: str = None):
    response = requests.post(
        f"{BASE_URL}/query",
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={"query": question, "category": category}
    )
    return response.json()

# Usage
result = query_yacht_legal(
    "Quelles sont les règles MYBA pour les annulations?",
    category="MYBA"
)
print(result["answer"])
```

### JavaScript/TypeScript

```typescript
const API_KEY = 'sk_live_xxx';
const BASE_URL = 'https://yachtia.vercel.app/api/agents';

async function queryYachtLegal(question: string, category?: string) {
  const response = await fetch(`${BASE_URL}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: question, category })
  });
  return response.json();
}

// Usage
const result = await queryYachtLegal(
  'Quelles sont les règles MYBA pour les annulations?',
  'MYBA'
);
console.log(result.answer);
```

### cURL

```bash
# Query avec filtrage par catégorie
curl -X POST "https://yachtia.vercel.app/api/agents/query" \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"query": "Obligations équipage yacht commercial", "category": "MLC_2006"}'

# Recherche vectorielle
curl -X POST "https://yachtia.vercel.app/api/agents/search" \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"query": "TVA charter yacht", "limit": 5}'

# Analyse document
curl -X POST "https://yachtia.vercel.app/api/agents/analyze-document" \
  -H "Authorization: Bearer sk_live_xxx" \
  -F "file=@contrat.pdf" \
  -F "prompt=Résume les obligations des parties"
```

## Bonnes pratiques

1. **Cachez vos clés API** - Ne les exposez jamais côté client
2. **Gérez les erreurs 429** - Implémentez un backoff exponentiel
3. **Utilisez les catégories** - Filtrer améliore la pertinence
4. **Limitez maxSources** - 5-10 sources suffisent généralement
5. **Loggez les réponses** - Surveillez les temps de réponse

## Changelog

### v1.0.0 (2026-01-14)
- 3 endpoints: query, search, analyze-document
- Authentification par API key SHA-256
- Rate limiting par credential
- Gemini Grounding (recherche web)
- Support PDF upload (max 10MB)
