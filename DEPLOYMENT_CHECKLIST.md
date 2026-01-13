# 🚀 Deployment Checklist - Internal Server Error FIX

## Problem
When making requests to `/api/chat`, you get: **"Internal server error. Please try again later."**

## Root Cause
The environment variables are **NOT configured on Vercel Dashboard**. The app needs 4 critical variables to connect to Supabase and Gemini API.

## Solution (EXACT STEPS)

### ✅ Step 1: Add Environment Variables to Vercel (5 minutes)

**URL:** https://vercel.com/dashboard

1. Click on your project: **`yacht-legal-ai`** (or `yachtia` or `brisack`)
2. Go to: **Settings** → **Environment Variables**
3. **For each variable below, click "Add" and fill in:**

#### Variable 1: SUPABASE_SERVICE_ROLE_KEY
```
Name:  SUPABASE_SERVICE_ROLE_KEY
Value: YOUR_SUPABASE_SERVICE_ROLE_KEY
Environments: ☑ Production ☑ Preview ☑ Development
```
**Click SAVE**

#### Variable 2: GEMINI_API_KEY
```
Name:  GEMINI_API_KEY
Value: YOUR_GEMINI_API_KEY
Environments: ☑ Production ☑ Preview ☑ Development
```
**Click SAVE**

#### Variable 3: NEXT_PUBLIC_SUPABASE_URL
```
Name:  NEXT_PUBLIC_SUPABASE_URL
Value: https://hmbattewtlmjbufiwuxt.supabase.co
Environments: ☑ Production ☑ Preview ☑ Development
```
**Click SAVE**

#### Variable 4: NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Name:  NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: YOUR_SUPABASE_ANON_KEY
Environments: ☑ Production ☑ Preview ☑ Development
```
**Click SAVE**

⚠️ **IMPORTANT:** Make sure all 4 variables are checked for **Production, Preview, AND Development**!

---

### ✅ Step 2: Verify Database on Supabase (3 minutes)

**URL:** https://supabase.com/dashboard

1. Select your project
2. Go to: **SQL Editor**
3. **Run this query:**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**You should see 4 tables:**
- ✓ `audit_logs`
- ✓ `conversations`
- ✓ `document_chunks`
- ✓ `documents`

**If any table is MISSING:**
- Open: `/database/migrations/` (in your repo)
- Find the migration file for the missing table
- Copy its SQL content
- Paste into Supabase SQL Editor
- Execute

---

### ✅ Step 3: Verify RPC Function (3 minutes)

**In Supabase SQL Editor, run:**

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'search_documents';
```

**You should see 1 row with: `search_documents`**

**If it's MISSING:**
1. Open: `database/migrations/006_create_search_function.sql`
2. Copy ALL the SQL
3. Paste into Supabase SQL Editor
4. Execute
5. Re-run the SELECT query above to confirm

---

### ✅ Step 4: Trigger Vercel Redeploy (2 minutes)

**Option A: Quick redeploy (Recommended)**
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to: **Deployments**
4. Find the latest deployment (top)
5. Click the **3 dots menu** → **Redeploy**

**Option B: Push new commit**
```bash
cd /home/julien/Documents/iayacht/yacht-legal-ai
git commit --allow-empty -m "Trigger Vercel redeploy with env vars configured"
git push origin main
```

⏳ **Wait 2-3 minutes for the build to complete** (watch the status on Vercel)

---

### ✅ Step 5: Test the Chat (2 minutes)

**Once deployment is ✓ Ready:**

```bash
# Option A: Via cURL
curl -X POST https://yachtia.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is MYBA?"}'

# Option B: Via browser
# Go to: https://yachtia.vercel.app/chat
# Type a question and send
```

**Expected response:**
```json
{
  "answer": "MYBA stands for Mediterranean Yacht Brokers Association...",
  "conversationId": "...",
  "sources": [],
  "responseTime": 2500
}
```

✅ **If you get a response with `answer`, CHAT IS WORKING!**

---

## ❌ If Still Getting Error 500

### Check 1: Vercel Function Logs
1. Vercel Dashboard → Deployments
2. Click the latest deployment
3. Go to: **Function Logs**
4. Look for error messages
5. Common errors:
   - `Cannot find module '@supabase/supabase-js'` → env vars missing
   - `search_documents is not a function` → RPC not created
   - `Invalid Gemini API key` → GEMINI_API_KEY is wrong

### Check 2: Env Var Typo
- **Variable names are CASE-SENSITIVE**
- Make sure you copied them EXACTLY:
  - `SUPABASE_SERVICE_ROLE_KEY` (not `supabase_service_role_key`)
  - `GEMINI_API_KEY` (not `gemini_api_key`)
  - `NEXT_PUBLIC_SUPABASE_URL` (not `next_public_supabase_url`)

### Check 3: Test Locally First
```bash
cd /home/julien/Documents/iayacht/yacht-legal-ai

# Test with production settings
NODE_ENV=production npm run build
NODE_ENV=production npm run start

# In another terminal:
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

If this works locally but fails on Vercel → definitely an env var issue on Vercel.

---

## 🎉 Success Criteria

- [ ] All 4 env vars added to Vercel (all 3 environments)
- [ ] All 4 tables exist in Supabase
- [ ] RPC function `search_documents` exists
- [ ] Vercel deployment shows ✓ Ready
- [ ] `/api/chat` returns JSON (not 500 error)
- [ ] You can type in `/chat` and get responses

---

## Next: Upload Documents & Chat

### Upload Documents:
1. Go to: https://yachtia.vercel.app/documents
2. Upload a PDF (MYBA, AML, MLC, etc.)
3. Select category (e.g., "MYBA")
4. Click upload
5. Wait for embedding (30-60 seconds per PDF)

### Start Chatting:
1. Go to: https://yachtia.vercel.app/chat
2. Ask a question: "What are the MYBA requirements?"
3. System will:
   - Search your documents
   - Extract relevant chunks
   - Generate answer with Gemini
   - Show sources

---

## FAQ

**Q: Where do I find my Vercel project?**
A: https://vercel.com/dashboard → Look for `yacht-legal-ai` or `yachtia`

**Q: Which environment should I select?**
A: Select **ALL THREE**: Production, Preview, Development

**Q: Can I use the same env var values for multiple projects?**
A: No! Each Vercel project needs its own environment variables.

**Q: How long until changes take effect?**
A: 2-3 minutes after redeploy starts.

**Q: Can I test locally first?**
A: Yes! Use `.env.local` (already configured) and `npm run dev`

---

## Files for Reference

- **Setup Guide:** `VERCEL_SETUP_GUIDE.md`
- **Verification Script:** `scripts/verify_deployment.sh`
- **This Checklist:** `DEPLOYMENT_CHECKLIST.md`

---

**Status:** Configuration Guide
**Updated:** 2026-01-13
**Next Step:** Follow the 5 steps above ☝️
