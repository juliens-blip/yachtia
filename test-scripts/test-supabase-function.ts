/**
 * Test de diagnostic de la fonction search_documents
 * Vérifie que la fonction retourne bien source_url
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

import { supabaseAdmin } from '../lib/supabase'
import { generateEmbedding } from '../lib/gemini'

async function testSearchFunction() {
  console.log('╔' + '═'.repeat(70) + '╗')
  console.log('║' + ' '.repeat(70) + '║')
  console.log('║   🔍 TEST FONCTION search_documents                          ║')
  console.log('║' + ' '.repeat(70) + '║')
  console.log('╚' + '═'.repeat(70) + '╝\n')

  try {
    // Test 1: Générer un embedding
    console.log('📝 Test 1: Génération embedding...')
    const testQuery = "test Malta deletion certificate"
    const embedding = await generateEmbedding(testQuery)
    console.log(`✅ Embedding généré: ${embedding.length} dimensions\n`)

    // Test 2: Appeler la fonction search_documents
    console.log('📝 Test 2: Appel search_documents...')
    const { data, error } = await supabaseAdmin.rpc('search_documents', {
      query_embedding: embedding,
      match_threshold: 0.1, // Très bas pour avoir des résultats
      match_count: 3,
      filter_category: null
    })

    if (error) {
      console.error('❌ Erreur Supabase:', error)
      console.error('   Message:', error.message)
      console.error('   Details:', error.details)
      console.error('   Hint:', error.hint)
      console.error('   Code:', error.code)
      throw error
    }

    console.log(`✅ Fonction exécutée avec succès\n`)

    // Test 3: Vérifier la structure des résultats
    console.log('📝 Test 3: Vérification structure résultats...')
    console.log(`   Nombre de résultats: ${data?.length || 0}`)

    if (data && data.length > 0) {
      const firstResult = data[0]
      console.log('\n   📊 Colonnes retournées:')
      Object.keys(firstResult).forEach(key => {
        const value = firstResult[key]
        const type = typeof value
        const preview = type === 'string' && value.length > 50 
          ? value.substring(0, 50) + '...' 
          : value
        console.log(`      • ${key}: ${type} = ${preview}`)
      })

      // Vérification critique: source_url présent ?
      console.log('\n   🎯 Vérifications critiques:')
      const hasSourceUrl = 'source_url' in firstResult
      console.log(`      ${hasSourceUrl ? '✅' : '❌'} source_url présent: ${hasSourceUrl}`)
      
      const expectedFields = [
        'chunk_id',
        'document_id',
        'document_name',
        'category',
        'chunk_text',
        'similarity',
        'page_number',
        'chunk_index',
        'source_url'
      ]

      console.log('\n   📋 Champs attendus vs reçus:')
      expectedFields.forEach(field => {
        const present = field in firstResult
        console.log(`      ${present ? '✅' : '❌'} ${field}`)
      })

      const missingFields = expectedFields.filter(f => !(f in firstResult))
      const extraFields = Object.keys(firstResult).filter(f => !expectedFields.includes(f))

      if (missingFields.length > 0) {
        console.log(`\n   ⚠️  Champs MANQUANTS: ${missingFields.join(', ')}`)
      }
      if (extraFields.length > 0) {
        console.log(`\n   ℹ️  Champs EXTRAS: ${extraFields.join(', ')}`)
      }

      // Test 4: Vérifier source_url est bien une URL
      if (hasSourceUrl) {
        const sourceUrl = firstResult.source_url
        console.log(`\n   🔗 source_url value:`)
        console.log(`      Type: ${typeof sourceUrl}`)
        console.log(`      Valeur: ${sourceUrl || '(null)'}`)
        
        if (sourceUrl && typeof sourceUrl === 'string' && sourceUrl.startsWith('http')) {
          console.log(`      ✅ Format URL valide`)
        } else if (sourceUrl === null) {
          console.log(`      ⚠️  NULL (document sans URL source)`)
        } else {
          console.log(`      ❌ Format URL invalide`)
        }
      }

    } else {
      console.log('   ⚠️  Aucun résultat retourné (base vide ou threshold trop élevé)')
    }

    console.log('\n' + '╔' + '═'.repeat(70) + '╗')
    console.log('║' + ' '.repeat(70) + '║')
    console.log('║              ✅ TEST TERMINÉ AVEC SUCCÈS !                   ║')
    console.log('║' + ' '.repeat(70) + '║')
    console.log('╚' + '═'.repeat(70) + '╝\n')

    if (data && data.length > 0 && !('source_url' in data[0])) {
      console.log('🚨 PROBLÈME DÉTECTÉ:')
      console.log('   La fonction search_documents ne retourne PAS source_url')
      console.log('   La migration SQL n\'a pas été appliquée correctement\n')
      console.log('📋 SOLUTION:')
      console.log('   1. Ouvrir Supabase SQL Editor')
      console.log('   2. Exécuter: MIGRATION_FORCE_DROP_ALL.sql')
      console.log('   3. Relancer ce test: npm run test:function\n')
      process.exit(1)
    } else if (data && data.length > 0) {
      console.log('🎉 SUCCÈS:')
      console.log('   La fonction search_documents retourne bien source_url')
      console.log('   Le problème vient probablement du cache Vercel\n')
      console.log('📋 SOLUTION:')
      console.log('   Attendre quelques minutes que Vercel redéploie\n')
    } else {
      console.log('⚠️  ATTENTION:')
      console.log('   Aucun document dans la base pour tester')
      console.log('   Impossible de vérifier la structure complète\n')
    }

  } catch (error) {
    console.error('\n💥 ERREUR:', error instanceof Error ? error.message : error)
    console.error('\n📋 Stack trace:', error instanceof Error ? error.stack : 'N/A')
    process.exit(1)
  }
}

testSearchFunction()
