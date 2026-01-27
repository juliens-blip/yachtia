/**
 * Lightweight metrics logger for RAG responses.
 */

type RagMetric = {
  timestamp: string
  query: string
  latencyMs: number
  citations: number
  fallbackUsed: boolean
  docsUsed: number
}

const MAX_RECORDS = 200
const metricsStore: RagMetric[] = []

export function countCitations(response: string): number {
  const matches = response.match(/\[Source:[^\]]+\]/gi) || []
  return matches.length
}

export function recordRagMetric(metric: RagMetric): void {
  metricsStore.push(metric)
  if (metricsStore.length > MAX_RECORDS) {
    metricsStore.shift()
  }
  const metricsFile = process.env.RAG_METRICS_FILE
  if (metricsFile) {
    try {
      const payload = JSON.stringify(metric)
      // Dynamic import for Node.js fs module
      import('node:fs').then((fs) => {
        fs.appendFileSync(metricsFile, `${payload}\n`)
      }).catch((error) => {
        console.warn('RAG metrics file write failed:', error)
      })
    } catch (error) {
      console.warn('RAG metrics file write failed:', error)
    }
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))
  return sorted[idx]
}

export function getMetricsSummary() {
  const latencies = metricsStore.map(m => m.latencyMs)
  const citations = metricsStore.map(m => m.citations)
  const fallbacks = metricsStore.filter(m => m.fallbackUsed).length
  const docsUsed = metricsStore.map(m => m.docsUsed)

  return {
    total: metricsStore.length,
    avgLatencyMs: average(latencies),
    p95LatencyMs: percentile(latencies, 0.95),
    avgCitations: average(citations),
    avgDocsUsed: average(docsUsed),
    fallbackRate: metricsStore.length > 0 ? fallbacks / metricsStore.length : 0
  }
}

export function logMetricsDashboard(): void {
  const summary = getMetricsSummary()
  if (summary.total === 0) {
    console.log('📊 RAG Metrics: no data')
    return
  }

  console.log('📊 RAG Metrics Summary')
  console.log(`   Samples: ${summary.total}`)
  console.log(`   Avg latency: ${summary.avgLatencyMs.toFixed(0)}ms (p95 ${summary.p95LatencyMs.toFixed(0)}ms)`) 
  console.log(`   Avg citations: ${summary.avgCitations.toFixed(1)}`)
  console.log(`   Avg docs used: ${summary.avgDocsUsed.toFixed(1)}`)
  console.log(`   Fallback rate: ${(summary.fallbackRate * 100).toFixed(1)}%`)
}
