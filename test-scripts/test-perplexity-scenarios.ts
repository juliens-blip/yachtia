/**
 * T033: Tests des 2 scénarios réels identifiés par Perplexity
 * Vérifie que le pipeline RAG V3 gère correctement les cas problématiques.
 */

import { extractYachtContext, buildContextPrompt, extractCitedCodes } from '../lib/context-extractor'
import { scoreDocument } from '../lib/document-scorer'
import { scoreByContext } from '../lib/context-aware-scorer'
import { filterByDocType, filterByFlag } from '../lib/doc-filter'
import { isComplexQuery } from '../lib/multi-pass-retrieval'

let passed = 0
let failed = 0

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.log(`  ❌ ${label}`)
    failed++
  }
}

console.log('🧪 Tests Scénarios Perplexity')
console.log('============================================================\n')

// ═══════════════════════════════════════════════════════════════
// SCENARIO 1: Malta 45m construit 2000
// ═══════════════════════════════════════════════════════════════
console.log('📋 SCÉNARIO 1: Malta 45m construit 2000')
console.log('Query: "Immatriculation Malta yacht commercial 45m construit en 2000"')
console.log('')

const query1 = 'Immatriculation Malta yacht commercial 45m construit en 2000, conditions éligibilité, inspections âge'

// 1a. Context extraction basique
const ctx1 = extractYachtContext(query1)
assert(ctx1.size === 45, `extractYachtContext size=45 (got ${ctx1.size})`)
assert(ctx1.buildYear === 2000, `extractYachtContext buildYear=2000 (got ${ctx1.buildYear})`)
assert(ctx1.age === 26, `extractYachtContext age=26 (got ${ctx1.age})`)
assert(ctx1.flag === 'Malta', `extractYachtContext flag=Malta (got ${ctx1.flag})`)

// 1b. Context extraction enhanced
const ctx1e = extractYachtContext(query1)
assert(ctx1e.size === 45, `enhanced size=45 (got ${ctx1e.size})`)
assert(ctx1e.flag === 'Malta', `enhanced flag=Malta (got ${ctx1e.flag})`)
assert(ctx1e.tags.includes('Large Yacht'), `tagged 'Large Yacht' (tags: ${ctx1e.tags.join(', ')})`)
assert(ctx1e.tags.includes('Enhanced inspections'), `tagged 'Enhanced inspections' (tags: ${ctx1e.tags.join(', ')})`)
assert(ctx1e.tags.includes('Age-related'), `tagged 'Age-related' for >25 ans (tags: ${ctx1e.tags.join(', ')})`)

// 1c. Context prompt enrichi
const prompt1 = buildContextPrompt(ctx1)
assert(prompt1.includes('45m'), `prompt mentionne 45m`)
assert(prompt1.includes('inspections'), `prompt mentionne inspections`)
assert(prompt1.includes('Malta'), `prompt mentionne Malta`)

// 1d. Document scorer - Malta docs vs non-Malta
const scoreMaltaOGSR = scoreDocument('Malta OGSR Part III', 'PAVILLON_MALTA', query1)
const scoreMaltaMSA = scoreDocument('Malta Merchant Shipping Act', 'PAVILLON_MALTA', query1)
const scoreMonaco = scoreDocument('Monaco Yacht Registration', 'PAVILLON_MONACO', query1)
const scoreBlog = scoreDocument('OB Magazine Flag Guide', 'ARTICLE', query1)

assert(scoreMaltaOGSR > scoreMonaco, `Malta OGSR (${scoreMaltaOGSR.toFixed(2)}) > Monaco (${scoreMonaco.toFixed(2)})`)
assert(scoreMaltaMSA > scoreBlog, `Malta MSA (${scoreMaltaMSA.toFixed(2)}) > Blog (${scoreBlog.toFixed(2)})`)
assert(scoreBlog < 1, `Blog article downranked (${scoreBlog.toFixed(2)} < 1)`)

// 1e. Context-aware scorer
const ctxScoreMaltaInspection = scoreByContext(ctx1e, 'Malta Survey Requirements', 'PAVILLON_MALTA')
const ctxScoreMonacoVAT = scoreByContext(ctx1e, 'Monaco VAT Guide', 'PAVILLON_MONACO')
assert(ctxScoreMaltaInspection > ctxScoreMonacoVAT, `Context score Malta inspection (${ctxScoreMaltaInspection}) > Monaco VAT (${ctxScoreMonacoVAT})`)

// 1f. Doc filter - flag filtering
const maltaChunks = [
  { score: 0.85, documentName: 'Malta OGSR Part III', category: 'PAVILLON_MALTA' },
  { score: 0.82, documentName: 'Malta CYC 2020', category: 'PAVILLON_MALTA' },
  { score: 0.78, documentName: 'Monaco Yacht Registration', category: 'PAVILLON_MONACO' },
  { score: 0.75, documentName: 'Italy VAT Guide', category: 'PAVILLON_ITALY' },
]

const flagResult1 = filterByFlag(maltaChunks, 'Malta', 'STRICT')
assert(flagResult1.filtered.length === 2, `STRICT flag filter: 2 Malta docs kept (got ${flagResult1.filtered.length})`)
assert(flagResult1.eliminated.length === 2, `STRICT: 2 non-Malta eliminated (got ${flagResult1.eliminated.length})`)

console.log('')

// ═══════════════════════════════════════════════════════════════
// SCENARIO 2: Cayman 50m REG/LY3
// ═══════════════════════════════════════════════════════════════
console.log('📋 SCÉNARIO 2: Cayman 50m avec LY3 et REG Yacht Code')
console.log('Query: "Selon LY3 et le REG Yacht Code, obligations manning et sécurité pour yacht commercial 50m Cayman"')
console.log('')

const query2 = 'Selon LY3 et le REG Yacht Code, obligations manning et sécurité pour yacht commercial 50m Cayman'

// 2a. Cited codes extraction
const codes2 = extractCitedCodes(query2)
assert(codes2.includes('LY3'), `extractCitedCodes includes LY3 (got: ${codes2.join(', ')})`)
assert(codes2.includes('REG Yacht Code'), `extractCitedCodes includes REG Yacht Code (got: ${codes2.join(', ')})`)

// 2b. Context extraction
const ctx2 = extractYachtContext(query2)
assert(ctx2.size === 50, `size=50 (got ${ctx2.size})`)
assert(ctx2.flag === 'Cayman', `flag=Cayman (got ${ctx2.flag})`)

const ctx2e = extractYachtContext(query2)
assert(ctx2e.tags.includes('Large Yacht'), `tagged Large Yacht`)
assert(ctx2e.tags.includes('SOLAS/MLC applicable'), `tagged SOLAS/MLC for 50m (tags: ${ctx2e.tags.join(', ')})`)

// 2c. isComplexQuery - should trigger multi-pass (2 codes cited)
assert(isComplexQuery(query2), `isComplexQuery=true (2 codes cited)`)

// 2d. Document scorer - LY3/REG docs boosted
const scoreLY3 = scoreDocument('LY3 Large Yacht Code', 'CODE', query2)
const scoreREG = scoreDocument('REG Yacht Code', 'CODE', query2)
const scoreGenericBlog = scoreDocument('Flag of Convenience Guide', 'ARTICLE', query2)

assert(scoreLY3 >= 2, `LY3 doc score >= 2 (got ${scoreLY3.toFixed(2)})`)
assert(scoreREG >= 2, `REG doc score >= 2 (got ${scoreREG.toFixed(2)})`)
assert(scoreLY3 > scoreGenericBlog, `LY3 (${scoreLY3.toFixed(2)}) > generic blog (${scoreGenericBlog.toFixed(2)})`)

// 2e. Context prompt mentions codes
const prompt2 = buildContextPrompt(ctx2)
assert(prompt2.includes('LY3'), `prompt mentionne LY3`)
assert(prompt2.includes('REG Yacht Code'), `prompt mentionne REG Yacht Code`)
assert(prompt2.includes('SOLAS'), `prompt mentionne SOLAS pour 50m`)

// 2f. Doc-type filter - articles vs codes
const codeChunks = [
  { score: 0.9, documentName: 'LY3 Large Yacht Code', category: 'CODE' },
  { score: 0.85, documentName: 'REG Yacht Code Chapter 8', category: 'CODE' },
  { score: 0.6, documentName: 'OB Magazine Flags', category: 'ARTICLE' },
  { score: 0.55, documentName: 'Generic Blog Post', category: 'ARTICLE' },
]

const docTypeResult = filterByDocType(codeChunks, 'BALANCED')
const keptNames = docTypeResult.filtered.map(c => c.documentName)
assert(keptNames.includes('LY3 Large Yacht Code'), `CODE LY3 kept after doc-type filter`)
assert(keptNames.includes('REG Yacht Code Chapter 8'), `CODE REG kept after doc-type filter`)
// Articles with score < 0.8 should be eliminated
const eliminatedNames = docTypeResult.eliminated.map(e => e.chunk.documentName)
assert(eliminatedNames.includes('Generic Blog Post'), `ARTICLE blog eliminated (score 0.55 < 0.8)`)

console.log('')

// ═══════════════════════════════════════════════════════════════
// RESULTATS
// ═══════════════════════════════════════════════════════════════
console.log('============================================================')
console.log(`📊 RÉSULTATS: ${passed} passed, ${failed} failed / ${passed + failed} total`)
console.log('============================================================')

if (failed > 0) {
  console.log('\n❌ CERTAINS TESTS ONT ÉCHOUÉ')
  process.exit(1)
} else {
  console.log('\n🎉 TOUS LES TESTS PERPLEXITY PASSENT')
}
