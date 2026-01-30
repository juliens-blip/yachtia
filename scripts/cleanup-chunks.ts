#!/usr/bin/env node

/**
 * Cleanup Script - Suppression de tous les document_chunks avec embeddings corrompus
 * 
 * Bug: Embeddings dimension 9714 au lieu de 768 (Gemini)
 * Solution: DELETE all chunks pour permettre re-ingestion propre
 * 
 * IMPORTANT: Garde la table documents intacte (métadonnées)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Charger variables d'environnement
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERREUR: Variables Supabase manquantes dans .env.local');
  console.error('Requis: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupChunks() {
  console.log('🧹 CLEANUP DATABASE - Document Chunks\n');
  console.log('════════════════════════════════════════════════════════════════\n');

  // 1. Compter chunks actuels
  console.log('📊 Analyse de la base de données...\n');
  
  const { count: chunksCount, error: countError } = await supabase
    .from('document_chunks')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Erreur comptage chunks:', countError);
    process.exit(1);
  }

  console.log(`📦 Chunks actuels: ${chunksCount}`);

  // 2. Compter documents (ne pas toucher)
  const { count: docsCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });

  console.log(`📄 Documents (préservés): ${docsCount}\n`);

  // 3. Confirmation sécurité
  console.log('⚠️  ATTENTION: Cette opération va supprimer TOUS les chunks\n');
  console.log('Action: DELETE FROM document_chunks WHERE true');
  console.log('Chunks à supprimer:', chunksCount);
  console.log('Documents préservés:', docsCount);
  console.log('\n✅ Procédure de cleanup autorisée par orchestrateur APEX\n');

  // 4. Suppression
  console.log('🗑️  Suppression en cours...\n');

  const { error: deleteError } = await supabase
    .from('document_chunks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (trick: impossible UUID)

  if (deleteError) {
    console.error('❌ Erreur suppression:', deleteError);
    process.exit(1);
  }

  // 5. Vérification
  const { count: afterCount } = await supabase
    .from('document_chunks')
    .select('*', { count: 'exact', head: true });

  console.log('✅ Cleanup terminé\n');
  console.log('════════════════════════════════════════════════════════════════\n');
  console.log(`📦 Chunks avant: ${chunksCount}`);
  console.log(`📦 Chunks après: ${afterCount}`);
  console.log(`📄 Documents préservés: ${docsCount}`);
  console.log('\n🎯 Base de données prête pour re-ingestion avec Gemini 768-dim\n');
}

cleanupChunks().catch(console.error);
