#!/usr/bin/env bash
set -euo pipefail

API_BASE=${API_BASE:-"http://localhost:3000"}
PDF_PATH=${PDF_PATH:-""}
CATEGORY=${CATEGORY:-"MYBA"}

if [[ -z "$PDF_PATH" ]]; then
  echo "Set PDF_PATH to a local PDF file to run upload test." >&2
  exit 1
fi

# Upload document
UPLOAD_RESP=$(curl -sS -X POST \
  -F "file=@${PDF_PATH}" \
  -F "category=${CATEGORY}" \
  "${API_BASE}/api/upload-doc")

echo "Upload response: ${UPLOAD_RESP}"

DOC_ID=$(echo "$UPLOAD_RESP" | python3 -c "import sys, json; print(json.load(sys.stdin).get('documentId',''))")
if [[ -z "$DOC_ID" ]]; then
  echo "Upload failed or missing documentId" >&2
  exit 1
fi

# Search test
SEARCH_RESP=$(curl -sS -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"What is MYBA?","category":"MYBA"}' \
  "${API_BASE}/api/search")

echo "Search response: ${SEARCH_RESP}"

# Signed URL test
URL_RESP=$(curl -sS -X POST \
  -H "Content-Type: application/json" \
  -d "{\"documentId\":\"${DOC_ID}\"}" \
  "${API_BASE}/api/document-url")

echo "Signed URL response: ${URL_RESP}"

# Delete user data (optional placeholder)
# curl -sS -X DELETE -H "Content-Type: application/json" -d '{"userId":"<user-id>"}' "${API_BASE}/api/delete-user-data"
