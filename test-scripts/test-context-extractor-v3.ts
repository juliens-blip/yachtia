import assert from 'node:assert/strict'
import { extractYachtSize, extractYachtAge, buildContextPrompt } from '../lib/context-extractor'

const sizeMeters = extractYachtSize('Yacht de 50 m pour charter')
assert.equal(sizeMeters, 50)

const sizeFromFeet = extractYachtSize('Yacht 164 ft commercial')
assert.equal(sizeFromFeet, 50)

const ageResult = extractYachtAge('Vessel built in 2000 for charter')
assert.equal(ageResult.buildYear, 2000)
assert.equal(ageResult.age, 26)

const prompt = buildContextPrompt({
  size: 55,
  age: 21,
  buildYear: 2005,
  flag: 'Malta',
  tags: ['Large Yacht', 'SOLAS/MLC applicable', 'Enhanced inspections']
})

assert.ok(prompt.includes('SOLAS/MLC'))
assert.ok(prompt.includes('inspections supplémentaires'))
assert.ok(prompt.includes('Malta'))

console.log('✅ test-context-extractor-v3 OK')
