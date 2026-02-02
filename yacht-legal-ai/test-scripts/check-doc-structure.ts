import './load-env'
import { supabaseAdmin } from '../lib/supabase'

async function main() {
  console.log('Fetching document structure...\n')
  
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .limit(1)
    .single()
  
  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }
  
  console.log('✅ Document fields:')
  Object.keys(data).forEach(key => {
    const value = (data as any)[key]
    const type = typeof value
    const preview = type === 'string' ? value.slice(0, 50) + (value.length > 50 ? '...' : '') : JSON.stringify(value)
    console.log(`  - ${key}: ${type} = ${preview}`)
  })
  
  console.log('\n✅ Full document sample:')
  console.log(JSON.stringify(data, null, 2))
}

main()
