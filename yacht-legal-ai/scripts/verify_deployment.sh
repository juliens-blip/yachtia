#!/bin/bash

##############################################################################
# Yacht Legal AI - Deployment Verification Script
#
# This script verifies that all components are properly configured
# for Vercel deployment.
#
# Usage: bash scripts/verify_deployment.sh
##############################################################################

set -e

echo "🔍 YACHT LEGAL AI - DEPLOYMENT VERIFICATION"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0
PASSED=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

##############################################################################
# 1. CHECK ENVIRONMENT VARIABLES (LOCAL)
##############################################################################
echo "1️⃣  CHECKING LOCAL ENVIRONMENT VARIABLES"
echo "==========================================="
echo ""

if [ -f ".env.local" ]; then
    check_pass ".env.local file exists"

    # Check each required variable
    if grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env.local; then
        check_pass "NEXT_PUBLIC_SUPABASE_URL is set"
    else
        check_fail "NEXT_PUBLIC_SUPABASE_URL is missing"
    fi

    if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local; then
        check_pass "NEXT_PUBLIC_SUPABASE_ANON_KEY is set"
    else
        check_fail "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"
    fi

    if grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env.local; then
        check_pass "SUPABASE_SERVICE_ROLE_KEY is set"
    else
        check_fail "SUPABASE_SERVICE_ROLE_KEY is missing (CRITICAL for server)"
    fi

    if grep -q "GEMINI_API_KEY=" .env.local; then
        check_pass "GEMINI_API_KEY is set"
    else
        check_fail "GEMINI_API_KEY is missing (CRITICAL)"
    fi
else
    check_fail ".env.local file not found!"
fi

echo ""

##############################################################################
# 2. CHECK NODE.JS & npm
##############################################################################
echo "2️⃣  CHECKING NODE.JS & npm"
echo "====================================="
echo ""

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    check_pass "Node.js is installed: $NODE_VERSION"
else
    check_fail "Node.js is not installed"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    check_pass "npm is installed: $NPM_VERSION"
else
    check_fail "npm is not installed"
fi

echo ""

##############################################################################
# 3. CHECK PROJECT STRUCTURE
##############################################################################
echo "3️⃣  CHECKING PROJECT STRUCTURE"
echo "====================================="
echo ""

FILES_TO_CHECK=(
    "package.json"
    "next.config.js"
    "tsconfig.json"
    "tailwind.config.js"
    "app/api/chat/route.ts"
    "app/api/upload-doc/route.ts"
    "lib/supabase.ts"
    "lib/gemini.ts"
    "lib/rag-pipeline.ts"
    "database/migrations/006_create_search_function.sql"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        check_pass "✓ $file"
    else
        check_fail "✗ $file (missing!)"
    fi
done

echo ""

##############################################################################
# 4. CHECK DEPENDENCIES
##############################################################################
echo "4️⃣  CHECKING DEPENDENCIES"
echo "====================================="
echo ""

if [ -d "node_modules" ]; then
    check_pass "node_modules directory exists"

    # Check critical dependencies
    CRITICAL_PACKAGES=(
        "@supabase/supabase-js"
        "@google/generative-ai"
        "pdf-parse"
        "next"
    )

    for pkg in "${CRITICAL_PACKAGES[@]}"; do
        if [ -d "node_modules/$pkg" ]; then
            check_pass "Package installed: $pkg"
        else
            check_fail "Package missing: $pkg (run npm install)"
        fi
    done
else
    check_fail "node_modules not found (run: npm install)"
fi

echo ""

##############################################################################
# 5. CHECK BUILD
##############################################################################
echo "5️⃣  CHECKING NEXT.JS BUILD"
echo "====================================="
echo ""

if npm run build > /tmp/build.log 2>&1; then
    check_pass "✓ Next.js build succeeds"
else
    check_fail "✗ Next.js build failed!"
    echo ""
    echo "Build errors:"
    tail -20 /tmp/build.log
fi

echo ""

##############################################################################
# 6. CHECK CONFIGURATION FILES
##############################################################################
echo "6️⃣  CHECKING CONFIGURATION FILES"
echo "====================================="
echo ""

# Check Vercel config
if [ -f "vercel.json" ]; then
    check_pass "vercel.json exists (Vercel config)"
else
    check_warn "vercel.json not found (Vercel will auto-detect)"
fi

# Check TypeScript config
if grep -q '"compilerOptions"' tsconfig.json 2>/dev/null; then
    check_pass "TypeScript config is valid"
else
    check_fail "TypeScript config is invalid"
fi

echo ""

##############################################################################
# 7. SUMMARY & NEXT STEPS
##############################################################################
echo "📊 VERIFICATION SUMMARY"
echo "====================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "📋 NEXT STEPS FOR VERCEL DEPLOYMENT:"
    echo ""
    echo "1. Go to: https://vercel.com/dashboard"
    echo "2. Select project: yacht-legal-ai (or yachtia)"
    echo "3. Go to: Settings → Environment Variables"
    echo "4. Add these 4 variables to ALL environments (Production, Preview, Development):"
    echo ""
    echo "   Name: SUPABASE_SERVICE_ROLE_KEY"
    grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | sed 's/^/   Value: /'
    echo ""
    echo "   Name: GEMINI_API_KEY"
    grep "^GEMINI_API_KEY=" .env.local | sed 's/^/   Value: /'
    echo ""
    echo "   Name: NEXT_PUBLIC_SUPABASE_URL"
    grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | sed 's/^/   Value: /'
    echo ""
    echo "   Name: NEXT_PUBLIC_SUPABASE_ANON_KEY"
    grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local | sed 's/^/   Value: /'
    echo ""
    echo "5. Save and trigger a redeploy:"
    echo "   - Option A: Click 'Redeploy' in Deployments"
    echo "   - Option B: Push a new commit (git push)"
    echo ""
    echo "6. Wait 2-3 minutes for build to complete"
    echo ""
    echo "7. Test the chat:"
    echo "   curl -X POST https://yachtia.vercel.app/api/chat \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"message\": \"What is MYBA?\"}'"
    echo ""
    echo "8. Upload documents at: https://yachtia.vercel.app/documents"
    echo ""
else
    echo -e "${RED}❌ SOME CHECKS FAILED${NC}"
    echo ""
    echo "Please fix the issues above and try again."
    echo ""
fi

echo ""
echo "📖 For detailed setup guide, see: VERCEL_SETUP_GUIDE.md"
echo ""
