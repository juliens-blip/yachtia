-- Migration 014: Add new flag categories
-- Description: Ajoute les nouvelles catégories de pavillons et droit maritime
-- Date: 2026-01-15

-- Add new categories to documents table check constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check;

ALTER TABLE documents ADD CONSTRAINT documents_category_check 
CHECK (category IN (
  -- Existing categories
  'MYBA',
  'YET',
  'AML_KYC',
  'MLC_2006',
  'MANNING_STCW',
  'PAVILLONS',
  'DROIT_SOCIAL',
  'IA_RGPD',
  'DROIT_MER_INTERNATIONAL',
  'PAVILLON_MARSHALL',
  'PAVILLON_MALTA',
  'PAVILLON_CAYMAN_REG',
  'GUIDES_PAVILLONS',
  -- New categories (2026-01-15)
  'PAVILLON_FRANCE',
  'PAVILLON_BVI',
  'PAVILLON_IOM',
  'PAVILLON_MADERE'
));

COMMENT ON CONSTRAINT documents_category_check ON documents IS 
'Valid document categories including flag registries (France, Malta, Cayman, Marshall, BVI, IoM, Madère) and international maritime law';
