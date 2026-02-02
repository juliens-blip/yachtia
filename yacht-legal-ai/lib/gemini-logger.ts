/**
 * Gemini RAG Logger
 * 
 * Logs detailed Gemini interactions for debugging RAG pipeline
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export interface GeminiLogEntry {
  question: string
  chunksProvided: number
  chunksPreviews: string[]
  response: string
  sourcesCited: string[]
  usedInternet: boolean
}

const LOG_DIR = join(process.cwd(), 'logs')
const LOG_FILE = join(LOG_DIR, 'gemini-rag.log')

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true })
  }
}

export function extractCitations(response: string): string[] {
  const citations: string[] = []
  
  const docPattern = /\[Doc:\s*([^\]]+)\]/gi
  let match
  while ((match = docPattern.exec(response)) !== null) {
    citations.push(`Doc: ${match[1]}`)
  }
  
  const sourcePattern = /\[Source:\s*([^\]]+)\]/gi
  while ((match = sourcePattern.exec(response)) !== null) {
    citations.push(`Source: ${match[1]}`)
  }
  
  const webPattern = /\[Web:\s*([^\]]+)\]/gi
  while ((match = webPattern.exec(response)) !== null) {
    citations.push(`Web: ${match[1]}`)
  }
  
  return Array.from(new Set(citations))
}

export function detectInternetFallback(response: string): boolean {
  const fallbackIndicators = [
    'source web',
    'sources web',
    'recherche web',
    'internet',
    '[Web:',
    'site officiel',
    'https://',
    'http://',
    'je n\'ai pas de document',
    'pas de document spécifique',
    'documents ne contiennent pas',
    'information manquante',
    'compléter avec des sources web'
  ]
  
  const lowerResponse = response.toLowerCase()
  return fallbackIndicators.some(indicator => 
    lowerResponse.includes(indicator.toLowerCase())
  )
}

export function logGeminiInteraction(data: GeminiLogEntry): void {
  try {
    ensureLogDir()
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...data,
      analysis: {
        citationCount: data.sourcesCited.length,
        usedDocuments: data.sourcesCited.filter(c => c.startsWith('Doc:') || c.startsWith('Source:')).length,
        usedWeb: data.sourcesCited.filter(c => c.startsWith('Web:')).length,
        chunksAnalyzed: data.chunksProvided,
        responseLength: data.response.length
      }
    }
    
    console.log('[GEMINI RAG]', JSON.stringify({
      timestamp: logEntry.timestamp,
      question: data.question.substring(0, 80) + (data.question.length > 80 ? '...' : ''),
      chunksProvided: data.chunksProvided,
      citationCount: logEntry.analysis.citationCount,
      usedInternet: data.usedInternet
    }, null, 2))
    
    appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n')
  } catch (error) {
    console.error('[GEMINI LOGGER] Failed to log:', error)
  }
}
