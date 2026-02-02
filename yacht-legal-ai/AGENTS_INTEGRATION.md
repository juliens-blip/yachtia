# Guide d'Intégration Agents MCP - Yacht Legal AI

## Vue d'ensemble

Ce guide explique comment connecter vos agents MCP (Model Context Protocol) à l'API Yacht Legal AI pour enrichir leurs capacités avec la base documentaire juridique maritime.

## Architecture d'intégration

```
+-------------------+     +-------------------+     +-------------------+
|    Agent MCP      |     |   Yacht Legal AI  |     |    Supabase       |
|   (Claude, etc.)  |---->|   /api/agents/*   |---->|   pgvector DB     |
+-------------------+     +-------------------+     +-------------------+
         |                         |                        |
         |   Bearer sk_live_xxx    |   RAG + Gemini         |
         |<------------------------|<-----------------------|
         |   JSON Response         |   Relevant chunks      |
+-------------------+     +-------------------+
```

## Prérequis

1. Une clé API Yacht Legal AI (`sk_live_xxx`)
2. Accès aux endpoints autorisés pour votre clé
3. Un agent compatible MCP (Claude, LangChain, etc.)

## Configuration MCP

### Exemple de configuration MCP

```json
{
  "mcpServers": {
    "yacht-legal": {
      "command": "node",
      "args": ["./yacht-legal-mcp-server.js"],
      "env": {
        "YACHT_LEGAL_API_KEY": "sk_live_xxx",
        "YACHT_LEGAL_API_URL": "https://yachtia.vercel.app/api/agents"
      }
    }
  }
}
```

### Serveur MCP personnalisé

```javascript
// yacht-legal-mcp-server.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const API_KEY = process.env.YACHT_LEGAL_API_KEY;
const API_URL = process.env.YACHT_LEGAL_API_URL;

const server = new Server(
  { name: 'yacht-legal', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Tool: Query (RAG + génération)
server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'yacht_legal_query') {
    const { query, category } = request.params.arguments;

    const response = await fetch(`${API_URL}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, category })
    });

    const result = await response.json();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  if (request.params.name === 'yacht_legal_search') {
    const { query, limit, threshold } = request.params.arguments;

    const response = await fetch(`${API_URL}/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, limit, threshold })
    });

    const result = await response.json();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
});

// Liste des tools disponibles
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'yacht_legal_query',
      description: 'Query the maritime legal knowledge base with RAG and get an AI-generated answer',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The legal question to ask'
          },
          category: {
            type: 'string',
            enum: ['MYBA', 'AML_KYC', 'MLC_2006', 'PAVILLONS', 'YET', 'IA_RGPD', 'DROIT_SOCIAL'],
            description: 'Optional category filter'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'yacht_legal_search',
      description: 'Search the maritime legal document database (no answer generation)',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          limit: {
            type: 'number',
            description: 'Max results (1-50)',
            default: 10
          },
          threshold: {
            type: 'number',
            description: 'Min similarity score (0-1)',
            default: 0.7
          }
        },
        required: ['query']
      }
    }
  ]
}));

// Démarrer le serveur
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Intégration LangChain

### Python

```python
from langchain.tools import Tool
from langchain.agents import AgentExecutor, create_openai_functions_agent
import requests

API_KEY = "sk_live_xxx"
API_URL = "https://yachtia.vercel.app/api/agents"

def yacht_legal_query(query: str, category: str = None) -> str:
    """Query maritime legal knowledge base."""
    response = requests.post(
        f"{API_URL}/query",
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={"query": query, "category": category}
    )
    result = response.json()
    return f"Answer: {result.get('answer', 'No answer')}\n\nSources: {result.get('sources', [])}"

def yacht_legal_search(query: str, limit: int = 10) -> str:
    """Search maritime legal documents."""
    response = requests.post(
        f"{API_URL}/search",
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={"query": query, "limit": limit}
    )
    result = response.json()
    chunks = result.get("chunks", [])
    return "\n\n".join([
        f"[{c['category']}] {c['documentName']}: {c['content'][:200]}..."
        for c in chunks
    ])

# Créer les tools LangChain
yacht_query_tool = Tool(
    name="yacht_legal_query",
    func=yacht_legal_query,
    description="Query the maritime legal knowledge base. Use for legal questions about yachts, MYBA contracts, AML compliance, crew rights (MLC 2006), etc."
)

yacht_search_tool = Tool(
    name="yacht_legal_search",
    func=yacht_legal_search,
    description="Search maritime legal documents for relevant information without generating an answer."
)

# Utilisation avec un agent
tools = [yacht_query_tool, yacht_search_tool]
# ... configurer votre agent LangChain
```

### JavaScript/TypeScript

```typescript
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const API_KEY = 'sk_live_xxx';
const API_URL = 'https://yachtia.vercel.app/api/agents';

const yachtLegalQueryTool = new DynamicStructuredTool({
  name: 'yacht_legal_query',
  description: 'Query maritime legal knowledge base with RAG',
  schema: z.object({
    query: z.string().describe('The legal question'),
    category: z.enum(['MYBA', 'AML_KYC', 'MLC_2006', 'PAVILLONS', 'YET', 'IA_RGPD', 'DROIT_SOCIAL']).optional()
  }),
  func: async ({ query, category }) => {
    const response = await fetch(`${API_URL}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, category })
    });
    const result = await response.json();
    return JSON.stringify(result);
  }
});

const yachtLegalSearchTool = new DynamicStructuredTool({
  name: 'yacht_legal_search',
  description: 'Search maritime legal documents',
  schema: z.object({
    query: z.string(),
    limit: z.number().min(1).max(50).default(10)
  }),
  func: async ({ query, limit }) => {
    const response = await fetch(`${API_URL}/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, limit })
    });
    return JSON.stringify(await response.json());
  }
});

export const tools = [yachtLegalQueryTool, yachtLegalSearchTool];
```

## Intégration Claude Desktop

### Configuration claude_desktop_config.json

```json
{
  "mcpServers": {
    "yacht-legal-ai": {
      "command": "node",
      "args": ["/path/to/yacht-legal-mcp-server.js"],
      "env": {
        "YACHT_LEGAL_API_KEY": "sk_live_xxx",
        "YACHT_LEGAL_API_URL": "https://yachtia.vercel.app/api/agents"
      }
    }
  }
}
```

### Utilisation dans Claude

Une fois configuré, vous pouvez demander à Claude:

> "Utilise yacht_legal_query pour me donner les obligations AML pour un broker yacht en France"

Claude utilisera automatiquement le tool et vous retournera la réponse enrichie.

## Cas d'usage

### 1. Agent de conformité MYBA

```python
# Vérifier un contrat contre les standards MYBA
result = yacht_legal_query(
    "Quelles clauses sont obligatoires dans un MYBA Charter Agreement 2017?",
    category="MYBA"
)
```

### 2. Agent AML/KYC

```python
# Obtenir les exigences de conformité
result = yacht_legal_query(
    "Quelles sont les obligations de déclaration TRACFIN pour une transaction yacht > 50k EUR?",
    category="AML_KYC"
)
```

### 3. Agent droits équipage

```python
# Rechercher les droits selon MLC 2006
result = yacht_legal_query(
    "Quels sont les droits de congé minimum pour l'équipage selon MLC 2006?",
    category="MLC_2006"
)
```

### 4. Agent analyse de contrat

```python
# Analyser un document uploadé
import requests

files = {'file': open('contract.pdf', 'rb')}
data = {'prompt': 'Identifie les clauses non-conformes au standard MYBA'}

response = requests.post(
    f"{API_URL}/analyze-document",
    headers={"Authorization": f"Bearer {API_KEY}"},
    files=files,
    data=data
)
print(response.json()['analysis'])
```

## Gestion des erreurs

```python
def safe_query(query: str, category: str = None) -> dict:
    try:
        response = requests.post(
            f"{API_URL}/query",
            headers={"Authorization": f"Bearer {API_KEY}"},
            json={"query": query, "category": category},
            timeout=30
        )

        if response.status_code == 429:
            # Rate limit - attendre et réessayer
            time.sleep(60)
            return safe_query(query, category)

        if response.status_code == 401:
            raise Exception("Invalid API key")

        if response.status_code == 403:
            raise Exception("Endpoint not allowed for this key")

        response.raise_for_status()
        return response.json()

    except requests.exceptions.Timeout:
        return {"error": "Request timeout", "answer": None}
    except requests.exceptions.RequestException as e:
        return {"error": str(e), "answer": None}
```

## Quotas et limites

| Métrique | Valeur par défaut |
|----------|-------------------|
| Requêtes/jour | 1000 |
| Taille query max | 2000 caractères |
| PDF max | 10 MB |
| Chunks retournés | 1-50 |
| Timeout | 30 secondes |

## Bonnes pratiques

1. **Cachez les résultats** - Pour les questions fréquentes
2. **Utilisez les catégories** - Améliore la pertinence
3. **Gérez les timeouts** - L'API peut prendre jusqu'à 30s
4. **Loggez les erreurs** - Facilitez le debug
5. **Respectez les quotas** - Implémentez le backoff

## Support

- Documentation API: [API_DOCS.md](./API_DOCS.md)
- Issues: GitHub repository
- Contact: admin@yachtia.app
