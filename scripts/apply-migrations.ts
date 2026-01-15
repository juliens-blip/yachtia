/**
 * Script pour appliquer les migrations SQL via Supabase Admin
 * Usage: npm run db:migrate
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') })

import { supabaseAdmin } from '../lib/supabase'

const MIGRATIONS_DIR = path.join(__dirname, '../database/migrations')

// Migrations a appliquer (dans l'ordre)
const MIGRATIONS_TO_APPLY = [
  '009_extend_document_categories.sql',
  '010_add_ingestion_columns.sql'
]

async function applyMigration(filename: string): Promise<boolean> {
  const filepath = path.join(MIGRATIONS_DIR, filename)

  console.log(`\n[${filename}]`)

  if (!fs.existsSync(filepath)) {
    console.error(`  Fichier non trouve: ${filepath}`)
    return false
  }

  const sql = fs.readFileSync(filepath, 'utf-8')
  console.log(`  SQL charge: ${sql.length} caracteres`)

  // Split SQL by semicolons to execute statements individually
  // This handles multi-statement migrations better
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`  ${statements.length} statements a executer`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]

    // Skip pure comments
    if (stmt.split('\n').every(line => line.trim().startsWith('--') || line.trim() === '')) {
      continue
    }

    console.log(`  [${i + 1}/${statements.length}] Execution...`)

    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: stmt })

      if (error) {
        // Try direct query if rpc doesn't exist
        const { error: directError } = await supabaseAdmin
          .from('_migrations_log')
          .select('*')
          .limit(0)

        // If we can't use RPC, we need to use raw SQL
        // This requires the SQL to be executed via Supabase Dashboard
        console.error(`  Erreur: ${error.message}`)
        console.log(`  >> Ce statement doit etre execute manuellement dans Supabase Dashboard`)
        console.log(`  >> SQL: ${stmt.substring(0, 100)}...`)
      } else {
        console.log(`  OK`)
      }
    } catch (err) {
      console.error(`  Exception: ${err instanceof Error ? err.message : err}`)
    }
  }

  return true
}

async function main() {
  console.log('=' .repeat(60))
  console.log('  APPLICATION DES MIGRATIONS')
  console.log('=' .repeat(60))

  // Check Supabase connection
  console.log('\nVerification connexion Supabase...')
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('id')
    .limit(1)

  if (error) {
    console.error('Erreur connexion Supabase:', error.message)
    console.log('\nVerifiez vos variables d\'environnement:')
    console.log('  - NEXT_PUBLIC_SUPABASE_URL')
    console.log('  - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  console.log('Connexion OK')

  // Try to apply migrations
  console.log('\n--- Migrations a appliquer ---')
  for (const migration of MIGRATIONS_TO_APPLY) {
    console.log(`  - ${migration}`)
  }

  // Since Supabase JS client doesn't support raw SQL execution,
  // we'll output the SQL for manual execution
  console.log('\n' + '='.repeat(60))
  console.log('  SQL A EXECUTER DANS SUPABASE DASHBOARD')
  console.log('='.repeat(60))
  console.log('\nAllez sur: https://supabase.com/dashboard')
  console.log('Project > SQL Editor > New Query')
  console.log('\nCopiez-collez le SQL suivant:\n')
  console.log('-'.repeat(60))

  for (const migration of MIGRATIONS_TO_APPLY) {
    const filepath = path.join(MIGRATIONS_DIR, migration)
    if (fs.existsSync(filepath)) {
      const sql = fs.readFileSync(filepath, 'utf-8')
      console.log(`\n-- ${migration}`)
      console.log(sql)
    }
  }

  console.log('\n' + '-'.repeat(60))
  console.log('\nApres avoir execute le SQL, lancez:')
  console.log('  npm run ingest:new')
}

main().catch(error => {
  console.error('Erreur:', error)
  process.exit(1)
})
