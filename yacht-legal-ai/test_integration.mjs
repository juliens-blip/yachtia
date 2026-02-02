#!/usr/bin/env node

/**
 * Integration test for Gemini + Supabase
 * Tests the same flow as /api/chat endpoint
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env vars
const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const GEMINI_API_KEY = envVars.GEMINI_API_KEY;
const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

console.log('🧪 Integration Test: Yacht Legal AI');
console.log('=====================================\n');

// Test 1: Gemini Connection
console.log('📡 Test 1: Gemini API (gemini-2.0-flash)');
try {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent('Réponds en une phrase: Qu\'est-ce que le droit maritime?');
  const response = result.response.text();

  console.log('✅ Gemini Response:', response.substring(0, 100) + '...\n');
} catch (error) {
  console.log('❌ Gemini Error:', error.message, '\n');
}

// Test 2: Supabase Connection
console.log('📡 Test 2: Supabase Connection');
try {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Test basic query
  const { data, error } = await supabase.from('documents').select('id, name').limit(3);

  if (error) throw error;

  console.log('✅ Supabase Connected. Documents found:', data?.length || 0);
  if (data?.length > 0) {
    console.log('   Sample:', data.map(d => d.name).join(', '));
  }
  console.log('');
} catch (error) {
  console.log('❌ Supabase Error:', error.message, '\n');
}

// Test 3: Embedding Generation
console.log('📡 Test 3: Embedding Generation (gemini-embedding-001)');
try {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

  const result = await embeddingModel.embedContent('maritime law yacht');
  const embedding = result.embedding.values;

  console.log('✅ Embedding generated. Dimensions:', embedding.length);
  console.log('   First 5 values:', embedding.slice(0, 5).map(v => v.toFixed(4)).join(', '), '\n');
} catch (error) {
  console.log('❌ Embedding Error:', error.message, '\n');
}

// Test 4: RAG Search (if documents exist)
console.log('📡 Test 4: RAG Vector Search');
try {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Generate query embedding
  const queryResult = await embeddingModel.embedContent('droit maritime yacht');
  const queryEmbedding = queryResult.embedding.values;

  // Search using RPC function
  const { data, error } = await supabase.rpc('search_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 3
  });

  if (error) throw error;

  console.log('✅ RAG Search completed. Results:', data?.length || 0);
  if (data?.length > 0) {
    data.forEach((r, i) => {
      console.log(`   ${i+1}. [${r.similarity?.toFixed(3)}] ${r.document_name}: ${r.content?.substring(0, 50)}...`);
    });
  } else {
    console.log('   (No documents indexed yet - this is OK for fresh deployment)');
  }
  console.log('');
} catch (error) {
  console.log('❌ RAG Search Error:', error.message, '\n');
}

console.log('=====================================');
console.log('🎯 Integration Test Complete!\n');
