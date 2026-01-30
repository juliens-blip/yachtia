import './load-env'
import { supabaseAdmin } from '../lib/supabase'

async function main() {
  const { data: docs, error } = await supabaseAdmin
    .from('documents')
    .select('id, name, category, file_url, source_url')
  
  if (error || !docs) {
    console.error('Error:', error)
    process.exit(1)
  }
  
  const withFileUrl = docs.filter(d => d.file_url && d.file_url.length > 0)
  const withSourceUrl = docs.filter(d => d.source_url && d.source_url.length > 0)
  const withEither = docs.filter(d => (d.file_url && d.file_url.length > 0) || (d.source_url && d.source_url.length > 0))
  
  console.log(`Total documents: ${docs.length}`)
  console.log(`With file_url: ${withFileUrl.length}`)
  console.log(`With source_url: ${withSourceUrl.length}`)
  console.log(`With either: ${withEither.length}`)
  console.log(`Without URLs: ${docs.length - withEither.length}`)
  
  // Sample URLs
  console.log(`\nSample URLs:`)
  withEither.slice(0, 5).forEach(d => {
    console.log(`  - ${d.name}`)
    console.log(`    URL: ${d.file_url || d.source_url}`)
  })
}

main()
