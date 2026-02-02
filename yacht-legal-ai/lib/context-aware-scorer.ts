/**
 * Context-aware scoring helper based on extracted yacht context.
 */

import type { YachtContext } from './context-extractor'

const LARGE_YACHT_PATTERNS = [
  'ly3',
  'reg',
  'solas',
  'mlc',
  'large yacht code'
]

const INSPECTION_PATTERNS = [
  'inspection',
  'survey',
  'audit',
  'condition',
  'class survey'
]

const AGE_RELATED_PATTERNS = [
  'waiver',
  'exemption',
  'age',
  'grandfather'
]

const MANNING_PATTERNS = [
  'mlc',
  'stcw',
  'manning',
  'safe manning',
  'crew',
  'seafarer'
]

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function textIncludesAny(text: string, patterns: string[]): boolean {
  return patterns.some(pattern => text.includes(pattern))
}

function isMaltaDocument(docName?: string, category?: string): boolean {
  const normalized = normalize(`${docName || ''} ${category || ''}`)
  if (normalized.includes('pavillon malta')) return true
  return normalized.includes('malta')
}

export function scoreByContext(
  yachtContext: YachtContext,
  docName: string,
  category: string
): number {
  let multiplier = 1
  const haystack = normalize(`${docName || ''} ${category || ''}`)

  if (yachtContext.tags.includes('Large Yacht') && textIncludesAny(haystack, LARGE_YACHT_PATTERNS)) {
    multiplier *= 2
  }

  if (yachtContext.tags.includes('Enhanced inspections') && textIncludesAny(haystack, INSPECTION_PATTERNS)) {
    multiplier *= 2
  }

  if (yachtContext.tags.includes('Age-related') && textIncludesAny(haystack, AGE_RELATED_PATTERNS)) {
    multiplier *= 2.5
  }

  if (yachtContext.flag && yachtContext.flag.toLowerCase() === 'malta' && isMaltaDocument(docName, category)) {
    multiplier *= 3
  }

  if (yachtContext.gt !== undefined && yachtContext.gt > 500 && textIncludesAny(haystack, MANNING_PATTERNS)) {
    multiplier *= 2
  }

  return multiplier
}
