# Vercel Deployment Setup Guide - Yacht Legal AI

## ⚠️ CRITICAL: Environment Variables Configuration

The "Internal Server Error" on `/api/chat` is caused by **missing environment variables on Vercel Dashboard**.

### Step 1: Add Environment Variables to Vercel

1. **Go to:** https://vercel.com/dashboard
2. **Select:** Project `yacht-legal-ai` (or `yachtia` or `brisack`)
3. **Navigate to:** Settings → Environment Variables
4. **Add THESE 4 variables** (copy exact names and values):

#### SECRET Variables (Add to ALL environments: Production, Preview, Development)

```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: YOUR_SUPABASE_SERVICE_ROLE_KEY
Environments: ✓ Production, ✓ Preview, ✓ Development
```

```
Name: GEMINI_API_KEY
Value: YOUR_GEMINI_API_KEY
Environments: ✓ Production, ✓ Preview, ✓ Development
```

#### PUBLIC Variables (Next.js NEXT_PUBLIC_* variables)

```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://hmbattewtlmjbufiwuxt.supabase.co
Environments: ✓ Production, ✓ Preview, ✓ Development
```

```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: YOUR_SUPABASE_ANON_KEY
Environments: ✓ Production, ✓ Preview, ✓ Development
```

⚠️ **IMPORTANT:** Check the boxes for ALL THREE environments!

---

## Step 2: Verify Database Schema on Supabase

### 2.1 - Check that ALL 4 Tables exist

Go to: https://supabase.com/dashboard → Select project → SQL Editor

Run this query:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected result:**
- ✓ audit_logs
- ✓ conversations
- ✓ document_chunks
- ✓ documents

If any table is missing, run the corresponding migration file from `database/migrations/00X_*.sql`.

---

### 2.2 - Check that RPC function `search_documents` exists

Run this query in SQL Editor:

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'search_documents';
```

**Expected result:** 1 row with `search_documents`

**If NOT found:**
1. Open: `database/migrations/006_create_search_function.sql`
2. Copy the entire content
3. Paste into Supabase SQL Editor
4. Execute
5. Re-run the SELECT above to verify

---

## Step 3: Re-deploy on Vercel

After adding environment variables:

1. **Manual redeploy:**
   - Vercel Dashboard → project → Deployments
   - Click the latest deployment → "Redeploy"

   OR

2. **Push new commit to trigger auto-deploy:**
   ```bash
   git commit --allow-empty -m "Trigger Vercel redeploy with env vars"
   git push
   ```

**Wait 2-3 minutes for build to complete.**

---

## Step 4: Test the Chat API

Once deployment is green (✓ Ready):

**Test via cURL:**
```bash
curl -X POST https://yachtia.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is MYBA?"}' 2>&1 | jq .
```

**Expected response:**
```json
{
  "answer": "MYBA stands for...",
  "conversationId": "...",
  "sources": [...],
  "responseTime": "..."
}
```

**If still getting 500 error:**
- Check Vercel Function Logs: Deployments → Select deployment → Function Logs
- Look for error messages
- Compare with Step 1 above (might have typo in env var name)

---

## Troubleshooting

### "Cannot find module @supabase/supabase-js"
- Env vars are missing or misspelled
- Check Vercel Settings → Environment Variables

### "search_documents is not a function"
- RPC function not created in Supabase
- Run Step 2.2 above

### "Invalid Gemini API key"
- GEMINI_API_KEY is wrong or quota exhausted
- Verify the key at: https://aistudio.google.com/app/apikey

### Chat works locally but not on Vercel
- Local uses `.env.local`
- Vercel uses Dashboard Environment Variables
- Make sure variable NAMES match exactly (case-sensitive!)

---

## Configuration Checklist

```
[ ] 1. Added SUPABASE_SERVICE_ROLE_KEY to Vercel (all 3 environments)
[ ] 2. Added GEMINI_API_KEY to Vercel (all 3 environments)
[ ] 3. Added NEXT_PUBLIC_SUPABASE_URL to Vercel (all 3 environments)
[ ] 4. Added NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel (all 3 environments)
[ ] 5. Verified 4 tables exist in Supabase
[ ] 6. Verified search_documents RPC function exists
[ ] 7. Triggered Vercel redeploy
[ ] 8. Tested /api/chat endpoint
[ ] 9. Chat works! 🎉
```

---

## Next Steps

Once chat works:

1. **Upload documents:**
   - Go to: https://yachtia.vercel.app/documents
   - Upload a PDF (maritime law, MYBA, AML, etc.)
   - System will automatically:
     - Extract text
     - Split into chunks
     - Generate embeddings
     - Store in Supabase

2. **Ask questions:**
   - Go to: https://yachtia.vercel.app/chat
   - Ask about the documents you uploaded
   - System will:
     - Generate query embedding
     - Search vector database
     - Return relevant chunks as context
     - Generate answer with Gemini
     - Show sources

3. **View audit logs:**
   - All user actions logged in `audit_logs` table
   - RGPD compliant
   - 2-year retention policy

---

## Support

If issues persist:

1. **Check Vercel logs:**
   - Deployments → latest deployment → Function Logs
   - Look for exact error message

2. **Check Supabase status:**
   - https://status.supabase.com

3. **Check Gemini API quota:**
   - https://aistudio.google.com/app/apikey → Check quota

4. **Run local test:**
   ```bash
   NODE_ENV=production npm run build
   NODE_ENV=production npm run start
   # Test http://localhost:3000/api/chat
   ```

---

**Last updated:** 2026-01-13
**Status:** Ready for deployment
