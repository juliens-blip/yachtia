#!/bin/bash

# Script de validation des corrections Perplexity
# Usage: ./scripts/validate-perplexity-fixes.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Validation corrections Perplexity - RAG V3"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /home/julien/Documents/iayacht/yacht-legal-ai

echo ""
echo "📋 Tests E2E RAG V2/V3 Improvements (10 tests)..."
npx tsx scripts/test-rag-v2-improvements.ts
RESULT_V2=$?

echo ""
echo "📋 Tests E2E RAG Final (5 tests)..."
npx tsx scripts/test-e2e-rag-final.ts
RESULT_FINAL=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $RESULT_V2 -eq 0 ] && [ $RESULT_FINAL -eq 0 ]; then
  echo "✅ TOUS LES TESTS PASSÉS - Corrections Perplexity validées"
  exit 0
else
  echo "❌ TESTS ÉCHOUÉS - Voir logs ci-dessus"
  [ $RESULT_V2 -ne 0 ] && echo "   - test-rag-v2-improvements.ts: FAILED"
  [ $RESULT_FINAL -ne 0 ] && echo "   - test-e2e-rag-final.ts: FAILED"
  exit 1
fi
