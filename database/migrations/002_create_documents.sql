-- Migration 002: Create documents table
-- Description: Table pour stocker les métadonnées des documents PDF uploadés
-- Date: 2026-01-12

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'MYBA', 'AML', 'MLC', 'PAVILION', 'INSURANCE',
    'CREW', 'REGISTRATION', 'ENVIRONMENTAL', 'CORPORATE', 'CHARTER'
  )),
  source_url VARCHAR(500),
  file_path VARCHAR(500) NOT NULL,
  uploaded_by UUID,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  content_vector vector(768),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_is_public ON documents(is_public);

-- Comments
COMMENT ON TABLE documents IS 'Stores uploaded legal documents metadata';
COMMENT ON COLUMN documents.content_vector IS 'Full-document embedding (Gemini 768 dims)';
COMMENT ON COLUMN documents.category IS 'Legal category (MYBA, AML, MLC, PAVILION, INSURANCE, CREW, REGISTRATION, ENVIRONMENTAL, CORPORATE, CHARTER)';
COMMENT ON COLUMN documents.metadata IS 'Additional metadata (pages, language, author, etc.)';
COMMENT ON COLUMN documents.is_public IS 'Public visibility flag for RLS policies';
