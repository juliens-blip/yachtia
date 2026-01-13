#!/bin/bash

##############################################################################
# Test Gemini Models via REST API
# Directly tests Generative Language API to find working models
##############################################################################

echo "🔍 Testing Gemini Models via REST API"
echo "======================================"
echo ""

# Load env vars
if [ -f ".env.local" ]; then
    source .env.local
else
    echo "❌ .env.local not found"
    exit 1
fi

API_KEY="$GEMINI_API_KEY"

if [ -z "$API_KEY" ]; then
    echo "❌ GEMINI_API_KEY not set"
    exit 1
fi

echo "API Key: ${API_KEY:0:20}..."
echo ""

# Models to test
MODELS=(
    "gemini-2.0-flash-exp"
    "gemini-2.0-flash"
    "gemini-1.5-pro"
    "gemini-1.5-flash"
    "gemini-1.5-pro-002"
    "gemini-1.5-flash-002"
    "gemini-pro"
)

WORKING_MODEL=""

echo "Testing models..."
echo ""

for MODEL in "${MODELS[@]}"; do
    echo -n "Testing: $MODEL ... "

    # Use v1 endpoint (newer models might be on v1, older on v1beta)
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        "https://generativelanguage.googleapis.com/v1/models/$MODEL:generateContent?key=$API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "contents": [{
                "parts": [{"text": "test"}]
            }]
        }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ WORKS (v1)"
        WORKING_MODEL="$MODEL"
        echo "Response: $BODY" | head -c 100
        echo ""
    elif [ "$HTTP_CODE" = "400" ]; then
        echo "⚠️  v1 Bad Request (trying v1beta...)"

        # Try v1beta
        RESPONSE_BETA=$(curl -s -w "\n%{http_code}" -X POST \
            "https://generativelanguage.googleapis.com/v1beta/models/$MODEL:generateContent?key=$API_KEY" \
            -H "Content-Type: application/json" \
            -d '{
                "contents": [{
                    "parts": [{"text": "test"}]
                }]
            }')

        HTTP_CODE_BETA=$(echo "$RESPONSE_BETA" | tail -n1)
        BODY_BETA=$(echo "$RESPONSE_BETA" | sed '$d')

        if [ "$HTTP_CODE_BETA" = "200" ]; then
            echo "✅ WORKS (v1beta)"
            WORKING_MODEL="$MODEL"
            echo "Response: $BODY_BETA" | head -c 100
            echo ""
        else
            echo "✗ v1beta: HTTP $HTTP_CODE_BETA"
        fi
    else
        ERROR_MSG=$(echo "$BODY" | jq -r '.error.message // .error // "Unknown error"' 2>/dev/null || echo "$BODY" | head -c 60)
        echo "✗ HTTP $HTTP_CODE - $ERROR_MSG"
    fi

    echo ""
done

echo "======================================"
echo ""

if [ -n "$WORKING_MODEL" ]; then
    echo "✅ SUCCESS: Found working model"
    echo ""
    echo "Recommended model: $WORKING_MODEL"
    echo ""
    echo "To update the code:"
    echo "1. Edit lib/gemini.ts"
    echo "2. Change line 56 from:"
    echo "    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })"
    echo "3. To:"
    echo "    const model = genAI.getGenerativeModel({ model: '$WORKING_MODEL' })"
    echo "4. Save and redeploy"
else
    echo "❌ No working models found!"
    echo ""
    echo "Possible causes:"
    echo "1. API key has no permissions (leaked key or quota exhausted)"
    echo "2. API key region not supported"
    echo "3. API key is invalid"
    echo ""
    echo "Check your API key at: https://ai.google.dev/account"
fi
