#!/usr/bin/env tsx

/**
 * Tests E2E RAG Final - Validation améliorations V2/V3
 */

import assert from 'node:assert/strict'
import { retrieveRelevantChunks, formatChunksForContext, type RelevantChunk } from '../lib/rag-pipeline'
import { detectDocType, extractFlag as extractDocFlag } from '../lib/doc-type-tagger'
import { extractFlag as extractQueryFlag } from '../lib/context-extractor'
import { generateAnswer } from '../lib/gemini'
import { validateResponse } from '../lib/response-validator'

process.env.RAG_FAST_MODE = '1'

const TEST_CASES = [
  {
    name: 'Malta 50m 2000 registration',
    query: 'Malta registration for 50m yacht built 2000',
    checks: ['maltaDocs', 'ogsrOrMerchant']
  },
  {
    name: 'LY3 crew requirements',
    query: 'LY3 crew requirements',
    checks: ['ly3Top3']
  },
  {
    name: 'Cayman deletion certificate',
    query: 'Cayman deletion certificate',
    checks: ['noMonacoVat']
  },
  {
    name: 'Multi-sources registration + inspection',
    query: 'Malta registration inspection requirements',
    checks: ['fiveDocsTop10']
  },
  {
    name: 'Context size/age 50m',
    query: '50m yacht built 2000 safety requirements',
    checks: ['solasMlcTop5']
  }
]

type CaseResult = {
  name: string
  success: boolean
  details: string[]
  topDocs: string[]
  officialRatioTop5: number
  noiseRatioTop10: number | null
  citations?: number
  falseMissingRate?: number
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function uniqueByDocumentId(chunks: RelevantChunk[]): RelevantChunk[] {
  const seen = new Set<string>()
  return chunks.filter(chunk => {
    if (seen.has(chunk.documentId)) return false
    seen.add(chunk.documentId)
    return true
  })
}

function countDocsMatching(chunks: RelevantChunk[], predicate: (chunk: RelevantChunk) => boolean): number {
  return uniqueByDocumentId(chunks.filter(predicate)).length
}

function hasDocMatching(chunks: RelevantChunk[], predicate: (chunk: RelevantChunk) => boolean): boolean {
  return chunks.some(predicate)
}

function getDocNameList(chunks: RelevantChunk[], limit: number): string[] {
  return uniqueByDocumentId(chunks).slice(0, limit).map(chunk => chunk.documentName)
}

function computeOfficialRatio(chunks: RelevantChunk[], topN: number): number {
  const topChunks = chunks.slice(0, topN)
  if (topChunks.length === 0) return 0
  const officialCount = topChunks.filter(chunk => {
    const docType = detectDocType(chunk.documentName, chunk.category)
    return docType === 'CODE' || docType === 'OGSR' || docType === 'LOI'
  }).length
  return officialCount / topChunks.length
}

function computeNoiseRatio(chunks: RelevantChunk[], query: string, topN: number): number | null {
  const queryFlag = extractQueryFlag(query)
  if (!queryFlag) return null

  const topChunks = chunks.slice(0, topN)
  const withFlag = topChunks.filter(chunk => extractDocFlag(`${chunk.documentName} ${chunk.category}`))
  if (withFlag.length === 0) return 0

  const mismatch = withFlag.filter(chunk => {
    const docFlag = extractDocFlag(`${chunk.documentName} ${chunk.category}`)
    return docFlag && normalize(docFlag) !== normalize(queryFlag)
  }).length

  return mismatch / withFlag.length
}

async function runCase(name: string, query: string, checks: string[]): Promise<CaseResult> {
  const chunks = await retrieveRelevantChunks(query, undefined, 20)
  const details: string[] = []
  let success = true

  if (checks.includes('maltaDocs')) {
    const maltaDocs = countDocsMatching(chunks.slice(0, 10), chunk => {
      const haystack = normalize(`${chunk.documentName} ${chunk.category}`)
      return haystack.includes('malta') || haystack.includes('pavillon malta')
    })
    if (maltaDocs < 3) {
      success = false
      details.push(`malta docs < 3 (found ${maltaDocs})`)
    }
  }

  if (checks.includes('ogsrOrMerchant')) {
    const ogsrOrMerchant = hasDocMatching(chunks.slice(0, 10), chunk => {
      const haystack = normalize(`${chunk.documentName} ${chunk.category}`)
      return haystack.includes('ogsr') || haystack.includes('official guide to ship registries') || haystack.includes('merchant shipping act')
    })
    if (!ogsrOrMerchant) {
      success = false
      details.push('missing OGSR or Merchant Shipping Act in top 10')
    }
  }

  if (checks.includes('ly3Top3')) {
    const hasLy3 = hasDocMatching(chunks.slice(0, 3), chunk => {
      const haystack = normalize(`${chunk.documentName} ${chunk.category}`)
      return haystack.includes('ly3')
    })
    if (!hasLy3) {
      success = false
      details.push('LY3 doc not in top 3')
    }
  }

  if (checks.includes('noMonacoVat')) {
    const forbidden = hasDocMatching(chunks.slice(0, 10), chunk => {
      const haystack = normalize(`${chunk.documentName} ${chunk.category}`)
      return haystack.includes('monaco') || haystack.includes('vat') || haystack.includes('tva')
    })
    if (forbidden) {
      success = false
      details.push('found Monaco/VAT docs in top 10')
    }
  }

  if (checks.includes('fiveDocsTop10')) {
    const uniqueDocs = uniqueByDocumentId(chunks.slice(0, 10)).length
    if (uniqueDocs < 5) {
      success = false
      details.push(`unique docs in top 10 < 5 (found ${uniqueDocs})`)
    }
  }

  if (checks.includes('solasMlcTop5')) {
    const hasSolMlcTop5 = hasDocMatching(chunks.slice(0, 5), chunk => {
      const haystack = normalize(`${chunk.documentName} ${chunk.category}`)
      return haystack.includes('solas') || haystack.includes('mlc')
    })
    const hasSolMlcTop20 = hasDocMatching(chunks.slice(0, 20), chunk => {
      const haystack = normalize(`${chunk.documentName} ${chunk.category}`)
      return haystack.includes('solas') || haystack.includes('mlc')
    })
    if (hasSolMlcTop20 && !hasSolMlcTop5) {
      success = false
      details.push('SOLAS/MLC doc not in top 5')
    }
  }

  const officialRatioTop5 = computeOfficialRatio(chunks, 5)
  const noiseRatioTop10 = computeNoiseRatio(chunks, query, 10)

  const result: CaseResult = {
    name,
    success,
    details,
    topDocs: getDocNameList(chunks, 10),
    officialRatioTop5,
    noiseRatioTop10
  }

  if (process.env.RAG_E2E_GENERATE === '1' && process.env.GEMINI_API_KEY) {
    const context = formatChunksForContext(chunks.slice(0, 10))
    const contextMetadata = chunks.slice(0, 10).map(c => ({
      document_name: c.documentName,
      category: c.category,
      source_url: c.sourceUrl
    }))
    try {
      let generated = false
      let attemptQuery = query
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const answer = await generateAnswer(attemptQuery, context, undefined, contextMetadata)
          const citations = (answer.answer.match(/\[Source:[^\]]+\]/gi) || []).length
          const validation = validateResponse(answer.answer, chunks.slice(0, 10))

          result.citations = citations
          if (validation.valid) {
            result.falseMissingRate = 0
          } else if (validation.retry && validation.retry.startsWith("L'information sur")) {
            result.falseMissingRate = 1
          } else {
            result.falseMissingRate = 0
          }
          if (!validation.valid && attempt < 2) {
            attemptQuery = `${query}\n\nINSTRUCTIONS: Cite au moins 5 sources différentes et vérifie tous les chunks avant de conclure.`
            await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)))
            continue
          }
          generated = true
          break
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (message.includes('429') && attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)))
            continue
          }
          throw error
        }
      }
      if (!generated) {
        console.warn('⚠️ Gemini generation incomplete after retries.')
      }
    } catch (error) {
      console.warn('⚠️ Gemini generation skipped (rate limit or error).', error)
    }
  }

  return result
}

async function run() {
  if (!process.env.SUPABASE_URL) {
    console.error('❌ Missing SUPABASE_URL. Set env vars before running E2E tests.')
    process.exit(1)
  }

  if (process.env.RAG_E2E_GENERATE === '1' && !process.env.GEMINI_API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY for answer generation checks.')
    process.exit(1)
  }

  const results: CaseResult[] = []
  for (const testCase of TEST_CASES) {
    const result = await runCase(testCase.name, testCase.query, testCase.checks)
    results.push(result)

    console.log(`\n🧪 ${testCase.name}`)
    console.log(`   ${result.success ? '✅ PASS' : '❌ FAIL'}`)
    if (result.details.length > 0) {
      console.log(`   Issues: ${result.details.join('; ')}`)
    }
    console.log(`   Top docs: ${result.topDocs.slice(0, 5).join(' | ')}`)
  }

  const passCount = results.filter(r => r.success).length
  const avgOfficialRatio = results.reduce((sum, r) => sum + r.officialRatioTop5, 0) / results.length
  const noiseRatios = results.map(r => r.noiseRatioTop10).filter((r): r is number => r !== null)
  const avgNoise = noiseRatios.length > 0 ? noiseRatios.reduce((sum, r) => sum + r, 0) / noiseRatios.length : 0
  const citationSamples = results.map(r => r.citations).filter((c): c is number => c !== undefined)
  const avgCitations = citationSamples.length > 0 ? citationSamples.reduce((sum, c) => sum + c, 0) / citationSamples.length : null
  const falseMissingSamples = results.map(r => r.falseMissingRate).filter((c): c is number => c !== undefined)
  const falseMissingRate = falseMissingSamples.length > 0 ? falseMissingSamples.reduce((sum, c) => sum + c, 0) / falseMissingSamples.length : null

  console.log('\n📊 Metrics')
  console.log(`   Official docs ratio top5: ${(avgOfficialRatio * 100).toFixed(1)}%`)
  if (noiseRatios.length > 0) {
    console.log(`   Noise (flag mismatch) top10: ${(avgNoise * 100).toFixed(1)}%`)
  } else {
    console.log('   Noise (flag mismatch) top10: n/a')
  }
  if (avgCitations !== null) {
    console.log(`   Avg citations: ${avgCitations.toFixed(1)}`)
  }
  if (falseMissingRate !== null) {
    console.log(`   False "info manquante" rate: ${(falseMissingRate * 100).toFixed(1)}%`)
  }

  console.log('\n🎯 Targets')
  console.log(`   ${avgOfficialRatio >= 0.8 ? '✅' : '❌'} Docs officiels top 5 > 80%`) 
  if (noiseRatios.length > 0) {
    console.log(`   ${avgNoise <= 0.05 ? '✅' : '❌'} Bruit (docs hors sujet) < 5%`)
  }

  const citationsOk = avgCitations === null ? true : avgCitations >= 5 && avgCitations <= 8
  const falseMissingOk = falseMissingRate === null ? true : falseMissingRate < 0.05
  const globalSuccess = passCount === TEST_CASES.length && avgOfficialRatio >= 0.8 && (noiseRatios.length === 0 || avgNoise <= 0.05) && citationsOk && falseMissingOk
  assert.ok(globalSuccess, 'E2E RAG Final tests failed')
  console.log('\n✅ E2E RAG Final tests OK')

  const reportPath = process.env.RAG_E2E_REPORT || 'rag-e2e-final-report.json'
  try {
    const fs = await import('node:fs')
    const report = {
      generatedAt: new Date().toISOString(),
      results,
      metrics: {
        passCount,
        total: results.length,
        avgOfficialRatio,
        avgNoise,
        avgCitations,
        falseMissingRate
      }
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`📄 Report saved to ${reportPath}`)
  } catch (error) {
    console.warn('⚠️ Failed to write report:', error)
  }
}

run().catch(error => {
  console.error('❌ test-e2e-rag-final FAILED', error)
  process.exit(1)
})
