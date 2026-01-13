# Deployment Guide - Yacht Legal AI Assistant

## Overview
This guide walks you through deploying the Yacht Legal AI Assistant from development to production.

---

## Prerequisites

### Required Accounts
- [x] Supabase account (database + storage)
- [x] Google Cloud account (Gemini API)
- [ ] Vercel account (recommended hosting) OR
- [ ] Alternative: Railway, Render, AWS, GCP, Azure

### Local Requirements
- Node.js 18+ (20+ recommended)
- npm or yarn or pnpm
- Git
- Code editor (VS Code recommended)

---

## Part 1: Database Setup (Supabase)

### Step 1: Verify Supabase Project
You already have:
- Project URL: `https://hmbattewtlmjbufiwuxt.supabase.co`
- Anon Key: Configured
- Service Role Key: Configured

### Step 2: Execute SQL Migrations

1. **Open Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/hmbattewtlmjbufiwuxt
   ```

2. **Navigate to SQL Editor**:
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Execute Migrations in Order**:

   **Migration 1: Enable pgvector**
   ```sql
   -- Copy contents from: database/migrations/001_enable_pgvector.sql
   CREATE EXTENSION IF NOT EXISTS vector;

   -- Verify
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```
   ✅ Should return 1 row

   **Migration 2: Create documents table**
   ```sql
   -- Copy contents from: database/migrations/002_create_documents.sql
   -- Run entire file
   ```
   ✅ Check: Table `documents` should appear in Table Editor

   **Migration 3: Create document_chunks table**
   ```sql
   -- Copy contents from: database/migrations/003_create_document_chunks.sql
   -- Run entire file
   ```
   ✅ Check: Table `document_chunks` with vector column

   **Migration 4: Create conversations table**
   ```sql
   -- Copy contents from: database/migrations/004_create_conversations.sql
   -- Run entire file
   ```

   **Migration 5: Create audit_logs table**
   ```sql
   -- Copy contents from: database/migrations/005_create_audit_logs.sql
   -- Run entire file
   ```

   **Migration 6: Create search function**
   ```sql
   -- Copy contents from: database/migrations/006_create_search_function.sql
   -- Run entire file
   ```
   ✅ Check: Function `search_documents` appears in Database → Functions

   **Migration 7: Create RLS policies**
   ```sql
   -- Copy contents from: database/migrations/007_create_rls_policies.sql
   -- Run entire file
   ```

4. **Verify All Tables Created**:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

   Expected tables:
   - audit_logs
   - conversations
   - document_chunks
   - documents

### Step 3: Configure Storage Bucket

1. **Navigate to Storage** in Supabase Dashboard

2. **Create Bucket**:
   - Name: `documents`
   - Public: `false` (private)
   - File size limit: 10MB
   - Allowed MIME types: `application/pdf`

3. **Set Bucket Policies**:
   ```sql
   -- Allow authenticated uploads
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'documents');

   -- Allow public read (or adjust as needed)
   CREATE POLICY "Allow public read"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'documents');
   ```

4. **Verify**:
   - Go to Storage → documents bucket
   - Should be empty but accessible

---

## Part 2: Local Development Setup

### Step 1: Install Dependencies

```bash
cd /home/julien/Documents/iayacht/yacht-legal-ai
npm install
```

Expected output:
- All packages installed
- Possible warnings about Node version (ignore if using Node 18)

### Step 2: Verify Environment Variables

Check `.env.local`:
```bash
cat .env.local
```

Should contain:
```env
NEXT_PUBLIC_SUPABASE_URL=https://hmbattewtlmjbufiwuxt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

**IMPORTANT**: Never commit `.env.local` to git!

### Step 3: Run Development Server

```bash
npm run dev
```

Expected output:
```
> yacht-legal-ai@0.1.0 dev
> next dev

  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.3s
```

### Step 4: Test Locally

1. **Open Browser**: http://localhost:3000
   - Should see landing page with navy/gold theme

2. **Test Chat** (http://localhost:3000/chat):
   - Type: "Hello, what can you do?"
   - Should see response (may say no documents uploaded yet)

3. **Test Upload** (http://localhost:3000/documents):
   - Select a PDF file
   - Choose category (e.g., MYBA)
   - Click upload
   - Should see success message with chunks count

4. **Test RAG** (after upload):
   - Go back to /chat
   - Ask question related to uploaded document
   - Should see answer with sources

### Step 5: Verify Database Data

```sql
-- Check documents uploaded
SELECT id, name, category, pages, created_at FROM documents;

-- Check chunks created
SELECT document_id, COUNT(*) as chunk_count
FROM document_chunks
GROUP BY document_id;

-- Check audit logs
SELECT action, document_id, created_at FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## Part 3: Production Deployment (Vercel)

### Step 1: Prepare for Deployment

1. **Verify .gitignore**:
   ```bash
   cat .gitignore | grep .env
   ```
   Should include:
   ```
   .env*.local
   .env.local
   ```

2. **Commit Code** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Yacht Legal AI MVP"
   ```

3. **Create GitHub Repository**:
   ```bash
   # On GitHub, create new repository: yacht-legal-ai
   git remote add origin https://github.com/YOUR_USERNAME/yacht-legal-ai.git
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. **Sign Up / Log In**: https://vercel.com

2. **Import Project**:
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Framework: Next.js (auto-detected)

3. **Configure Environment Variables**:
   Click "Environment Variables" and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://hmbattewtlmjbufiwuxt.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   GEMINI_API_KEY = YOUR_GEMINI_API_KEY
   ```

   **IMPORTANT**: Check all environments (Production, Preview, Development)

4. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes
   - Vercel will build and deploy

5. **Get Production URL**:
   - Example: `https://yacht-legal-ai.vercel.app`
   - Visit URL to verify

### Step 3: Post-Deployment Verification

1. **Test Landing Page**: https://your-app.vercel.app
   - Should load with luxury theme

2. **Test Chat**: https://your-app.vercel.app/chat
   - Send test query
   - Verify response

3. **Test Upload**: https://your-app.vercel.app/documents
   - Upload a PDF
   - Verify success

4. **Check Vercel Logs**:
   - Go to Vercel dashboard → Functions → Logs
   - Should see API calls (/api/chat, /api/upload-doc)

5. **Check Supabase Logs**:
   - Go to Supabase → Logs
   - Should see database queries
   - Should see new rows in documents/chunks

---

## Part 4: Production Hardening

### 1. Security Enhancements

#### Enable RLS Policies
Already created in migration 007, but verify enabled:
```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
```

#### Add Rate Limiting (Redis)
Current implementation uses in-memory rate limiting. For production:

1. **Set Up Redis** (Upstash recommended):
   ```bash
   # Sign up at https://upstash.com
   # Create Redis database
   ```

2. **Update .env.local**:
   ```env
   UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token
   ```

3. **Install Redis Client**:
   ```bash
   npm install @upstash/redis
   ```

4. **Update Rate Limiting** in `app/api/chat/route.ts`:
   ```typescript
   import { Redis } from '@upstash/redis'

   const redis = new Redis({
     url: process.env.UPSTASH_REDIS_REST_URL,
     token: process.env.UPSTASH_REDIS_REST_TOKEN
   })

   async function checkRateLimit(ip: string): Promise<boolean> {
     const key = `ratelimit:${ip}`
     const count = await redis.incr(key)
     if (count === 1) {
       await redis.expire(key, 60) // 60 seconds
     }
     return count <= 10
   }
   ```

#### Add User Authentication
1. **Enable Supabase Auth**:
   - Dashboard → Authentication → Providers
   - Enable Email/Password or OAuth (Google, GitHub)

2. **Update Components**:
   - Add login/signup pages
   - Protect routes with middleware
   - Link conversations to user_id

3. **Update API Routes**:
   ```typescript
   import { createClient } from '@/lib/supabase'

   const supabase = createClient()
   const { data: { user } } = await supabase.auth.getUser()

   if (!user) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   }
   ```

### 2. Performance Optimization

#### Enable Caching
1. **Add Redis Caching** for frequently asked questions:
   ```typescript
   const cacheKey = `chat:${hash(query)}`
   const cached = await redis.get(cacheKey)
   if (cached) return cached

   // ... RAG pipeline

   await redis.setex(cacheKey, 3600, result) // 1 hour TTL
   ```

2. **Enable Next.js ISR** for landing page:
   ```typescript
   export const revalidate = 60 // Revalidate every 60 seconds
   ```

#### Optimize Vector Search
1. **Tune IVFFlat Parameters**:
   ```sql
   -- For larger datasets (100k+ vectors)
   CREATE INDEX idx_chunk_vector ON document_chunks
   USING ivfflat (chunk_vector vector_cosine_ops)
   WITH (lists = 500); -- Increase from 100
   ```

2. **Monitor Query Performance**:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM search_documents(
     ARRAY[...]::vector(768),
     0.7,
     5,
     NULL
   );
   ```

#### Enable CDN
Vercel automatically provides CDN for static assets. For custom domains:
1. Add custom domain in Vercel settings
2. Update DNS records
3. Enable HTTPS (automatic)

### 3. Monitoring Setup

#### Sentry (Error Tracking)
1. **Sign Up**: https://sentry.io
2. **Install**:
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard -i nextjs
   ```
3. **Configure**: Follow wizard prompts

#### Supabase Analytics
- Go to Supabase → Analytics
- Monitor:
  - Database queries per second
  - Storage usage
  - API requests

#### Gemini API Usage
1. **Check Quota**: https://console.cloud.google.com
2. **Set Budget Alerts**:
   - Billing → Budgets & alerts
   - Set monthly limit (e.g., $50)

### 4. Backup Strategy

#### Database Backups
Supabase automatically backs up daily. For manual backups:
```bash
# Install Supabase CLI
npm install -g supabase

# Backup database
supabase db dump -f backup.sql
```

#### Storage Backups
```bash
# Use Supabase Storage API to download all files
# Script in utils/backup-storage.ts (create if needed)
```

---

## Part 5: Scaling Considerations

### When to Scale

**Indicators**:
- Vector search >200ms consistently
- API response times >5 seconds
- More than 10k documents uploaded
- More than 100k chunks indexed
- High concurrent users (100+)

### Scaling Options

#### 1. Database Scaling (Supabase)
- Upgrade to Pro plan ($25/month)
- Increase compute resources
- Enable connection pooling
- Consider read replicas

#### 2. Vector Index Optimization
```sql
-- For 100k-1M vectors, use HNSW instead of IVFFlat
CREATE INDEX idx_chunk_vector_hnsw ON document_chunks
USING hnsw (chunk_vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

#### 3. Embedding Generation
- Batch size increase (10 → 50)
- Parallel processing with worker threads
- Queue system (Bull/BullMQ) for async processing

#### 4. Caching Layer
- Redis for query caching
- CloudFlare for CDN
- Service Worker for offline support

#### 5. Microservices Architecture
If traffic exceeds 1M requests/month:
- Separate embedding service
- Separate search service
- Load balancer (Vercel handles this)

---

## Part 6: Maintenance Tasks

### Weekly
- [ ] Review error logs (Sentry/Vercel)
- [ ] Check Gemini API usage/costs
- [ ] Monitor vector search latency
- [ ] Review audit logs for anomalies

### Monthly
- [ ] Database cleanup (old audit logs >2 years)
- [ ] Update dependencies (`npm update`)
- [ ] Review and optimize slow queries
- [ ] Backup database manually
- [ ] Review user feedback

### Quarterly
- [ ] Security audit
- [ ] Performance testing
- [ ] Update API keys
- [ ] Review RGPD compliance
- [ ] Update documentation

---

## Part 7: Troubleshooting

### Issue: Vector search returns no results

**Symptoms**: Chat always says "no relevant information found"

**Diagnosis**:
```sql
-- Check if chunks have embeddings
SELECT COUNT(*) FROM document_chunks WHERE chunk_vector IS NOT NULL;

-- Check vector dimensions
SELECT vector_dims(chunk_vector) FROM document_chunks LIMIT 1;
-- Should return 768
```

**Fix**:
- Re-upload documents
- Verify GEMINI_API_KEY is valid
- Check embedding generation logs

### Issue: Upload fails with 500 error

**Diagnosis**:
- Check Vercel function logs
- Check Supabase logs
- Verify storage bucket exists

**Fix**:
```bash
# Check Supabase storage
supabase storage ls documents

# Re-create bucket if needed
```

### Issue: Rate limiting not working

**Symptoms**: Can send unlimited requests

**Fix**:
- Verify IP address extraction in API route
- Check if behind proxy (use X-Forwarded-For header)
- Upgrade to Redis-based rate limiting

### Issue: Slow response times

**Diagnosis**:
```sql
-- Check index usage
EXPLAIN ANALYZE
SELECT * FROM search_documents(...);
```

**Fix**:
- Rebuild vector index: `REINDEX INDEX idx_chunk_vector;`
- Tune IVFFlat parameters
- Add caching layer

---

## Part 8: Cost Estimation

### Development (Free Tier)
- Supabase: Free (500MB DB, 1GB storage)
- Vercel: Free (100GB bandwidth)
- Gemini API: Free (60 requests/minute)
- **Total**: $0/month

### Production (Moderate Usage)
Assuming:
- 1,000 users/month
- 10,000 chat queries/month
- 100 documents uploaded/month

**Costs**:
- Supabase Pro: $25/month (2GB DB, 8GB storage)
- Vercel Pro: $20/month (1TB bandwidth)
- Gemini API: ~$5/month (embeddings + chat)
- Upstash Redis: $10/month (10k commands/day)
- **Total**: ~$60/month

### Enterprise (High Volume)
- Supabase Team: $599/month
- Vercel Enterprise: Custom pricing
- Gemini API: $50-200/month
- Dedicated Redis: $50/month
- Monitoring (Sentry): $26/month
- **Total**: ~$700-1000/month

---

## Part 9: Domain & SSL Setup

### Custom Domain (Optional)

1. **Purchase Domain** (e.g., yacht-legal-ai.com):
   - Namecheap, GoDaddy, Google Domains

2. **Add to Vercel**:
   - Go to Project Settings → Domains
   - Add custom domain
   - Follow DNS configuration instructions

3. **DNS Records** (example):
   ```
   Type: A
   Name: @
   Value: 76.76.21.21 (Vercel IP)

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

4. **SSL Certificate**:
   - Vercel automatically provisions Let's Encrypt SSL
   - Wait 2-3 minutes for propagation

---

## Part 10: Rollback Procedure

### If Deployment Fails

1. **Vercel Instant Rollback**:
   - Go to Deployments tab
   - Find last working deployment
   - Click "..." → "Promote to Production"

2. **Database Rollback**:
   ```sql
   -- If migration fails, rollback
   DROP TABLE IF EXISTS <failed_table>;
   -- Re-run previous migrations
   ```

3. **Git Rollback**:
   ```bash
   git log # Find commit hash
   git revert <commit-hash>
   git push
   # Vercel auto-deploys
   ```

---

## Checklist: Deployment Complete ✅

### Pre-Deployment
- [ ] All migrations executed in Supabase
- [ ] pgvector extension enabled
- [ ] Storage bucket created
- [ ] Environment variables configured
- [ ] Local testing passed (upload + chat)
- [ ] Code committed to Git
- [ ] Repository pushed to GitHub

### Deployment
- [ ] Vercel project created
- [ ] Environment variables set in Vercel
- [ ] Deployment successful (green checkmark)
- [ ] Production URL accessible
- [ ] DNS configured (if custom domain)
- [ ] SSL certificate active

### Post-Deployment
- [ ] Test upload on production
- [ ] Test chat on production
- [ ] Verify legal disclaimers visible
- [ ] Check audit logs populated
- [ ] Rate limiting working
- [ ] Error monitoring active (Sentry)
- [ ] Analytics tracking (optional)

### Production Hardening
- [ ] Redis rate limiting implemented
- [ ] User authentication added
- [ ] Caching layer configured
- [ ] Monitoring dashboards set up
- [ ] Backup strategy defined
- [ ] Incident response plan documented

---

## Support & Resources

### Documentation
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Gemini API: https://ai.google.dev/docs
- Vercel: https://vercel.com/docs

### Community
- Next.js Discord: https://nextjs.org/discord
- Supabase Discord: https://discord.supabase.com
- Stack Overflow: Tag `nextjs`, `supabase`, `pgvector`

### Internal Documentation
- Project README: `/home/julien/Documents/iayacht/yacht-legal-ai/README.md`
- Testing Guide: `TESTING_GUIDE.md`
- Implementation Log: `tasks/yacht-legal-ai-assistant/03_implementation_log.md`

---

**Last Updated**: 2026-01-12
**Version**: 1.0 (MVP)
**Status**: Production-Ready 🚀
