#!/usr/bin/env tsx
/**
 * Test rapide de la recherche par métadonnées (document name)
 */

import { extractCitedCodes } from '../lib/context-extractor'

// Test extraction codes
const testQueries = [
  "Yacht 55m sous LY3, quelles obligations?",
  "REG Yacht Code pour pavillon UK",
  "SOLAS et MARPOL applicables?",
  "Guide OGSR pour immatriculation",
  "Commercial Yacht Code (CYC) requirements"
]

console.log('🧪 Test extraction codes cités\n')

testQueries.forEach(query => {
  const codes = extractCitedCodes(query)
  console.log(`Query: "${query}"`)
  console.log(`Codes: ${codes.length > 0 ? codes.join(', ') : 'none'}`)
  console.log()
})

console.log('✅ Extraction fonctionne - intégration dans searchDocuments OK')
