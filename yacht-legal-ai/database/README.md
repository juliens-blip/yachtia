# Database Migrations

To apply migrations to your Supabase database:

## Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to "SQL Editor"
4. Copy and paste the contents of each migration file in order (001, 002, 003, etc.)
5. Execute each migration

## Option 2: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

## Migration 008: Agent Credentials

**File:** `008_create_agent_credentials.sql`

This migration creates the infrastructure for Agent API authentication:
- `agent_credentials` table: Stores hashed API keys
- `agent_api_usage` table: Tracks usage per credential
- Triggers for automatic request counting
- RLS policies for security

After applying this migration, create API keys using:
```bash
npm run agent:create-key -- --name "My Bot" --limit 5000
```
