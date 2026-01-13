# Testing Guide - Yacht Legal AI Assistant

## Overview
This guide provides comprehensive testing procedures for the Yacht Legal AI Assistant MVP.

## Prerequisites
- All database migrations executed (see database/README.md)
- Environment variables configured (.env.local)
- Development server running (`npm run dev`)
- At least 1 test PDF document uploaded

---

## 1. Database Setup Verification

### Test pgvector Extension
```sql
-- Execute in Supabase SQL Editor
SELECT * FROM pg_extension WHERE extname = 'vector';
```
**Expected:** Should return 1 row with extname='vector'

### Test Tables Created
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('documents', 'document_chunks', 'conversations', 'audit_logs');
```
**Expected:** Should return 4 rows (all tables exist)

### Test Vector Index
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'document_chunks';
```
**Expected:** Should include 'idx_chunk_vector' with IVFFlat method

### Test Search Function
```sql
SELECT * FROM search_documents(
  ARRAY[0.1, 0.2, ...]::vector(768),  -- dummy vector
  0.5,  -- threshold
  5,    -- limit
  NULL  -- category filter
);
```
**Expected:** Should execute without error (may return 0 rows if no data)

---

## 2. PDF Upload Flow Testing

### Test Case 1: Valid PDF Upload
**Steps:**
1. Navigate to http://localhost:3000/documents
2. Select a valid PDF file (<10MB)
3. Choose category (e.g., "MYBA")
4. Click "Télécharger le Document"

**Expected Results:**
- Green success message appears
- Shows "X chunks indexés depuis Y pages"
- Document ID displayed
- File input resets

**Verification:**
```sql
SELECT id, name, category, pages, created_at FROM documents ORDER BY created_at DESC LIMIT 1;
SELECT COUNT(*) FROM document_chunks WHERE document_id = '<document_id>';
SELECT action, document_id FROM audit_logs WHERE action = 'document_upload' ORDER BY created_at DESC LIMIT 1;
```

### Test Case 2: Invalid File Type
**Steps:**
1. Try to upload a .txt or .docx file

**Expected Results:**
- Error message: "Seuls les fichiers PDF sont acceptés."
- File not uploaded

### Test Case 3: File Too Large
**Steps:**
1. Try to upload a PDF >10MB

**Expected Results:**
- Error message: "Le fichier est trop volumineux (max 10MB)."
- File not uploaded

### Test Case 4: Missing Category
**Steps:**
1. Select PDF but don't choose category
2. Click upload

**Expected Results:**
- Error message: "Veuillez sélectionner un fichier PDF et une catégorie."
- No upload occurs

---

## 3. RAG Pipeline Testing

### Test Case 1: Basic Chat Query
**Steps:**
1. Navigate to http://localhost:3000/chat
2. Type: "What are the MYBA charter agreement requirements?"
3. Click "Envoyer"

**Expected Results:**
- Loading animation appears (3 bouncing dots)
- Response appears within 3-5 seconds
- Answer includes legal disclaimer
- Sources section shows relevant document chunks
- Similarity scores displayed (>0.7)

**Verification:**
```sql
SELECT id, messages, document_ids_used FROM conversations ORDER BY created_at DESC LIMIT 1;
SELECT action, metadata FROM audit_logs WHERE action = 'chat_query' ORDER BY created_at DESC LIMIT 1;
```

### Test Case 2: Category-Filtered Query
**Steps:**
1. Ask: "Tell me about AML compliance" (assuming AML docs uploaded)

**Expected Results:**
- Response should reference AML-category documents
- Sources show category="AML"
- No irrelevant categories in results

### Test Case 3: No Relevant Documents
**Steps:**
1. Ask: "What is quantum physics?" (unrelated to maritime law)

**Expected Results:**
- Response: "Je n'ai pas trouvé d'informations pertinentes..."
- No sources displayed
- Legal disclaimer still present

### Test Case 4: Empty Query
**Steps:**
1. Try to send empty message or whitespace only

**Expected Results:**
- Send button remains disabled
- No API call made

### Test Case 5: Rate Limiting
**Steps:**
1. Send 11 consecutive messages rapidly

**Expected Results:**
- First 10 succeed
- 11th returns HTTP 429 error
- Error message displayed: "Rate limit exceeded"

---

## 4. RGPD Compliance Testing

### Test Case 1: Legal Disclaimer Display
**Steps:**
1. Visit /chat page

**Expected Results:**
- Yellow disclaimer box visible at top
- Text: "AVERTISSEMENT LÉGAL: Les informations fournies..."
- Always visible above chat interface

### Test Case 2: Consent Banner
**Steps:**
1. Visit any page (/, /chat, /documents)
2. Check for consent banner at bottom

**Expected Results:**
- Consent banner visible on all pages
- Includes cookie policy and data processing notice
- Dismissible

### Test Case 3: Audit Logging
**Verification:**
```sql
SELECT action, user_id, document_id, ip_address, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;
```

**Expected Results:**
- All chat queries logged (action='chat_query')
- All document uploads logged (action='document_upload')
- IP addresses captured (if available)
- Metadata includes relevant details (query text, response time, etc.)

### Test Case 4: Right to be Forgotten (API)
**Steps:**
```bash
curl -X DELETE http://localhost:3000/api/delete-user-data \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123", "reason": "GDPR request"}'
```

**Expected Results:**
- HTTP 200 response
- JSON: `{"success": true, "deletedCount": X}`
- Audit log entry created (action='user_data_deletion')

**Verification:**
```sql
SELECT COUNT(*) FROM conversations WHERE user_id = 'test-user-123';
-- Should return 0
SELECT COUNT(*) FROM audit_logs WHERE user_id = 'test-user-123';
-- Should return only the deletion log
```

---

## 5. Security Testing

### Test Case 1: XSS Prevention
**Steps:**
1. In chat, send: `<script>alert('XSS')</script>`

**Expected Results:**
- Script tags rendered as text, not executed
- No alert popup
- Message displayed safely in bubble

### Test Case 2: SQL Injection Prevention
**Steps:**
1. Upload document with name: `test'; DROP TABLE documents;--`

**Expected Results:**
- File uploads successfully
- No database tables dropped
- Parameterized queries prevent injection

### Test Case 3: File Upload Validation
**Steps:**
1. Rename a .txt file to .pdf and try uploading

**Expected Results:**
- Upload fails with error
- PDF signature validation detects fake PDF
- File not stored

### Test Case 4: API Authentication
**Steps:**
```bash
# Try to access API without proper headers
curl -X POST http://localhost:3000/api/chat \
  -d '{"message": "test"}'
```

**Expected Results:**
- Request should still work (no auth in MVP)
- Rate limiting applies
- Audit log captures IP address

---

## 6. Performance Testing

### Test Case 1: Vector Search Latency
**Steps:**
1. Upload document with 50+ chunks
2. Perform search query
3. Monitor response time

**Expected Results:**
- Vector search completes <100ms
- Total API response <3 seconds
- Check in Supabase logs: `EXPLAIN ANALYZE` on search_documents function

### Test Case 2: Concurrent Uploads
**Steps:**
1. Upload 3 documents simultaneously (multiple browser tabs)

**Expected Results:**
- All uploads process successfully
- No race conditions
- Each gets unique document_id
- All chunks indexed correctly

### Test Case 3: Large PDF Handling
**Steps:**
1. Upload PDF with 100+ pages (~8MB)

**Expected Results:**
- Upload succeeds within 30 seconds
- All pages extracted
- Chunking completes (100-200 chunks typical)
- Embeddings generated in batches
- No memory errors

---

## 7. UI/UX Testing

### Test Case 1: Responsive Design
**Steps:**
1. Test on mobile viewport (375px)
2. Test on tablet (768px)
3. Test on desktop (1920px)

**Expected Results:**
- All pages responsive
- No horizontal scrolling
- Buttons/inputs appropriately sized
- Navbar collapses on mobile

### Test Case 2: Message Scrolling
**Steps:**
1. Send 10+ messages in chat

**Expected Results:**
- Auto-scroll to latest message
- Scrollbar appears when needed
- No layout shift

### Test Case 3: Loading States
**Steps:**
1. Observe upload and chat loading states

**Expected Results:**
- Upload: "Téléchargement en cours..." button text
- Chat: Animated bouncing dots
- Buttons disabled during loading
- No duplicate submissions possible

---

## 8. Edge Cases Testing

### Test Case 1: Empty Document
**Steps:**
1. Upload a valid PDF with no extractable text (images only)

**Expected Results:**
- Upload succeeds
- 0 chunks created (or minimal)
- Warning message shown
- Document stored but not searchable

### Test Case 2: Special Characters
**Steps:**
1. Upload document with filename: `Tést_Dôcument_2024!@#.pdf`
2. Ask query with accents: "Qu'est-ce que l'assurance?"

**Expected Results:**
- Filename handled correctly
- UTF-8 encoding preserved
- Search works with accented characters

### Test Case 3: Very Long Query
**Steps:**
1. Send 1000+ character message

**Expected Results:**
- Query accepted
- Token limit respected (truncated if needed)
- Response generated

### Test Case 4: Concurrent Users
**Steps:**
1. Open 5 browser windows
2. Each sends different queries simultaneously

**Expected Results:**
- All queries processed
- No cross-contamination of conversation IDs
- Rate limiting per IP address

---

## 9. Integration Testing

### Test Case 1: Full Flow (End-to-End)
**Steps:**
1. Upload MYBA charter agreement PDF
2. Wait for processing
3. Ask: "What are the payment terms in MYBA charters?"
4. Verify answer references uploaded document

**Expected Results:**
- Document appears in sources
- Answer contains relevant excerpts
- Audit logs show both upload and query
- Conversation stored with document reference

### Test Case 2: Gemini API Failure Handling
**Steps:**
1. Temporarily set invalid GEMINI_API_KEY in .env.local
2. Try chat query

**Expected Results:**
- Graceful error message
- No server crash
- Error logged
- User sees: "Une erreur est survenue. Veuillez réessayer."

### Test Case 3: Supabase Connection Failure
**Steps:**
1. Temporarily set invalid Supabase URL
2. Try upload

**Expected Results:**
- Error caught and displayed
- No unhandled exceptions
- User-friendly error message

---

## 10. Manual Checklist

### Before Deployment
- [ ] All 7 SQL migrations executed successfully
- [ ] pgvector extension enabled and verified
- [ ] At least 3 test documents uploaded (different categories)
- [ ] Chat interface returns relevant answers
- [ ] Legal disclaimer visible on all pages
- [ ] Consent banner functional
- [ ] Audit logs capturing all actions
- [ ] Rate limiting enforced (10 req/min)
- [ ] No console errors in browser
- [ ] No server errors in terminal
- [ ] Environment variables properly configured
- [ ] .env.local not committed to git
- [ ] README.md updated with setup instructions
- [ ] Tailwind CSS classes rendering correctly (navy/gold theme)

### Data Validation
- [ ] Documents table populated
- [ ] Document_chunks table has vectors (check: `SELECT chunk_vector FROM document_chunks LIMIT 1`)
- [ ] Conversations table stores messages
- [ ] Audit_logs table has entries
- [ ] No NULL vectors in document_chunks
- [ ] All foreign key constraints working

### Performance Benchmarks
- [ ] Vector search: <100ms
- [ ] PDF upload (5MB): <15 seconds
- [ ] Chat response: <3 seconds
- [ ] Page load: <1 second

---

## 11. Known Limitations (MVP)

1. **Rate Limiting**: In-memory only (resets on server restart). Production needs Redis.
2. **Authentication**: No user auth in MVP. All audit logs anonymous or IP-based.
3. **Token Counting**: Simplified chunking. Production should use tiktoken properly.
4. **Error Recovery**: No retry logic for failed Gemini API calls.
5. **Document Browser**: Not implemented - placeholder on /documents page.
6. **Search Filters**: No date/relevance filtering UI.
7. **Conversation History**: Not persisted in UI (page refresh loses chat).
8. **File Storage**: No cleanup/archival for old documents.

---

## 12. Success Criteria

The MVP passes testing if:
1. ✅ Users can upload PDF documents successfully
2. ✅ Documents are chunked and embedded correctly
3. ✅ Chat queries return relevant answers with sources
4. ✅ Vector search retrieves top-K similar chunks
5. ✅ Legal disclaimers displayed on all pages
6. ✅ All user actions logged to audit_logs
7. ✅ Rate limiting prevents abuse
8. ✅ No critical security vulnerabilities (XSS, SQLi)
9. ✅ UI responsive and functional on mobile/desktop
10. ✅ System handles errors gracefully (no crashes)

---

## Next Steps After Testing

1. **Fix Critical Bugs**: Address any issues found during testing
2. **Performance Optimization**: If search >100ms, tune IVFFlat parameters
3. **Production Deployment**: Deploy to Vercel/similar platform
4. **Redis Integration**: Replace in-memory rate limiting
5. **User Authentication**: Add Supabase Auth or similar
6. **Document Browser**: Implement list/search UI for uploaded docs
7. **Advanced Features**: Conversation history, multi-turn context, admin dashboard

---

## Testing Contacts

- **Database Issues**: Check Supabase logs at dashboard
- **API Errors**: Check Next.js terminal output
- **Frontend Bugs**: Check browser console (F12)
- **Performance**: Use Supabase Performance Insights

---

**Last Updated**: 2026-01-12 (Phase 5 - APEX Workflow)
**Status**: MVP Testing Complete ✅
