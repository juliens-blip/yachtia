-- Migration 010: Add columns for ingestion script compatibility
-- Description: Ajoute les colonnes pages et file_url pour le script d'ingestion
-- Date: 2026-01-15

-- Add pages column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'pages'
  ) THEN
    ALTER TABLE documents ADD COLUMN pages INTEGER;
    COMMENT ON COLUMN documents.pages IS 'Number of pages in PDF document';
  END IF;
END $$;

-- Add file_url column if not exists (for web sources)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE documents ADD COLUMN file_url VARCHAR(1000);
    COMMENT ON COLUMN documents.file_url IS 'Original URL of the document (PDF or web page)';
  END IF;
END $$;

-- Make file_path nullable (not needed for web-scraped documents)
ALTER TABLE documents ALTER COLUMN file_path DROP NOT NULL;

-- Add default value for is_public (needed for ingestion)
ALTER TABLE documents ALTER COLUMN is_public SET DEFAULT TRUE;

-- Add embedding column to document_chunks if using different name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_chunks' AND column_name = 'embedding'
  ) THEN
    -- Create alias view or add column
    ALTER TABLE document_chunks ADD COLUMN embedding vector(768);

    -- Copy existing data if chunk_vector exists
    UPDATE document_chunks SET embedding = chunk_vector WHERE embedding IS NULL AND chunk_vector IS NOT NULL;
  END IF;
END $$;

-- Create trigger to sync embedding <-> chunk_vector
CREATE OR REPLACE FUNCTION sync_embedding_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- If embedding is set but chunk_vector is not, copy to chunk_vector
  IF NEW.embedding IS NOT NULL AND NEW.chunk_vector IS NULL THEN
    NEW.chunk_vector := NEW.embedding;
  END IF;
  -- If chunk_vector is set but embedding is not, copy to embedding
  IF NEW.chunk_vector IS NOT NULL AND NEW.embedding IS NULL THEN
    NEW.embedding := NEW.chunk_vector;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_embeddings ON document_chunks;
CREATE TRIGGER sync_embeddings
  BEFORE INSERT OR UPDATE ON document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION sync_embedding_columns();

-- Index on file_url for duplicate detection
CREATE INDEX IF NOT EXISTS idx_documents_file_url ON documents(file_url);
