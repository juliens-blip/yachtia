#!/bin/bash
# Run Phase C+D tests with proper env export

cd "$(dirname "$0")/.."

echo "🔧 Exporting environment variables..."

# Parse .env.local safely
set -a
source .env.local 2>/dev/null
set +a

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "🧪 PHASE C: Threshold Adaptatif + Boost Official Docs"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

npx tsx test-scripts/test-threshold-boost.ts

PHASE_C_EXIT=$?

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "🧪 PHASE D: Multi-Aspect Structure + Multi-Sources"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

npx tsx test-scripts/test-multi-aspect-complete.ts

PHASE_D_EXIT=$?

echo ""
if [ $PHASE_C_EXIT -eq 0 ] && [ $PHASE_D_EXIT -eq 0 ]; then
  echo "✅ ALL TESTS PASSED - T040 Phase C+D COMPLETE"
  exit 0
else
  echo "⚠️  SOME TESTS FAILED - Check logs above"
  exit 1
fi
