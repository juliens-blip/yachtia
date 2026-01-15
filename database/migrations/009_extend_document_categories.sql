-- Migration 009: Extend document categories
-- Description: Ajoute les nouvelles categories pour droit maritime international et pavillons specifiques
-- Date: 2026-01-15

-- Drop the existing constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check;

-- Add new constraint with extended categories
ALTER TABLE documents ADD CONSTRAINT documents_category_check CHECK (category IN (
  -- Categories existantes
  'MYBA',           -- Contrats charter MYBA
  'AML',            -- Anti-Money Laundering / KYC
  'MLC',            -- Maritime Labour Convention 2006
  'PAVILION',       -- Pavillons (general)
  'INSURANCE',      -- Assurances maritimes
  'CREW',           -- Equipage (general)
  'REGISTRATION',   -- Immatriculation
  'ENVIRONMENTAL',  -- Reglementations environnementales
  'CORPORATE',      -- Droit des societes
  'CHARTER',        -- Contrats charter (general)

  -- Nouvelles categories - Droit international de la mer
  'DROIT_MER_INTERNATIONAL',  -- UNCLOS, COLREG, haute mer, Paris MoU

  -- Nouvelles categories - Pavillons specifiques
  'PAVILLON_MARSHALL',   -- Iles Marshall (RMI) - MI-103, MI-118
  'PAVILLON_MALTA',      -- Malte - Commercial Yacht Code (CYC)
  'PAVILLON_CAYMAN_REG', -- Cayman / Red Ensign Group - LY3, REG Yacht Code

  -- Nouvelles categories - Equipage / Manning
  'MANNING_STCW',        -- STCW, certificats, qualifications

  -- Nouvelles categories - Guides et syntheses
  'GUIDES_PAVILLONS',    -- Comparatifs registres, choix pavillon

  -- Categories systeme existantes
  'YET',            -- Yacht (fiscalite/TVA)
  'AML_KYC',        -- Anti-Money Laundering / KYC (alias)
  'MLC_2006',       -- MLC 2006 (alias)
  'PAVILLONS',      -- Pavillons (alias pluriel)
  'DROIT_SOCIAL',   -- Droit social maritime
  'IA_RGPD'         -- IA, RGPD, disclaimers
));

-- Update comment
COMMENT ON COLUMN documents.category IS 'Legal category for document classification. Extended in migration 009 to include international maritime law, specific flag states (Marshall, Malta, Cayman/REG), STCW/manning, and flag guides.';

-- Create index on new categories for faster filtering
CREATE INDEX IF NOT EXISTS idx_documents_category_extended ON documents(category)
WHERE category IN ('DROIT_MER_INTERNATIONAL', 'PAVILLON_MARSHALL', 'PAVILLON_MALTA', 'PAVILLON_CAYMAN_REG', 'MANNING_STCW', 'GUIDES_PAVILLONS');
