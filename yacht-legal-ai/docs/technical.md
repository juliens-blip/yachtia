# Documentation Technique

## Architecture
- Next.js 14 (App Router)
- Supabase (Postgres + pgvector + Storage)
- Gemini 1.5 Flash (embeddings + generation)
- RAG via recherche vectorielle

## API Routes
- `POST /api/chat`
- `POST /api/upload-doc`
- `POST /api/search`
- `POST /api/document-url`
- `DELETE /api/delete-user-data`

## Supabase
- Migrations: `database/migrations/*.sql`
- Tables: `documents`, `document_chunks`, `conversations`, `audit_logs`
- Storage bucket: `documents` (privé, signed URLs)

## RAG
- Embeddings: `generateEmbedding()` (Gemini)
- Recherche: `search_documents` (pgvector)
- Pipeline: `lib/rag-pipeline.ts`

## Sécurité
- Service role réservé au serveur
- RLS activé (public read si `is_public = true`)
- Validation PDF + rate limiting minimal côté API

## Scripts
- Smoke test: `scripts/supabase_smoke_test.sh`
