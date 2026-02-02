import './load-env'
import { searchDocuments } from '../lib/search-documents'
import { generateAnswer } from '../lib/gemini'

async function main() {
  const question = `Un armateur veut acheter un yacht de 38m construit en 2010, pavillon Îles Marshall aujourd'hui en privé, pour l'exploiter en commercial en Méditerranée sous pavillon Malte.

1/ Quelles sont les étapes et conditions principales pour passer de RMI privé à Malte commercial?
2/ Ce yacht devra-t-il être conforme au CYC 2020/2025 et quelles adaptations techniques sont à prévoir?
3/ Quelles sont les grandes lignes du traitement TVA pour des charters en France/Italie/Espagne au départ de Malte?`

  console.log(`\n🧪 Test Question Complexe Perplexity\n`)
  console.log(`Question:\n${question}\n`)
  
  const results = await searchDocuments(question, {})
  
  console.log(`✅ Retrieved ${results.length} chunks\n`)
  
  const context = results.map(r => r.chunkText)
  const metadata = results.map(r => ({
    document_name: r.documentName,
    category: r.category,
    source_url: r.sourceUrl,
    page_number: r.pageNumber
  }))
  
  const result = await generateAnswer(question, context, [], metadata)
  
  console.log(`\n${'='.repeat(80)}`)
  console.log('📝 RÉPONSE GEMINI')
  console.log('='.repeat(80))
  console.log(result.answer)
  console.log('='.repeat(80))
  
  const citationCount = (result.answer.match(/\[Source:/g) || []).length
  console.log(`\n📊 Métriques:`)
  console.log(`   - Citations: ${citationCount}`)
  console.log(`   - Chunks utilisés: ${results.length}`)
  console.log(`   - Sources uniques: ${result.sources.length}`)
  console.log(`   - Fallback internet: ${result.answer.includes('recherche web') ? 'OUI ❌' : 'NON ✅'}`)
}

main()
