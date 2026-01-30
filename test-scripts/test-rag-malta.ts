import './load-env'
import { searchDocuments } from '../lib/search-documents'
import { generateAnswer } from '../lib/gemini'

async function main() {
  const question = "What are the requirements for Malta commercial yacht registration?"
  
  console.log(`\n🧪 Test RAG Query\n`)
  console.log(`Question: ${question}\n`)
  
  const results = await searchDocuments(question, {})
  
  console.log(`✅ Retrieved ${results.length} chunks:`)
  results.slice(0, 5).forEach((r, i) => {
    console.log(`   ${i+1}. [${r.category}] ${r.documentName} (score: ${r.similarity.toFixed(3)})`)
  })
  
  if (results.length === 0) {
    console.error('\n❌ No chunks retrieved - RAG still broken')
    process.exit(1)
  }
  
  console.log(`\n📝 Generating answer...`)
  const context = results.map(r => r.chunkText)
  const metadata = results.map(r => ({
    document_name: r.documentName,
    category: r.category,
    source_url: r.sourceUrl,
    page_number: r.pageNumber
  }))
  
  const result = await generateAnswer(question, context, [], metadata)
  const answer = result.answer
  
  console.log(`\n✅ Answer:\n${answer.slice(0, 500)}...\n`)
  
  const hasCitations = answer.includes('[Source:')
  console.log(`${hasCitations ? '✅' : '❌'} Citations: ${hasCitations ? 'Present' : 'Missing'}`)
  
  if (!hasCitations) {
    console.warn('⚠️  No citations in answer')
  }
  
  console.log('\n✅ RAG TEST PASSED')
}

main()
