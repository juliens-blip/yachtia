# 🤖 Agent API Documentation

**Version:** 1.0  
**Base URL:** `https://your-domain.com/api/agents`  
**Authentication:** Bearer Token (API Key)

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Endpoints](#endpoints)
   - [POST /query](#post-query) - Chat with RAG + Grounding
   - [POST /search](#post-search) - Vector search only
   - [POST /analyze-document](#post-analyze-document) - PDF analysis
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Examples](#examples)

---

## 🔐 Authentication

All API requests require an API key passed in the `Authorization` header:

```http
Authorization: Bearer YOUR_API_KEY_HERE
```

### Obtaining an API Key

Contact your system administrator to create an agent credential. You will receive:
- **API Key:** `[your-api-key]` (32+ characters, format: prefix_random)
- **Agent Name:** Identifier for your application
- **Allowed Endpoints:** List of permitted endpoints
- **Rate Limit:** Maximum requests per day (default: 1000)

⚠️ **Security:**
- Store API keys securely (environment variables, secrets manager)
- Never commit API keys to version control
- Rotate keys periodically
- Revoke immediately if compromised

---

## 📡 Endpoints

### POST /query

**Purpose:** Ask questions and get AI-generated answers with RAG + web grounding.

**Request:**
```http
POST /api/agents/query
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "query": "Quelles sont les obligations AML pour yacht brokers en France?",
  "category": "AML",          // Optional: filter by category
  "maxSources": 5             // Optional: max chunks to retrieve (default: 5)
}
```

**Response (200 OK):**
```json
{
  "answer": "Selon les documents AML, les yacht brokers en France doivent...",
  "sources": [
    {
      "documentName": "AML Guidelines 2023",
      "category": "AML",
      "similarity": 87,
      "pageNumber": 12
    },
    {
      "title": "Recherche web",
      "url": "https://example.com/aml-france",
      "category": "WEB_SEARCH",
      "similarity": 95
    }
  ],
  "groundingUsed": true,
  "responseTime": 2340,
  "metadata": {
    "agentName": "MyBot",
    "chunksUsed": 5,
    "totalSources": 6
  }
}
```

**Parameters:**
- `query` (required, string, max 2000 chars): User question
- `category` (optional, string): Filter by category (MYBA, AML, MLC, etc.)
- `maxSources` (optional, number, max 10): Number of chunks to retrieve

**Use Cases:**
- Chatbots answering maritime law questions
- AI assistants for yacht brokers
- Legal research tools

---

### POST /search

**Purpose:** Retrieve relevant document chunks via vector search (no answer generation).

**Request:**
```http
POST /api/agents/search
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "query": "MYBA charter agreement clause 15",
  "category": "MYBA",         // Optional
  "limit": 10,                // Optional: max chunks (default: 10, max: 50)
  "threshold": 0.7            // Optional: min similarity (default: 0.7)
}
```

**Response (200 OK):**
```json
{
  "chunks": [
    {
      "id": "uuid",
      "content": "Clause 15: Payment Terms...",
      "documentName": "MYBA Charter Agreement 2023",
      "category": "MYBA",
      "similarity": 0.89,
      "pageNumber": 15,
      "documentId": "uuid"
    }
  ],
  "totalFound": 8,
  "responseTime": 145,
  "metadata": {
    "agentName": "MyBot",
    "threshold": 0.7,
    "limit": 10
  }
}
```

**Parameters:**
- `query` (required, string): Search query
- `category` (optional, string): Filter by category
- `limit` (optional, number, max 50): Max results
- `threshold` (optional, number, 0-1): Minimum similarity score

**Use Cases:**
- Building custom RAG pipelines
- Document retrieval systems
- Research assistants

---

### POST /analyze-document

**Purpose:** Upload and analyze a PDF document.

**Request:**
```http
POST /api/agents/analyze-document
Authorization: Bearer YOUR_API_KEY
Content-Type: multipart/form-data

FormData:
  file: [PDF file, max 10MB]
  prompt: "Summarize key obligations and risks"  // Optional
```

**Response (200 OK):**
```json
{
  "analysis": "This charter agreement contains the following key points: ...",
  "metadata": {
    "fileName": "contract.pdf",
    "fileSize": 2457600,
    "fileType": "application/pdf",
    "uploadedAt": "2026-01-14T12:00:00Z"
  },
  "responseTime": 3200,
  "agentName": "MyBot",
  "note": "Full PDF text extraction requires pdf-parse library. This is a placeholder implementation."
}
```

**Parameters:**
- `file` (required, multipart): PDF file (max 10MB)
- `prompt` (optional, string): Custom analysis instructions

**Use Cases:**
- Contract analysis
- Due diligence automation
- Document summarization

---

## ⏱️ Rate Limiting

Each API key has a daily rate limit (default: 1000 requests/day).

**Rate Limit Headers:**
- Response includes usage tracking via database
- Exceeding limit returns `429 Too Many Requests`

**Error Response (429):**
```json
{
  "error": "Rate limit exceeded. Maximum 1000 requests per day."
}
```

**Tips:**
- Implement client-side rate limiting
- Cache responses when possible
- Use `/search` for retrieval-only use cases (faster)
- Contact admin to increase limits for production apps

---

## ⚠️ Error Handling

### Error Response Format
```json
{
  "error": "Human-readable error message",
  "details": "Technical details (development only)"
}
```

### Common HTTP Status Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `400` | Bad Request | Check request body format and parameters |
| `401` | Unauthorized | Verify API key is valid and active |
| `403` | Forbidden | Endpoint not allowed for your API key |
| `429` | Too Many Requests | Reduce request rate or contact admin |
| `500` | Internal Server Error | Retry with exponential backoff |

### Best Practices
- Implement exponential backoff for retries
- Log errors for debugging
- Handle rate limits gracefully
- Validate inputs client-side

---

## 💡 Examples

### Example 1: Node.js with Fetch

```javascript
const API_KEY = process.env.YACHT_LEGAL_API_KEY

async function askQuestion(query) {
  const response = await fetch('https://your-domain.com/api/agents/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      maxSources: 5
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error)
  }

  return await response.json()
}

// Usage
const result = await askQuestion('What is the MYBA charter agreement?')
console.log(result.answer)
console.log('Sources:', result.sources.length)
```

### Example 2: Python with Requests

```python
import requests
import os

API_KEY = os.getenv('YACHT_LEGAL_API_KEY')
BASE_URL = 'https://your-domain.com/api/agents'

def search_documents(query, category=None, limit=10):
    response = requests.post(
        f'{BASE_URL}/search',
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        },
        json={
            'query': query,
            'category': category,
            'limit': limit
        }
    )
    
    response.raise_for_status()
    return response.json()

# Usage
results = search_documents('AML obligations', category='AML')
for chunk in results['chunks']:
    print(f"{chunk['documentName']}: {chunk['similarity']:.2f}")
```

### Example 3: cURL

```bash
# Query endpoint
curl -X POST https://your-domain.com/api/agents/query \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are crew rights under MLC 2006?",
    "category": "MLC"
  }'

# Search endpoint
curl -X POST https://your-domain.com/api/agents/search \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "VAT exemptions yachts",
    "limit": 5,
    "threshold": 0.75
  }'

# Analyze document
curl -X POST https://your-domain.com/api/agents/analyze-document \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@contract.pdf" \
  -F "prompt=Summarize payment terms and liabilities"
```

### Example 4: MCP Server Integration

```typescript
// MCP Server Tool Definition
{
  name: 'yacht_legal_query',
  description: 'Query Yacht Legal AI database',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Legal question' },
      category: { type: 'string', description: 'Optional category filter' }
    },
    required: ['query']
  }
}

// Tool Implementation
async function yachtLegalQuery(args: { query: string; category?: string }) {
  const response = await fetch('https://your-domain.com/api/agents/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  })
  
  const data = await response.json()
  return {
    content: [{
      type: 'text',
      text: data.answer
    }]
  }
}
```

---

## 🛠️ Admin Operations

### Creating Agent Credentials

```typescript
import { createAgentCredential } from '@/lib/agent-auth'

const result = await createAgentCredential({
  agentName: 'Production Bot',
  agentDescription: 'Main chatbot for yacht-legal.com',
  allowedEndpoints: ['/api/agents/query', '/api/agents/search'],
  maxRequestsPerDay: 5000,
  createdBy: 'admin@yacht-legal.com'
})

console.log('API Key:', result.apiKey)  // Store securely!
console.log('Credential ID:', result.credentialId)
```

### Revoking API Keys

```typescript
import { revokeApiKey } from '@/lib/agent-auth'

await revokeApiKey(credentialId, 'Security breach - rotating keys')
```

---

## 📞 Support

- **Documentation:** https://yacht-legal.com/docs
- **Email:** support@yacht-legal.com
- **Status:** https://status.yacht-legal.com

---

**Last Updated:** 2026-01-14  
**API Version:** 1.0  
**Changelog:** See CHANGELOG.md
