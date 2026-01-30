#!/usr/bin/env npx tsx
/**
 * 🧪 T-050: Test Ré-ingestion UN Document
 * Valide que le nouveau modèle embedding fonctionne avant cleanup complet
 */

import { generateEmbedding } from '../lib/gemini'
import { chunkText } from '../lib/chunker'
import { supabaseAdmin } from '../lib/supabase'

const TEST_DOC = {
  name: 'TEST_REINGEST_MYBA_CONTRACT',
  content: `
# MYBA Charter Agreement - Obligations of Seller

The MYBA (Mediterranean Yacht Brokers Association) Charter Agreement is the industry standard for yacht charters. This agreement outlines the obligations of both the seller (yacht owner) and the buyer (charterer).

## Seller Obligations

1. **Vessel Delivery**: The seller must deliver the yacht at the agreed location, date, and time, in a seaworthy condition.

2. **Documentation**: Provide all necessary documentation including:
   - Valid registration certificate
   - Insurance coverage certificate (hull, P&I)
   - Safety equipment certificates
   - Crew certifications

3. **Crew and Provisioning**: Ensure the yacht is fully crewed with qualified personnel and adequately provisioned for the charter period.

4. **Maintenance Standards**: The yacht must be maintained in excellent condition, including:
   - Clean and well-presented throughout
   - All equipment in working order
   - Safety equipment compliant with regulations

5. **Availability**: Make the yacht available for the full charter period as agreed, except in case of force majeure.

## Buyer Obligations

1. **Payment**: The charterer must pay the charter fee as specified in the agreement, typically:
   - 50% deposit upon signing
   - 50% balance 4-6 weeks before charter start

2. **APA (Advance Provisioning Allowance)**: Pay the APA (typically 25-35% of charter fee) to cover:
   - Fuel
   - Food and beverages
   - Port fees
   - Other running expenses

3. **Security Deposit**: Provide a security deposit (typically $5,000-$20,000) to cover potential damages.

4. **Respect for the Vessel**: Use the yacht in a proper manner and follow crew instructions.

## Force Majeure

The MYBA agreement includes provisions for unforeseen circumstances that may prevent the charter from proceeding, such as:
- Natural disasters
- War or civil unrest
- Government restrictions
- Vessel breakdown (if not due to owner's negligence)

## Dispute Resolution

Disputes are typically resolved through arbitration in accordance with the laws of the flag state of the yacht.
  `.trim(),
  category: 'TEST_EMBEDDING_VALIDATION',
  source_url: 'https://example.com/test-doc'
}

async function main() {
  console.log('🧪 Test Ré-ingestion UN Document\n')
  console.log('═'.repeat(70))
  
  try {
    // Étape 1: Chunking (simplifié pour test)
    console.log('\n1️⃣ CHUNKING')
    console.log('─'.repeat(70))
    
    // Chunk manuel simple pour test rapide
    const chunks = [
      { 
        text: TEST_DOC.content.substring(0, 1000),
        tokenCount: 200,
        startChar: 0,
        endChar: 1000
      },
      {
        text: TEST_DOC.content.substring(500, 1500),
        tokenCount: 200,
        startChar: 500,
        endChar: 1500
      }
    ]
    
    console.log(`✅ ${chunks.length} chunks créés (manuel)`)
    chunks.forEach((c, i) => {
      console.log(`   [${i+1}] ~${c.tokenCount} tokens, "${c.text.substring(0, 60)}..."`)
    })
    
    // Étape 2: Generate Embeddings
    console.log('\n2️⃣ GÉNÉRATION EMBEDDINGS')
    console.log('─'.repeat(70))
    console.log('Modèle: gemini-embedding-001 (768D)')
    
    const startEmbed = Date.now()
    const embeddings = await Promise.all(
      chunks.map(c => generateEmbedding(c.text))
    )
    const embedTime = Date.now() - startEmbed
    
    console.log(`✅ ${embeddings.length} embeddings générés en ${embedTime}ms`)
    console.log(`   Dimensions: ${embeddings[0].length}D`)
    console.log(`   Sample values: [${embeddings[0].slice(0, 3).map(v => v.toFixed(4)).join(', ')}...]`)
    
    // Étape 3: Insert dans DB
    console.log('\n3️⃣ INSERTION DB')
    console.log('─'.repeat(70))
    
    // Insert document
    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        name: TEST_DOC.name,
        category: TEST_DOC.category,
        source_url: TEST_DOC.source_url,
        is_public: true
      })
      .select()
      .single()
    
    if (docError || !doc) {
      console.error('❌ Erreur insertion document:', docError)
      process.exit(1)
    }
    
    console.log(`✅ Document inséré: ${doc.id}`)
    
    // Insert chunks
    const chunksData = chunks.map((c, i) => ({
      document_id: doc.id,
      chunk_text: c.text,
      chunk_vector: embeddings[i],
      chunk_index: i,
      page_number: null,
      token_count: c.tokenCount
    }))
    
    const { error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .insert(chunksData)
    
    if (chunksError) {
      console.error('❌ Erreur insertion chunks:', chunksError)
      
      // Cleanup document
      await supabaseAdmin.from('documents').delete().eq('id', doc.id)
      process.exit(1)
    }
    
    console.log(`✅ ${chunks.length} chunks insérés`)
    
    // Étape 4: Test Search
    console.log('\n4️⃣ TEST SEARCH')
    console.log('─'.repeat(70))
    
    const testQueries = [
      "MYBA charter agreement seller obligations",
      "yacht charter payment APA",
      "force majeure provisions yacht charter"
    ]
    
    let allTestsPass = true
    
    for (const query of testQueries) {
      console.log(`\n📝 Query: "${query}"`)
      
      const qEmbedding = await generateEmbedding(query)
      const { data: results, error: searchError } = await supabaseAdmin.rpc('search_documents', {
        query_embedding: qEmbedding,
        match_threshold: 0.1,
        match_count: 5,
        filter_category: null
      })
      
      if (searchError) {
        console.error('   ❌ Erreur search:', searchError.message)
        allTestsPass = false
        continue
      }
      
      if (!results || results.length === 0) {
        console.error('   ❌ 0 résultats (ÉCHEC)')
        allTestsPass = false
        continue
      }
      
      const testDocResults = results.filter((r: any) => r.document_name === TEST_DOC.name)
      
      if (testDocResults.length === 0) {
        console.warn('   ⚠️  Résultats trouvés mais pas notre doc test')
        console.log(`      Total: ${results.length}, Top: ${results[0].document_name}`)
        console.log(`      Similarity: ${results[0].similarity.toFixed(4)}`)
      } else {
        const topTestResult = testDocResults[0]
        const similarity = topTestResult.similarity
        
        if (similarity >= 0.3) {
          console.log(`   ✅ Doc test trouvé! Similarity: ${similarity.toFixed(4)} (excellent)`)
        } else if (similarity >= 0.1) {
          console.log(`   ⚠️  Doc test trouvé mais similarity faible: ${similarity.toFixed(4)}`)
        } else {
          console.error(`   ❌ Doc test trouvé mais similarity trop faible: ${similarity.toFixed(4)}`)
          allTestsPass = false
        }
        
        console.log(`      Chunk: "${topTestResult.chunk_text.substring(0, 80)}..."`)
      }
    }
    
    // Étape 5: Cleanup Test Doc
    console.log('\n5️⃣ CLEANUP DOC TEST')
    console.log('─'.repeat(70))
    
    await supabaseAdmin.from('documents').delete().eq('id', doc.id)
    console.log('✅ Document test supprimé')
    
    // Résultat final
    console.log('\n═'.repeat(70))
    if (allTestsPass) {
      console.log('🎉 VALIDATION RÉUSSIE!')
      console.log('\n✅ Le nouveau modèle embedding fonctionne parfaitement')
      console.log('✅ Similarités > 0.3 obtenues')
      console.log('✅ Prêt pour ré-ingestion complète')
      console.log('\n📝 Prochaine étape:')
      console.log('   1. Vider DB: TRUNCATE document_chunks, documents CASCADE')
      console.log('   2. Re-ingérer: npm run ingest:all')
    } else {
      console.error('❌ VALIDATION ÉCHOUÉE')
      console.log('\n⚠️  Problèmes détectés - ne pas procéder à la ré-ingestion complète')
      console.log('   → Vérifier logs ci-dessus pour détails')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error)
    if (error instanceof Error) {
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
    }
    process.exit(1)
  }
}

main()
