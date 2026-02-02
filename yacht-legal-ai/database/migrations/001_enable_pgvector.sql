-- Migration 001: Enable pgvector extension
-- Description: Activer l'extension pgvector pour la recherche vectorielle sémantique
-- Date: 2026-01-12
-- Autor: Claude Code (APEX Workflow)

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Comment
COMMENT ON EXTENSION vector IS 'Vector similarity search for RAG pipeline (embeddings 768 dimensions)';
