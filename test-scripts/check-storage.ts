import './load-env'
import { supabaseAdmin } from '../lib/supabase'

async function main() {
  // Check if there's a storage bucket
  const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()
  
  if (!bucketsError && buckets) {
    console.log('Storage buckets:', buckets.map(b => b.name))
    
    // Check documents bucket if exists
    for (const bucket of buckets) {
      const { data: files, error } = await supabaseAdmin.storage.from(bucket.name).list()
      if (!error && files) {
        console.log(`\n${bucket.name} bucket: ${files.length} files`)
        files.slice(0, 5).forEach(f => console.log(`  - ${f.name}`))
      }
    }
  } else {
    console.log('No storage buckets or error:', bucketsError)
  }
}

main()
