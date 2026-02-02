/**
 * Extraction légère codes cités (pour T016)
 * Version complète sera créée par CODEX dans T014
 */

export function extractCitedCodes(query: string): string[] {
  const codes: string[] = []
  
  const patterns = [
    { regex: /\bLY3\b/i, code: 'LY3 Large Yacht Code' },
    { regex: /\bREG\s+Yacht\s+Code\b/i, code: 'REG Yacht Code' },
    { regex: /\bCYC\b/i, code: 'Commercial Yacht Code (CYC)' },
    { regex: /\bMLC\b/i, code: 'Maritime Labour Convention (MLC)' },
    { regex: /\bSOLAS\b/i, code: 'SOLAS Convention' },
    { regex: /\bMARPOL\b/i, code: 'MARPOL Convention' },
    { regex: /\bOGSR\b/i, code: 'Official Gazette Ship Registry' },
    { regex: /\bCOLREG\b/i, code: 'COLREG Rules' }
  ]
  
  for (const { regex, code } of patterns) {
    if (regex.test(query)) codes.push(code)
  }
  
  return codes
}
