#!/bin/bash

##############################################################################
# Test Chat API Locally
# Reproduit le même appel que le frontend
##############################################################################

echo "🔍 Testing Chat API Locally"
echo "============================"
echo ""

# Load env vars
source .env.local

# Determine the URL
if [ "$1" = "vercel" ]; then
    # Test on Vercel production
    API_URL="https://yachtia.vercel.app"
    echo "Testing VERCEL (production)"
else
    # Test locally
    API_URL="http://localhost:3000"
    echo "Testing LOCAL (make sure 'npm run dev' is running)"
fi

echo "API URL: $API_URL"
echo ""

# Test the /api/chat endpoint
echo "1️⃣  Testing POST /api/chat"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is maritime law?"}' \
  -w "\n%{http_code}")

# Split response and HTTP code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo ""
echo "Response Body:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

# Analyze response
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ HTTP 200 - Request succeeded"

    if echo "$BODY" | jq -e '.answer' > /dev/null 2>&1; then
        echo "✅ Response has 'answer' field"
        ANSWER=$(echo "$BODY" | jq -r '.answer' | head -c 100)
        echo "   Sample: $ANSWER..."
    else
        echo "❌ Response missing 'answer' field"
    fi

    if echo "$BODY" | jq -e '.conversationId' > /dev/null 2>&1; then
        echo "✅ Response has 'conversationId' field"
    else
        echo "❌ Response missing 'conversationId' field"
    fi

elif [ "$HTTP_CODE" = "500" ]; then
    echo "❌ HTTP 500 - Internal Server Error"
    echo ""
    echo "This means the API crashed. Check:"
    if [ "$1" = "vercel" ]; then
        echo "- Vercel Function Logs: https://vercel.com/dashboard → Deployments → Logs"
        echo "- Look for: error, Error, TypeError, ReferenceError, etc."
    else
        echo "- Terminal where 'npm run dev' is running"
        echo "- Look for: error, Error, TypeError, ReferenceError, etc."
    fi

elif [ "$HTTP_CODE" = "400" ]; then
    echo "❌ HTTP 400 - Bad Request"
    echo "   → Check the JSON payload format"

elif [ "$HTTP_CODE" = "429" ]; then
    echo "⚠️  HTTP 429 - Too Many Requests"
    echo "   → Rate limit hit (10 req/min)"

elif [ "$HTTP_CODE" = "000" ]; then
    echo "❌ No response (connection failed)"
    echo ""
    if [ "$1" = "vercel" ]; then
        echo "   → Check if Vercel URL is correct"
        echo "   → Check if site is deployed"
    else
        echo "   → Make sure 'npm run dev' is running on port 3000"
    fi

else
    echo "⚠️  HTTP $HTTP_CODE (Unexpected status)"
fi

echo ""
echo "---"
echo ""
echo "2️⃣  Checking environment variables"
echo ""

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY not loaded from .env.local"
else
    echo "✅ SUPABASE_SERVICE_ROLE_KEY loaded"
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ GEMINI_API_KEY not loaded from .env.local"
else
    echo "✅ GEMINI_API_KEY loaded"
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL not loaded from .env.local"
else
    echo "✅ NEXT_PUBLIC_SUPABASE_URL loaded"
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not loaded from .env.local"
else
    echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY loaded"
fi

echo ""
echo "---"
echo ""
echo "💡 Usage:"
echo "  bash test_chat_api.sh          # Test locally (http://localhost:3000)"
echo "  bash test_chat_api.sh vercel   # Test on Vercel production"
echo ""
