import './load-env'
import { supabaseAdmin } from '../lib/supabase'

async function main() {
  const { data: files, error } = await supabaseAdmin.storage.from('documents').list('documents', {
    limit: 1000,
    offset: 0
  })
  
  if (error) {
    console.error('Error:', error)
    
    // Try root
    const { data: rootFiles, error: rootError } = await supabaseAdmin.storage.from('documents').list()
    if (!rootError && rootFiles) {
      console.log(`\nRoot of 'documents' bucket: ${rootFiles.length} items`)
      rootFiles.forEach(f => console.log(`  - ${f.name} (${f.metadata?.size || 0} bytes)`))
    }
    return
  }
  
  if (files) {
    console.log(`Found ${files.length} files in documents/documents/`)
    files.slice(0, 20).forEach(f => {
      console.log(`  - ${f.name} (${f.metadata?.size || 0} bytes, ${f.metadata?.mimetype || 'unknown'})`)
    })
  }
}

main()
