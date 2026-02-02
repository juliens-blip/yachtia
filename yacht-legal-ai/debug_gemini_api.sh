#!/bin/bash

##############################################################################
# Debug Gemini API - Show Actual Error Messages
##############################################################################

source .env.local

API_KEY="$GEMINI_API_KEY"

echo "🔍 Gemini API Debug"
echo "==================="
echo ""
echo "API Key (masked): ${API_KEY:0:20}...${API_KEY: -5}"
echo ""
echo "Testing: gemini-1.5-flash on v1 endpoint"
echo ""

RESPONSE=$(curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=$API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "contents": [{
            "parts": [{"text": "test"}]
        }]
    }')

echo "Full Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""
echo "---"
echo ""
echo "Testing: gemini-1.5-flash on v1beta endpoint"
echo ""

RESPONSE_BETA=$(curl -s -X POST \
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "contents": [{
            "parts": [{"text": "test"}]
        }]
    }')

echo "Full Response:"
echo "$RESPONSE_BETA" | jq . 2>/dev/null || echo "$RESPONSE_BETA"
