#!/usr/bin/env node

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Load env vars from .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const API_KEY = envVars.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

console.log('🔍 GEMINI API DEBUG - Testing Available Models');
console.log('='.repeat(60));
console.log(`API Key: ${API_KEY.substring(0, 20)}...`);
console.log('='.repeat(60) + '\n');

const genAI = new GoogleGenerativeAI(API_KEY);

async function main() {
  try {
    // Test 1: List all available models
    console.log('📋 Fetching available models from ListModels API...\n');

    const models = await genAI.listModels();
    const modelList = [];

    for await (const model of models) {
      modelList.push(model.name);
    }

    console.log(`✓ Found ${modelList.length} models:\n`);
    modelList.forEach(m => {
      console.log(`   • ${m}`);
    });

    // Test 2: Try to use specific models
    console.log('\n' + '='.repeat(60));
    console.log('🧪 Testing specific models for generateContent...\n');

    const testModels = [
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro-002',
      'gemini-1.5-flash-002',
      'gemini-pro'
    ];

    let workingModel = null;

    for (const modelName of testModels) {
      try {
        process.stdout.write(`Testing: ${modelName.padEnd(25)} `);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('test');
        console.log('✓ WORKS!');

        if (!workingModel) {
          workingModel = modelName;
        }
      } catch (error) {
        const errorMsg = error.message.substring(0, 50);
        console.log(`✗ ${errorMsg}`);
      }
    }

    // Test 3: Test embeddings
    console.log('\n' + '='.repeat(60));
    console.log('📊 Testing embedding models...\n');

    const embeddingModels = [
      'text-embedding-004',
      'embedding-001'
    ];

    for (const modelName of embeddingModels) {
      try {
        process.stdout.write(`Testing: ${modelName.padEnd(25)} `);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.embedContent('test');
        console.log('✓ WORKS!');
      } catch (error) {
        const errorMsg = error.message.substring(0, 50);
        console.log(`✗ ${errorMsg}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY\n');

    if (workingModel) {
      console.log(`✓ RECOMMENDED MODEL: ${workingModel}`);
      console.log(`\nUpdate lib/gemini.ts line 56 to:`);
      console.log(`  const model = genAI.getGenerativeModel({ model: '${workingModel}' })`);
    } else {
      console.log('❌ NO WORKING MODELS FOUND!');
      console.log('\nPossible causes:');
      console.log('1. API key has no permissions');
      console.log('2. API quota exhausted');
      console.log('3. Region not supported');
      console.log('4. API key is invalid');
    }

  } catch (error) {
    console.error('❌ FATAL ERROR:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

main();
