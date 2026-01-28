/**
 * Script d'ingestion simplifié (ES modules)
 * Compatible Node 18+ sans problèmes d'imports
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local explicitly
config({ path: join(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as cheerio from 'cheerio'
import fetch from 'node-fetch'
import pdfParse from 'pdf-parse'

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

// Map Next.js env vars to regular names
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL')
if (!SUPABASE_SERVICE_KEY) throw new Error('Missing SUPABASE_SERVICE_KEY')
if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

const BATCH_SIZE = 5  // Réduit pour éviter rate limiting
const DELAY_BETWEEN_BATCHES = 3000  // 3 secondes

// ═══════════════════════════════════════════════════════════
// DOCUMENTS DE RÉFÉRENCE (TOUS - HTML UNIQUEMENT)
// Note: PDFs nécessitent pdfParse qui a des problèmes d'import
// On ingère les 46 documents HTML (les 8 PDFs seront ajoutés plus tard)
// ═══════════════════════════════════════════════════════════

// Mapping catégories script → DB schema
// DB autorise: 'MYBA', 'AML', 'MLC', 'PAVILION', 'INSURANCE', 'CREW', 'REGISTRATION', 'ENVIRONMENTAL', 'CORPORATE', 'CHARTER'
const ALL_DOCS = {
  MYBA: [
    { url: 'https://www.212-yachts.com/myba-yacht-charter-explained/', name: '212 Yachts - MYBA Yacht Broker', type: 'html' },
    { url: 'https://www.yourboatholiday.com/the-complete-guide-to-the-myba-e-contract/', name: 'Complete Guide to MYBA E-Contract', type: 'html' },
    { url: 'https://www.windwardyachts.com/blog/what-is-myba-charter-agreement/', name: 'What is MYBA Charter Agreement', type: 'html' },
    { url: 'https://camperandnicholsons.com/magazine/mybacharteragreement', name: 'MYBA Charter Agreement Explained', type: 'html' },
    { url: 'https://mallorcamarinegroup.com/myba-charter-contract/', name: 'Pros and Cons MYBA Contract', type: 'html' },
    { url: 'https://www.superyachtnews.com/opinion/when-the-myba-charter-contract-evolves', name: 'MYBA Contract Evolves', type: 'html' }
  ],
  CHARTER: [
    { url: 'https://www.charteranddreams.com/en/news-and-inspiration/what-is-the-yet-scheme-and-why-it-matters-for-superyacht-charter-in-europe', name: 'What is YET Scheme', type: 'html' },
    { url: 'https://www.yourboatholiday.com/understanding-the-yacht-engaged-in-trade-yet-scheme/', name: 'Understanding YET Scheme', type: 'html' },
    { url: 'https://catamaranguru.com/2025-yacht-tax-shake-up-new-rules-and-costs-for-global-cruisers/', name: '2025 Yacht Tax Shake-Up', type: 'html' },
    { url: 'https://yachtownership-solutions.com/en/news/superyacht-2025-events-moving-on-from-the-shows-to-the-best-ownership-structuring', name: 'Superyacht 2025 Events', type: 'html' }
  ],
  AML: [
    { url: 'https://rosemont-int.com/en/article/news/aml-laws-covering-yacht-brokers-in-the-eu-and-other-key-jurisdictions', name: 'AML Laws Yacht Brokers EU', type: 'html' },
    { url: 'https://rosemont-int.com/en/article/news/new-aml-obligations-for-yacht-brokers-real-estate-developers-car-and-jet-brokers-in-france', name: 'New AML Obligations France 2025', type: 'html' },
    { url: 'https://yachtownership-solutions.com/en/news/compliance-obligations-in-the-yachting-industry-requirements-in-monaco-france-and-the-eu', name: 'Compliance Obligations Monaco/France/EU', type: 'html' },
    { url: 'https://yachtownership-solutions.com/en/news/amsf-sanctions-2025-critical-lessons-for-monaco-yacht-brokers', name: 'AMSF Sanctions 2025 Monaco', type: 'html' },
    { url: 'https://alpassurances.fr/en/article/enhanced-kyc-obligations-what-brokers-need-to-know-2025', name: 'Enhanced KYC Requirements 2025', type: 'html' }
  ],
  MLC: [
    { url: 'https://oceanskies.com/guide/maritime-labour-convention-2006-mlc-2006-yachts/', name: 'MLC 2006 & Yachts', type: 'html' },
    { url: 'https://www.yachting-pages.com/articles/a-crew-guide-to-the-maritime-labour-convention.html', name: 'Crew Guide to MLC 2006', type: 'html' },
    { url: 'https://www.transport.gov.mt/maritime/ship-and-yacht-registry/superyacht-registration/mlc-2006-stcw-157', name: 'Malta MLC 2006 STCW', type: 'html' },
    { url: 'https://www.info.boaton.fr/comprendre-la-maritime-labour-convention?lang=en', name: 'Understand Maritime Labour Convention', type: 'html' },
    { url: 'https://www.twwyachts.com/yacht-crew/mlc-2006/', name: 'Yacht Work Regulations MLC', type: 'html' },
    { url: 'https://www.yachtbuyer.com/en/advice/yacht-crew-payroll', name: 'Yacht Crew Payroll', type: 'html' },
    { url: 'https://www.yachting-pages.com/articles/superyacht-law-for-yacht-crew-training-contracts-and-visas.html', name: 'Superyacht Law Crew Training', type: 'html' },
    { url: 'https://yachtiecareers.com/yacht-crew-visas-to-work-on-yachts-in-europe/', name: 'Yacht Crew Visas Europe', type: 'html' }
  ],
  REGISTRATION: [
    { url: 'https://www.yachter.fr/en/laws-orders-regulations/discover-the-r-i-f-registre-international-francais/', name: 'RIF Registre International Français', type: 'html' },
    { url: 'https://martylegal.com/register-at-the-rif-the-french-international-register/', name: 'Register at RIF', type: 'html' },
    { url: 'https://www.yachting-pages.com/articles/french-government-announces-tighter-regulations-for-yacht-owners-and-crew.html', name: 'France Tighter Regulations', type: 'html' },
    { url: 'https://blog.captnboat.com/en/seamen/how-can-i-work-in-france-with-a-rya-yachtmaster-offshore-certificate/', name: 'Work France RYA Yachtmaster', type: 'html' },
    { url: 'https://yachtownership-solutions.com/en/yacht-registration/current-flag-trends-for-yachts', name: 'Current Flag Trends', type: 'html' },
    { url: 'https://www.edmiston.com/superyacht-classification-registration-yacht-flags-guide/', name: 'Superyacht Classification Registration', type: 'html' },
    { url: 'https://btmgroupci.com/news/top-5-countries-to-register-your-superyacht-and-why-it-matters', name: 'Top 5 Countries Register Superyacht', type: 'html' },
    { url: 'https://www.yachting-pages.com/articles/yacht-registration-choosing-the-right-flag-state.html', name: 'Choosing Right Flag State', type: 'html' },
    { url: 'https://oceantimemarine.com/blog/2017/06/18/how-to-choose-a-flag-of-convenience-for-a-super-yacht/', name: 'Flag of Convenience Superyacht', type: 'html' },
    { url: 'https://www.superyachtinvestor.com/opinion/choosing-the-right-yacht-register-203/', name: 'Choosing Right Yacht Register', type: 'html' },
    { url: 'https://www.agplaw.com/top-10-jurisdictions-for-ship-registration/', name: 'Top 10 Jurisdictions Ship Registration', type: 'html' },
    { url: 'https://www.obmagazine.media/the-smart-choice/', name: 'Superyacht Flag Registration Paris MoU', type: 'html' }
  ],
  CREW: [
    { url: 'https://cms.law/en/mco/publication/yachting-choice-of-labour-law-and-social-security-for-the-crew-a-strategic-issue-for-shipowners', name: 'Choice Labour Law Social Security Crew', type: 'html' },
    { url: 'https://cms.law/en/mco/global-reach/europe/monaco/expertise/employment-pensions/seafarers-law', name: 'Monaco Seafarers Law', type: 'html' },
    { url: 'https://www.eesc.europa.eu/en/our-work/opinions-information-reports/opinions/revision-directive-compliance-flag-state-requirements', name: 'Revision Directive Flag State Requirements', type: 'html' }
  ],
  CORPORATE: [
    { url: 'https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/dealing-citizens/are-there-restrictions-use-automated-decision-making-and-profiling_en', name: 'EU Automated Decision-Making GDPR', type: 'html' },
    { url: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/automated-decision-making-and-profiling/what-does-the-uk-gdpr-say-about-automated-decision-making-and-profiling/', name: 'UK GDPR Automated Decision-Making', type: 'html' },
    { url: 'https://resourcehub.bakermckenzie.com/en/resources/global-data-and-cyber-handbook/emea/eu/topics/artificial-intelligence-profiling-and-automated-decision-making', name: 'Baker McKenzie AI Profiling EU', type: 'html' },
    { url: 'https://www.medialaws.eu/the-rise-of-automated-decision-making-and-its-legal-framework/', name: 'Rise Automated Decision-Making', type: 'html' },
    { url: 'https://www.abmlawservices.com/ai-disclaimer', name: 'AI Disclaimer Example', type: 'html' },
    { url: 'https://danielrosslawfirm.com/2025/07/28/ai-and-contracts-why-you-need-waiver-and-limitation-of-liability-provisions-for-ai-tools/', name: 'AI Contracts Waivers Liability', type: 'html' },
    { url: 'https://www.holdingredlich.com/using-ai-in-your-business-risks-and-liabilities-to-consider', name: 'Using AI Business Risks', type: 'html' },
    { url: 'https://www.consultancy.uk/news/40403/three-hidden-risks-of-seeking-legal-advice-from-ai-tools', name: 'Hidden Risks Legal Advice AI', type: 'html' }
  ]
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function scrapeHTML(url) {
  console.log(`  🌐 Fetching ${url}...`)
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; YachtLegalAI/1.0)'
    }
  })
  const html = await response.text()
  const $ = cheerio.load(html)
  
  $('script, style, nav, header, footer').remove()
  
  let text = ''
  const selectors = ['main', 'article', '.content', 'body']
  for (const sel of selectors) {
    const el = $(sel)
    if (el.length > 0) {
      text = el.text()
      if (text.trim().length > 500) break
    }
  }
  
  text = text.replace(/\s+/g, ' ').trim()
  console.log(`  ✅ Scraped ${text.length} characters`)
  return text
}

function chunkText(text, chunkSize = 500, overlap = 200) {
  const words = text.split(/\s+/)
  const chunks = []
  
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ')
    if (chunk.trim()) {
      chunks.push(chunk)
    }
  }
  
  return chunks
}

async function generateEmbedding(text) {
  // Use REST API directly to force 768 dimensions (SDK 0.11 doesn't support outputDimensionality)
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: 768
      })
    }
  )
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini embedding error ${response.status}: ${errorText}`)
  }
  const result = await response.json()
  return result.embedding.values
}

// ═══════════════════════════════════════════════════════════
// INGESTION
// ═══════════════════════════════════════════════════════════

async function ingestDocument(doc, category) {
  try {
    console.log(`\n📄 [${category}] ${doc.name}`)
    console.log(`   URL: ${doc.url}`)
    
    // 1. Extract text
    const text = await scrapeHTML(doc.url)
    
    if (!text || text.length < 100) {
      throw new Error('Text too short')
    }
    
    console.log(`   ✂️  Texte total: ${text.length} caractères`)
    
    // 2. Store document
    const { data: document, error: docError} = await supabase
      .from('documents')
      .insert({
        name: doc.name,
        category,
        source_url: doc.url,
        file_path: doc.url,  // Same as source for web docs
        metadata: { source: doc.url, type: doc.type }
      })
      .select('id')
      .single()
    
    if (docError) throw docError
    
    console.log(`   💾 Document ID: ${document.id}`)
    
    // 3. Chunk text
    const chunks = chunkText(text, 500, 200)
    console.log(`   ✂️  ${chunks.length} chunks créés`)
    
    // 4. Generate embeddings (batch)
    const chunkRecords = []
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE)
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      
      console.log(`   🔢 Batch ${batchNumber}/${totalBatches} (${batch.length} chunks)`)
      
      const embeddings = await Promise.all(
        batch.map(chunk => generateEmbedding(chunk))
      )
      
      batch.forEach((chunkText, j) => {
        chunkRecords.push({
          document_id: document.id,
          chunk_index: i + j,
          chunk_text: chunkText,
          chunk_vector: embeddings[j],
          page_number: null,
          token_count: Math.ceil(chunkText.split(/\s+/).length)
        })
      })
      
      console.log(`   ✅ Batch ${batchNumber} done`)
      
      if (i + BATCH_SIZE < chunks.length) {
        await sleep(DELAY_BETWEEN_BATCHES)
      }
    }
    
    // 5. Insert chunks
    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunkRecords)
    
    if (chunksError) throw chunksError
    
    console.log(`   ✅ ${chunkRecords.length} chunks insérés`)
    
    return { success: true, chunks: chunkRecords.length }
    
  } catch (error) {
    console.error(`   ❌ Error:`, error.message)
    return { success: false, chunks: 0 }
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║                                                          ║')
  console.log('║  🚀 INGESTION COMPLÈTE (46 documents HTML)              ║')
  console.log('║                                                          ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')
  
  let totalDocs = 0
  let totalChunks = 0
  let totalErrors = 0
  const startTime = Date.now()
  
  for (const [category, docs] of Object.entries(ALL_DOCS)) {
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`📁 CATÉGORIE: ${category} (${docs.length} documents)`)
    console.log('═'.repeat(60))
    
    for (let i = 0; i < docs.length; i++) {
      console.log(`\n[${i + 1}/${docs.length}]`)
      const result = await ingestDocument(docs[i], category)
      if (result.success) {
        totalDocs++
        totalChunks += result.chunks
      } else {
        totalErrors++
      }
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  
  console.log('\n\n╔══════════════════════════════════════════════════════════╗')
  console.log('║                                                          ║')
  console.log('║           ✅ INGESTION TERMINÉE !                        ║')
  console.log('║                                                          ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')
  console.log(`📈 Résultats:`)
  console.log(`   ✅ Documents ingérés: ${totalDocs}`)
  console.log(`   ✅ Chunks créés: ${totalChunks}`)
  console.log(`   ❌ Erreurs: ${totalErrors}`)
  console.log(`   ⏱️  Durée totale: ${duration} minutes`)
  console.log(`   📊 Moyenne: ${(totalChunks / totalDocs).toFixed(0)} chunks/document`)
  console.log('\n💡 Lancez `npm run ingest:verify` pour vérifier la base.\n')
}

main().catch(console.error)
