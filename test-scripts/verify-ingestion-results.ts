import './load-env'
import { supabaseAdmin } from '../lib/supabase'

async function main() {
  console.log('🔍 Vérification post-ingestion\n')
  
  // Count documents
  const { count: docsCount } = await supabaseAdmin
    .from('documents')
    .select('*', { count: 'exact', head: true })
  
  // Count chunks
  const { count: chunksCount } = await supabaseAdmin
    .from('document_chunks')
    .select('*', { count: 'exact', head: true })
  
  // Chunks per document
  const { data: chunkDist } = await supabaseAdmin
    .rpc('get_chunk_distribution' as any)
    .limit(1)
    .single()
  
  console.log('📊 Base de données:')
  console.log(`   Documents: ${docsCount}`)
  console.log(`   Chunks: ${chunksCount}`)
  console.log(`   Avg chunks/doc: ${(chunksCount! / docsCount!).toFixed(1)}`)
  
  // Check embedding dimensions
  const { data: sample } = await supabaseAdmin
    .from('document_chunks')
    .select('chunk_vector')
    .limit(1)
    .single()
  
  if (sample?.chunk_vector) {
    console.log(`   Embedding dim: ${sample.chunk_vector.length}`)
  }
  
  console.log('\n✅ Ingestion vérifiée')
}

main()
