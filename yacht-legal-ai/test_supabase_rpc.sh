#!/bin/bash

##############################################################################
# Test Supabase RPC Function
# Vérifie que search_documents() existe et fonctionne
##############################################################################

echo "🔍 Testing Supabase RPC Function"
echo "=================================="
echo ""

# Load env vars
source .env.local

SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

echo "Testing RPC function: search_documents()"
echo "Supabase URL: $SUPABASE_URL"
echo ""

# Test 1: Call the RPC function with dummy embedding
echo "1️⃣  Calling RPC function search_documents..."
echo ""

RESPONSE=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/search_documents" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query_embedding": [0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1],
    "match_threshold": 0.7,
    "match_count": 5,
    "filter_category": null
  }')

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if error
if echo "$RESPONSE" | grep -q "error\|Error\|ERROR"; then
    echo "❌ RPC call FAILED!"
    echo ""
    echo "Possible causes:"
    echo "- Function search_documents doesn't exist"
    echo "- Service key is invalid"
    echo "- RPC endpoint is misconfigured"
else
    echo "✅ RPC call succeeded!"
fi

echo ""
echo "---"
echo ""
echo "2️⃣  Checking if function exists in database..."
echo ""

# Query the database to see if function exists
FUNC_CHECK=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/search_documents" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -w "%{http_code}" \
  -d '{"query_embedding": [0.1], "match_threshold": 0.7, "match_count": 1, "filter_category": null}' 2>&1)

HTTP_CODE="${FUNC_CHECK: -3}"

if [ "$HTTP_CODE" = "404" ]; then
    echo "❌ Function NOT FOUND (HTTP 404)"
    echo "   → search_documents RPC function doesn't exist in database"
    echo ""
    echo "To fix:"
    echo "1. Go to Supabase SQL Editor"
    echo "2. Run: database/migrations/006_create_search_function.sql"
    echo "3. Verify: SELECT routine_name FROM information_schema.routines WHERE routine_name = 'search_documents';"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ UNAUTHORIZED (HTTP 401)"
    echo "   → Service key is invalid or expired"
elif [ "$HTTP_CODE" = "400" ]; then
    echo "⚠️  BAD REQUEST (HTTP 400)"
    echo "   → Function exists but input parameters are wrong"
    echo "   → This might be expected with dummy data"
elif [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Function EXISTS and responds (HTTP 200)"
    echo "   → search_documents RPC is working!"
else
    echo "⚠️  HTTP $HTTP_CODE"
    echo "   → Unknown status"
fi
