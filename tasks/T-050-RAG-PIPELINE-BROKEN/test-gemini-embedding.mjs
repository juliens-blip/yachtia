#!/usr/bin/env node
/**
 * 🔬 T-050: Test Gemini Embedding Generation
 * Vérifie que l'API Gemini génère bien des embeddings 768D
 */

import 'dotenv/config'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY manquante dans .env.local')
  process.exit(1)
}

console.log('🧪 Test Gemini Embedding API\n')

async function testEmbedding() {
  const testText = "What are the obligations of the seller in a yacht sale contract?"
  
  console.log(`📝 Test text: "${testText}"\n`)
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: testText }] },
          taskType: 'RETRIEVAL_QUERY',
          outputDimensionality: 768
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Gemini API error ${response.status}:`)
      console.error(errorText)
      process.exit(1)
    }

    const result = await response.json()

    if (!result.embedding || !result.embedding.values) {
      console.error('❌ No embedding returned from Gemini API')
      console.log('Response:', JSON.stringify(result, null, 2))
      process.exit(1)
    }

    const embedding = result.embedding.values
    
    console.log('✅ Embedding generated successfully')
    console.log(`📊 Dimensions: ${embedding.length}`)
    console.log(`📊 First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`)
    console.log(`📊 Min value: ${Math.min(...embedding).toFixed(4)}`)
    console.log(`📊 Max value: ${Math.max(...embedding).toFixed(4)}`)
    console.log(`📊 Mean value: ${(embedding.reduce((a, b) => a + b, 0) / embedding.length).toFixed(4)}`)
    
    if (embedding.length !== 768) {
      console.error(`\n⚠️ WARNING: Expected 768 dimensions, got ${embedding.length}`)
    }
    
    console.log('\n🎯 Test complet - Embedding généré avec succès')
    
    // Export for SQL test
    const vectorStr = `[${embedding.join(', ')}]`
    console.log('\n📋 Embedding pour test SQL (copier-coller):')
    console.log(`'${vectorStr}'::vector(768)`)
    
    return embedding
  } catch (error) {
    console.error('❌ Exception:', error.message)
    process.exit(1)
  }
}

testEmbedding()
