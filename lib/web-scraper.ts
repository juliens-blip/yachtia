/**
 * Web Scraper for HTML pages
 * Extracts clean text content from web pages for RAG ingestion
 */

import * as cheerio from 'cheerio'
import fetch from 'node-fetch'
import https from 'https'

/**
 * Scrape text content from HTML web page
 * @param url - URL of the page to scrape
 * @returns Clean text content
 */
export async function scrapeWebPage(url: string): Promise<string> {
  try {
    console.log(`  🌐 Fetching ${url}...`)
    
    // Fetch HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YachtLegalAI/1.0; +https://yacht-legal-ai.vercel.app)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Remove unwanted elements
    $(
      'script, style, nav, header, footer, iframe, noscript, ' +
      '.nav, .navigation, .menu, .sidebar, .advertisement, .ad, ' +
      '.cookie-banner, .popup, .modal, #comments, .comments'
    ).remove()
    
    // Try to find main content (common selectors)
    let mainContent = ''
    const contentSelectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '.post-content',
      '.article-content',
      '.entry-content',
      '#content',
      '#main',
      'body'
    ]
    
    for (const selector of contentSelectors) {
      const element = $(selector)
      if (element.length > 0) {
        mainContent = element.text()
        if (mainContent.trim().length > 500) {
          // Found substantial content
          break
        }
      }
    }
    
    // Fallback to body if nothing found
    if (!mainContent || mainContent.trim().length < 500) {
      mainContent = $('body').text()
    }
    
    // Clean whitespace
    const cleanText = mainContent
      .replace(/\s+/g, ' ')  // Multiple spaces/newlines → single space
      .replace(/\t+/g, ' ')  // Tabs → space
      .trim()
    
    console.log(`  ✅ Scraped ${cleanText.length} characters`)
    
    return cleanText
    
  } catch (error) {
    console.error(`  ❌ Failed to scrape ${url}:`, error instanceof Error ? error.message : error)
    throw new Error(`Web scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Download PDF from URL as Buffer
 * @param url - URL of PDF file
 * @returns Buffer containing PDF data
 */
export async function downloadPDF(url: string): Promise<Buffer> {
  try {
    console.log(`  📥 Downloading PDF ${url}...`)

    const insecureHosts = new Set(['griffithsassoc.com', 'www.mer.gouv.fr', 'mer.gouv.fr'])
    const extraInsecure = (process.env.INSECURE_PDF_HOSTS || '')
      .split(',')
      .map(host => host.trim())
      .filter(Boolean)
    for (const host of extraInsecure) {
      insecureHosts.add(host)
    }
    const host = new URL(url).hostname
    const agent = insecureHosts.has(host)
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined

    const response = await fetch(url, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; YachtLegalAI/1.0; +https://yacht-legal-ai.vercel.app)',
        'Accept': 'application/pdf,application/octet-stream;q=0.9,*/*;q=0.8'
        , 'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8'
        , 'Referer': `https://${host}/`
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    console.log(`  ✅ Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)
    
    return buffer
    
  } catch (error) {
    console.error(`  ❌ Failed to download ${url}:`, error instanceof Error ? error.message : error)
    throw new Error(`PDF download failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
