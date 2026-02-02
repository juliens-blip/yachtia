import assert from 'node:assert/strict'
import { filterByDocType, filterByFlag } from '../lib/doc-filter'

const chunks = [
  { score: 0.65, documentName: 'LY3 Large Yacht Code', category: 'CODE' },
  { score: 0.75, documentName: 'Malta Yacht Code', category: 'CODE' },
  { score: 0.79, documentName: 'Industry article - inspections', category: 'ARTICLE' },
  { score: 0.9, documentName: 'Cayman Islands Guide', category: 'GUIDE' }
]

const docTypeResult = filterByDocType(chunks, 'STRICT')
assert.equal(docTypeResult.filtered.length, 2)
assert.equal(docTypeResult.eliminated.length, 2)

const strictFlag = filterByFlag(docTypeResult.filtered, 'Malta', 'STRICT')
assert.ok(strictFlag.filtered.every(c => (c.documentName || '').toLowerCase().includes('malta')))

const balancedFlag = filterByFlag(docTypeResult.filtered, 'Malta', 'BALANCED')
const downranked = balancedFlag.downranked[0]
assert.ok(downranked)
assert.ok(downranked.chunk.score < 0.75)

console.log('✅ test-doc-filter-v3 OK')
