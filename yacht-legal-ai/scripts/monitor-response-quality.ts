/**
 * T27 - Monitoring Qualité Réponses
 * Script de validation automatique avec alertes si qualité < seuil
 */

import assert from 'node:assert/strict'

// Types
interface QualityMetrics {
  citationCount: number
  uniqueSources: number
  hasPageNumbers: boolean
  hasCodePriority: boolean
  hasFewShot: boolean
  hasDisclaimer: boolean
  vagueFormulations: number
  webCitations: number
  score: number
}

interface QualityAlert {
  level: 'WARNING' | 'CRITICAL'
  metric: string
  expected: string
  actual: string
  recommendation: string
}

interface MonitoringResult {
  timestamp: string
  response: string
  metrics: QualityMetrics
  alerts: QualityAlert[]
  qualityLevel: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL'
}

interface MonitoringConfig {
  minCitations: number
  minScore: number
  maxVagueFormulations: number
  requirePageNumbers: boolean
  requireCodePriority: boolean
  requireDisclaimer: boolean
}

// Configuration par défaut
const DEFAULT_CONFIG: MonitoringConfig = {
  minCitations: 3,
  minScore: 25,
  maxVagueFormulations: 0,
  requirePageNumbers: true,
  requireCodePriority: true,
  requireDisclaimer: true
}

// Patterns de détection
const CITATION_PATTERN = /\[Source:\s*([^,\]]+)(?:,\s*page\s*(\d+))?(?:,\s*section\s*([^\]]+))?\]/gi
const WEB_PATTERN = /\[Web:[^\]]+\]/gi
const VAGUE_PATTERNS = [
  /généralement/i,
  /typiquement/i,
  /dans\s+la\s+plupart\s+des\s+cas/i,
  /il\s+est\s+recommandé\s+de/i,
  /selon\s+les\s+documents/i,
  /d'après\s+les\s+sources/i
]
const CODE_PRIORITY = ['LY3', 'REG', 'CYC', 'MLC', 'SOLAS', 'MARPOL', 'COLREG', 'STCW']
const DISCLAIMER_PATTERN = /disclaimer|avis\s+juridique|avocat\s+maritime/i

// Analyse des métriques
function analyzeQualityMetrics(response: string): QualityMetrics {
  // Extraction citations
  const citations: Array<{ source: string; hasPage: boolean }> = []
  let match: RegExpExecArray | null
  const regex = new RegExp(CITATION_PATTERN.source, 'gi')
  while ((match = regex.exec(response)) !== null) {
    citations.push({
      source: match[1]?.trim() || '',
      hasPage: !!match[2]
    })
  }

  const uniqueSources = [...new Set(citations.map(c => c.source))]
  const citationCount = uniqueSources.length
  const hasPageNumbers = citations.length > 0 && citations.every(c => c.hasPage)

  // Vérification codes prioritaires
  const hasCodePriority = CODE_PRIORITY.some(code =>
    uniqueSources.some(s => s.toUpperCase().includes(code))
  )

  // Comptage formulations vagues
  let vagueFormulations = 0
  for (const pattern of VAGUE_PATTERNS) {
    const matches = response.match(pattern)
    if (matches) vagueFormulations += matches.length
  }

  // Citations web
  const webCitations = (response.match(WEB_PATTERN) || []).length

  // Disclaimer
  const hasDisclaimer = DISCLAIMER_PATTERN.test(response)

  // Few-shot pattern (structure typique)
  const hasFewShot = response.includes('**') && citationCount >= 3

  // Calcul score
  let score = 0
  score += citationCount * 5
  score += hasPageNumbers ? 10 : 0
  score += hasCodePriority ? 10 : 0
  score += hasDisclaimer ? 5 : 0
  score -= vagueFormulations * 5
  score -= webCitations * 10

  return {
    citationCount,
    uniqueSources: uniqueSources.length,
    hasPageNumbers,
    hasCodePriority,
    hasFewShot,
    hasDisclaimer,
    vagueFormulations,
    webCitations,
    score: Math.max(0, score)
  }
}

// Génération des alertes
function generateAlerts(metrics: QualityMetrics, config: MonitoringConfig): QualityAlert[] {
  const alerts: QualityAlert[] = []

  // Alerte citations
  if (metrics.citationCount < config.minCitations) {
    alerts.push({
      level: metrics.citationCount === 0 ? 'CRITICAL' : 'WARNING',
      metric: 'citationCount',
      expected: `>= ${config.minCitations}`,
      actual: String(metrics.citationCount),
      recommendation: 'Augmenter le nombre de sources citées dans le prompt'
    })
  }

  // Alerte score
  if (metrics.score < config.minScore) {
    alerts.push({
      level: metrics.score < config.minScore / 2 ? 'CRITICAL' : 'WARNING',
      metric: 'score',
      expected: `>= ${config.minScore}`,
      actual: String(metrics.score),
      recommendation: 'Améliorer la qualité globale des citations (pages, sections, codes)'
    })
  }

  // Alerte formulations vagues
  if (metrics.vagueFormulations > config.maxVagueFormulations) {
    alerts.push({
      level: 'WARNING',
      metric: 'vagueFormulations',
      expected: `<= ${config.maxVagueFormulations}`,
      actual: String(metrics.vagueFormulations),
      recommendation: 'Supprimer les formulations vagues ("généralement", "typiquement")'
    })
  }

  // Alerte numéros de page
  if (config.requirePageNumbers && !metrics.hasPageNumbers) {
    alerts.push({
      level: 'WARNING',
      metric: 'hasPageNumbers',
      expected: 'true',
      actual: 'false',
      recommendation: 'Ajouter les numéros de page à chaque citation'
    })
  }

  // Alerte codes prioritaires
  if (config.requireCodePriority && !metrics.hasCodePriority) {
    alerts.push({
      level: 'WARNING',
      metric: 'hasCodePriority',
      expected: 'true',
      actual: 'false',
      recommendation: `Prioriser les codes officiels (${CODE_PRIORITY.slice(0, 4).join(', ')})`
    })
  }

  // Alerte citations web
  if (metrics.webCitations > 0) {
    alerts.push({
      level: 'CRITICAL',
      metric: 'webCitations',
      expected: '0',
      actual: String(metrics.webCitations),
      recommendation: 'Supprimer toute référence web - utiliser uniquement la base documentaire'
    })
  }

  // Alerte disclaimer
  if (config.requireDisclaimer && !metrics.hasDisclaimer) {
    alerts.push({
      level: 'WARNING',
      metric: 'hasDisclaimer',
      expected: 'true',
      actual: 'false',
      recommendation: 'Ajouter le disclaimer juridique en fin de réponse'
    })
  }

  return alerts
}

// Détermination niveau qualité
function determineQualityLevel(alerts: QualityAlert[]): 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL' {
  const criticalCount = alerts.filter(a => a.level === 'CRITICAL').length
  const warningCount = alerts.filter(a => a.level === 'WARNING').length

  if (criticalCount > 0) return 'CRITICAL'
  if (warningCount >= 3) return 'WARNING'
  if (warningCount > 0) return 'GOOD'
  return 'EXCELLENT'
}

// Fonction principale de monitoring
function monitorResponse(response: string, config: MonitoringConfig = DEFAULT_CONFIG): MonitoringResult {
  const metrics = analyzeQualityMetrics(response)
  const alerts = generateAlerts(metrics, config)
  const qualityLevel = determineQualityLevel(alerts)

  return {
    timestamp: new Date().toISOString(),
    response: response.substring(0, 200) + '...',
    metrics,
    alerts,
    qualityLevel
  }
}

// Affichage formaté
function displayResult(result: MonitoringResult): void {
  const levelColors: Record<string, string> = {
    EXCELLENT: '\x1b[32m', // Vert
    GOOD: '\x1b[36m',      // Cyan
    WARNING: '\x1b[33m',   // Jaune
    CRITICAL: '\x1b[31m'   // Rouge
  }
  const reset = '\x1b[0m'

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  MONITORING QUALITÉ RÉPONSE')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  Timestamp: ${result.timestamp}`)
  console.log(`  Qualité: ${levelColors[result.qualityLevel]}${result.qualityLevel}${reset}`)
  console.log('─────────────────────────────────────────────────────────')
  console.log('  MÉTRIQUES:')
  console.log(`    Citations: ${result.metrics.citationCount}`)
  console.log(`    Sources uniques: ${result.metrics.uniqueSources}`)
  console.log(`    Pages indiquées: ${result.metrics.hasPageNumbers ? '✓' : '✗'}`)
  console.log(`    Code prioritaire: ${result.metrics.hasCodePriority ? '✓' : '✗'}`)
  console.log(`    Disclaimer: ${result.metrics.hasDisclaimer ? '✓' : '✗'}`)
  console.log(`    Formulations vagues: ${result.metrics.vagueFormulations}`)
  console.log(`    Citations web: ${result.metrics.webCitations}`)
  console.log(`    Score: ${result.metrics.score}`)

  if (result.alerts.length > 0) {
    console.log('─────────────────────────────────────────────────────────')
    console.log('  ALERTES:')
    for (const alert of result.alerts) {
      const color = alert.level === 'CRITICAL' ? '\x1b[31m' : '\x1b[33m'
      console.log(`    ${color}[${alert.level}]${reset} ${alert.metric}`)
      console.log(`      Expected: ${alert.expected}, Got: ${alert.actual}`)
      console.log(`      → ${alert.recommendation}`)
    }
  }

  console.log('═══════════════════════════════════════════════════════════\n')
}

// Tests avec réponses simulées
const TEST_RESPONSES = [
  {
    name: 'Réponse excellente',
    response: `
Pour l'immatriculation d'un yacht commercial de 45m à Malta:

**Éligibilité propriétaire:**
[Source: Malta OGSR Part III, page 15, section 12.2] Les sociétés maltaises ou UE peuvent immatriculer.
[Source: Malta Merchant Shipping Act 1973, page 23, section 34] Lien substantiel requis.

**Documents requis:**
[Source: Malta CYC 2020, page 12, section 3.1] Certificate of Incorporation obligatoire.
[Source: Malta Registration Process, page 6, section 4.1] Bill of Sale ou Builder's Certificate.

**Inspections:**
[Source: LY3 Large Yacht Code, page 8, section 2.4] Inspection initiale obligatoire.
[Source: MLC 2006, page 44, section A2.3] Certificat MLC si applicable.

⚖️ **Disclaimer**: Consultez un avocat maritime qualifié.
    `
  },
  {
    name: 'Réponse insuffisante',
    response: `
Généralement, pour immatriculer un yacht à Malta, il faut:
- Des documents d'identité
- Un certificat de propriété
Typiquement, la procédure prend quelques semaines.

[Web: Malta Transport - https://transport.gov.mt]
    `
  },
  {
    name: 'Réponse moyenne',
    response: `
Pour l'immatriculation Malta:

[Source: Malta CYC 2020, page 12] Documents requis pour yachts commerciaux.
[Source: Malta OGSR, page 15] Critères éligibilité.
[Source: Malta Registration Process] Procédure standard.

La procédure implique plusieurs étapes administratives.
    `
  }
]

// Exécution
async function runMonitoring(): Promise<void> {
  console.log('\n')
  console.log('╔═══════════════════════════════════════════════════════════╗')
  console.log('║     T27 - MONITORING QUALITÉ RÉPONSES RAG V3              ║')
  console.log('╚═══════════════════════════════════════════════════════════╝')

  for (const test of TEST_RESPONSES) {
    console.log(`\n📋 Test: "${test.name}"`)
    const result = monitorResponse(test.response)
    displayResult(result)
  }

  // Résumé
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  RÉSUMÉ MONITORING')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Seuils configurés:')
  console.log(`    - Min citations: ${DEFAULT_CONFIG.minCitations}`)
  console.log(`    - Min score: ${DEFAULT_CONFIG.minScore}`)
  console.log(`    - Max formulations vagues: ${DEFAULT_CONFIG.maxVagueFormulations}`)
  console.log('  Codes prioritaires:', CODE_PRIORITY.slice(0, 5).join(', '))
  console.log('═══════════════════════════════════════════════════════════\n')
}

// Export pour intégration
export {
  monitorResponse,
  analyzeQualityMetrics,
  generateAlerts,
  DEFAULT_CONFIG
}
export type { MonitoringResult, MonitoringConfig, QualityMetrics, QualityAlert }

// Exécution si appelé directement
runMonitoring().catch(error => {
  console.error('❌ Monitoring failed:', error)
  process.exit(1)
})
