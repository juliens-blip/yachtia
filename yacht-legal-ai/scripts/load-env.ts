/**
 * Env loader - MUST be imported first in all scripts
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local immediately
dotenv.config({ path: path.join(__dirname, '../.env.local') })

// Verify critical env vars
const requiredVars = [
  'GEMINI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
]

const missing = requiredVars.filter(v => !process.env[v])

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:')
  missing.forEach(v => console.error(`   - ${v}`))
  console.error('\n💡 Ensure .env.local exists and contains all required vars')
  process.exit(1)
}

console.log('✅ Environment loaded successfully')
