#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmbeddings() {
  console.log('🔍 Vérification des embeddings existants\n');

  // Sample 1 chunk pour voir la dimension
  const { data, error } = await supabase
    .from('document_chunks')
    .select('id, embedding')
    .limit(1)
    .single();

  if (error) {
    console.log('✅ Aucun chunk existant (DB vide après cleanup)');
    console.log('\n❌ BLOQUEUR: Quota Gemini API épuisé (429)');
    console.log('   Free tier: 1000 embed/jour');
    console.log('   Documents à ingérer: 226');
    console.log('   Chunks estimés: ~3000+');
    console.log('\n💡 Solutions:');
    console.log('   1. Attendre reset quota (demain ~UTC)');
    console.log('   2. Upgrade Gemini tier payant');
    console.log('   3. Utiliser OpenAI embeddings (text-embedding-3-small)');
    return;
  }

  const dim = data.embedding?.length || 0;
  console.log(`📦 Dimension détectée: ${dim}`);
  
  if (dim === 768) {
    console.log('✅ Dimension correcte (Gemini 768)');
  } else if (dim === 9714) {
    console.log('❌ Dimension incorrecte (bug détecté)');
  } else {
    console.log(`⚠️  Dimension inattendue: ${dim}`);
  }
}

checkEmbeddings().catch(console.error);
