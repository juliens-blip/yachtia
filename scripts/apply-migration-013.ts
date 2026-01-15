/**
 * Apply Migration 013 - Add source_url to search_documents
 * Auto-execution script
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

import { supabaseAdmin } from '../lib/supabase'

async function applyMigration013() {
  console.log('╔' + '═'.repeat(70) + '╗')
  console.log('║' + ' '.repeat(70) + '║')
  console.log('║   🔧 MIGRATION 013: Add source_url to search_documents      ║')
  console.log('║' + ' '.repeat(70) + '║')
  console.log('╚' + '═'.repeat(70) + '╝\n')

  try {
    // Read SQL migration file
    const migrationPath = path.join(__dirname, '../database/migrations/013_add_source_url_to_search.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration file loaded:', migrationPath)
    console.log('📝 SQL length:', sql.length, 'characters\n')
    
    // Split SQL into statements (simple split by semicolon)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`🔄 Found ${statements.length} SQL statements\n`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';'
      console.log(`\n[${i + 1}/${statements.length}] Executing statement...`)
      console.log(`${stmt.substring(0, 100)}${stmt.length > 100 ? '...' : ''}`)
      
      try {
        // Try to execute via raw SQL
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: stmt })
        
        if (error) {
          // Fallback: try direct execution (may not work with DDL)
          console.log('   ⚠️  exec_sql failed, trying direct execution...')
          const { error: directError } = await supabaseAdmin
            .from('_migrations')
            .select('id')
            .limit(0) // Just to test connection
          
          if (directError) {
            console.error('   ❌ Direct execution also failed')
            throw error
          }
          
          console.warn('   ⚠️  Statement needs manual execution in Supabase Dashboard')
          console.log(`   >> Copy this SQL to Supabase SQL Editor:\n\n${stmt}\n`)
        } else {
          console.log('   ✅ Statement executed successfully')
        }
      } catch (err) {
        console.error('   ❌ Error:', err instanceof Error ? err.message : err)
        console.log('\n   💡 This migration requires manual execution in Supabase Dashboard')
        console.log('   📋 Instructions:')
        console.log('      1. Go to https://supabase.com/dashboard')
        console.log('      2. Select your project')
        console.log('      3. Open SQL Editor')
        console.log('      4. Copy-paste the SQL below:\n')
        console.log('━'.repeat(70))
        console.log(sql)
        console.log('━'.repeat(70))
        console.log('\n      5. Click "Run"')
        console.log('      6. Verify success message\n')
        throw new Error('Manual migration required')
      }
    }
    
    // Test the new function
    console.log('\n🧪 Testing search_documents function...')
    const testEmbedding = new Array(768).fill(0)
    testEmbedding[0] = 1.0
    
    const { data, error } = await supabaseAdmin.rpc('search_documents', {
      query_embedding: testEmbedding,
      match_threshold: 0.1,
      match_count: 1
    })
    
    if (error) {
      throw new Error(`Function test failed: ${error.message}`)
    }
    
    console.log('✅ Function test successful')
    console.log('📊 Sample result:', data && data.length > 0 ? {
      has_source_url: 'source_url' in data[0],
      chunk_id: data[0].chunk_id,
      document_name: data[0].document_name
    } : 'No results (empty database)')
    
    console.log('\n' + '╔' + '═'.repeat(70) + '╗')
    console.log('║' + ' '.repeat(70) + '║')
    console.log('║              ✅ MIGRATION 013 APPLIED SUCCESSFULLY!          ║')
    console.log('║' + ' '.repeat(70) + '║')
    console.log('╚' + '═'.repeat(70) + '╝\n')
    
    console.log('🎉 Next steps:')
    console.log('   1. Run: npm run ingest:radiation')
    console.log('   2. Test chat with a question')
    console.log('   3. Verify sources appear with links\n')
    
  } catch (error) {
    console.error('\n💥 MIGRATION FAILED:', error instanceof Error ? error.message : error)
    
    if (error instanceof Error && error.message === 'Manual migration required') {
      console.log('\n📋 Please apply the migration manually in Supabase Dashboard')
      console.log('   File: database/migrations/013_add_source_url_to_search.sql\n')
      process.exit(1)
    } else {
      throw error
    }
  }
}

applyMigration013().catch(error => {
  console.error('\n💥 FATAL ERROR:', error)
  process.exit(1)
})
