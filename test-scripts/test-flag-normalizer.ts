#!/usr/bin/env tsx
/**
 * Test suite for T-051: Flag Normalizer
 */

import {
  normalizeFlag,
  extractFlagFromQuery,
  extractFlagFromDocument,
  flagsMatch,
  getFlagCategories,
  getFlagVariants
} from '../lib/flag-normalizer'

console.log('🧪 TEST T-051: Flag Normalizer\n')

let passed = 0
let failed = 0

function test(name: string, condition: boolean) {
  if (condition) {
    console.log(`✅ ${name}`)
    passed++
  } else {
    console.log(`❌ ${name}`)
    failed++
  }
}

// Test 1: normalizeFlag avec variantes simples
test(
  "normalizeFlag('malta') === 'Malta'",
  normalizeFlag('malta') === 'Malta'
)

test(
  "normalizeFlag('MALTA') === 'Malta'",
  normalizeFlag('MALTA') === 'Malta'
)

test(
  "normalizeFlag('maltese') === 'Malta'",
  normalizeFlag('maltese') === 'Malta'
)

// Test 2: normalizeFlag avec PAVILLON_XXX
test(
  "normalizeFlag('PAVILLON_MALTA') === 'Malta'",
  normalizeFlag('PAVILLON_MALTA') === 'Malta'
)

test(
  "normalizeFlag('PAVILLON_CAYMAN_REG') === 'Cayman'",
  normalizeFlag('PAVILLON_CAYMAN_REG') === 'Cayman'
)

test(
  "normalizeFlag('PAVILLON_RMI') === 'Marshall'",
  normalizeFlag('PAVILLON_RMI') === 'Marshall'
)

// Test 3: normalizeFlag avec noms complets
test(
  "normalizeFlag('Marshall Islands') === 'Marshall'",
  normalizeFlag('Marshall Islands') === 'Marshall'
)

test(
  "normalizeFlag('Cayman Islands') === 'Cayman'",
  normalizeFlag('Cayman Islands') === 'Cayman'
)

test(
  "normalizeFlag('Isle of Man') === 'Isle of Man'",
  normalizeFlag('Isle of Man') === 'Isle of Man'
)

// Test 4: extractFlagFromQuery
test(
  "extractFlagFromQuery('Malta registration') === 'Malta'",
  extractFlagFromQuery('Malta registration') === 'Malta'
)

test(
  "extractFlagFromQuery('Cayman yacht eligibility') === 'Cayman'",
  extractFlagFromQuery('Cayman yacht eligibility') === 'Cayman'
)

test(
  "extractFlagFromQuery('Marshall Islands RMI') === 'Marshall'",
  extractFlagFromQuery('Marshall Islands RMI') === 'Marshall'
)

// Test 5: extractFlagFromDocument
test(
  "extractFlagFromDocument('OGSR Malta', 'PAVILLON_MALTA') === 'Malta'",
  extractFlagFromDocument('OGSR Malta', 'PAVILLON_MALTA') === 'Malta'
)

test(
  "extractFlagFromDocument('Cayman Guide', 'PAVILLON_CAYMAN_REG') === 'Cayman'",
  extractFlagFromDocument('Cayman Guide', 'PAVILLON_CAYMAN_REG') === 'Cayman'
)

test(
  "extractFlagFromDocument(undefined, 'PAVILLON_FRANCE') === 'France'",
  extractFlagFromDocument(undefined, 'PAVILLON_FRANCE') === 'France'
)

test(
  "extractFlagFromDocument('Monaco Regulations', undefined) === 'Monaco'",
  extractFlagFromDocument('Monaco Regulations', undefined) === 'Monaco'
)

// Test 6: flagsMatch
test(
  "flagsMatch('Malta', 'malta') === true",
  flagsMatch('Malta', 'malta') === true
)

test(
  "flagsMatch('PAVILLON_MALTA', 'Malta') === true",
  flagsMatch('PAVILLON_MALTA', 'Malta') === true
)

test(
  "flagsMatch('malta', 'PAVILLON_MALTE') === true",
  flagsMatch('malta', 'PAVILLON_MALTE') === true
)

test(
  "flagsMatch('Malta', 'Monaco') === false",
  flagsMatch('Malta', 'Monaco') === false
)

test(
  "flagsMatch('Cayman', 'PAVILLON_CAYMAN_REG') === true",
  flagsMatch('Cayman', 'PAVILLON_CAYMAN_REG') === true
)

// Test 7: getFlagCategories
const maltaCategories = getFlagCategories('Malta')
test(
  "getFlagCategories('Malta') inclut 'PAVILLON_MALTA'",
  maltaCategories.includes('PAVILLON_MALTA')
)

test(
  "getFlagCategories('Malta') inclut 'PAVILLON_MALTE'",
  maltaCategories.includes('PAVILLON_MALTE')
)

const caymanCategories = getFlagCategories('Cayman')
test(
  "getFlagCategories('Cayman') inclut 'PAVILLON_CAYMAN'",
  caymanCategories.includes('PAVILLON_CAYMAN')
)

test(
  "getFlagCategories('Cayman') inclut 'PAVILLON_CAYMAN_REG'",
  caymanCategories.includes('PAVILLON_CAYMAN_REG')
)

// Test 8: getFlagVariants
const maltaVariants = getFlagVariants('Malta')
test(
  "getFlagVariants('Malta').length >= 4",
  maltaVariants.length >= 4
)

test(
  "getFlagVariants('Malta') inclut 'malta'",
  maltaVariants.includes('malta')
)

test(
  "getFlagVariants('Malta') inclut 'PAVILLON_MALTA'",
  maltaVariants.includes('PAVILLON_MALTA')
)

// Test 9: Cas limites
test(
  "normalizeFlag(null) === null",
  normalizeFlag(null) === null
)

test(
  "normalizeFlag(undefined) === null",
  normalizeFlag(undefined) === null
)

test(
  "normalizeFlag('') === null",
  normalizeFlag('') === null
)

test(
  "normalizeFlag('invalid_flag') === null",
  normalizeFlag('invalid_flag') === null
)

test(
  "flagsMatch(null, 'Malta') === false",
  flagsMatch(null, 'Malta') === false
)

test(
  "flagsMatch('Malta', null) === false",
  flagsMatch('Malta', null) === false
)

// Résumé
console.log(`\n════════════════════════════════`)
console.log(`✅ PASSED: ${passed}`)
console.log(`❌ FAILED: ${failed}`)
console.log(`📊 TOTAL: ${passed + failed}`)

if (failed === 0) {
  console.log(`\n🎉 T-051 VALIDATION: TOUS LES TESTS PASSENT`)
  process.exit(0)
} else {
  console.log(`\n💥 T-051 VALIDATION: ${failed} TESTS EN ÉCHEC`)
  process.exit(1)
}
