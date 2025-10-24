#!/bin/bash

# Quick Deploy Script
# Builds, tests, and deploys to Vercel

set -e

echo "🚀 Deploying to Vercel"
echo "======================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Vercel${NC}"
    echo "Run: vercel login"
    exit 1
fi

echo -e "${GREEN}✓${NC} Logged in as: $(vercel whoami)"
echo ""

# Step 1: Check uncommitted changes
echo "📋 Step 1: Checking git status..."
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠ You have uncommitted changes${NC}"
    read -p "Do you want to commit them now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add -A
        read -p "Commit message: " COMMIT_MSG
        git commit -m "$COMMIT_MSG

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
        git push origin main
    fi
else
    echo -e "${GREEN}✓${NC} Working directory clean"
fi

echo ""

# Step 2: Local build test
echo "📋 Step 2: Running local build test..."
if pnpm build > /tmp/build.log 2>&1; then
    echo -e "${GREEN}✓${NC} Local build successful"
else
    echo -e "${RED}✗${NC} Local build failed"
    echo "Check logs: /tmp/build.log"
    tail -50 /tmp/build.log
    exit 1
fi

echo ""

# Step 3: Deploy
echo "📋 Step 3: Deploying to Vercel..."
echo ""

DEPLOY_OUTPUT=$(vercel --prod 2>&1)
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^ ]*' | tail -1)

if [ ! -z "$DEPLOY_URL" ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "🌍 URL: $DEPLOY_URL"
    echo ""

    # Check if NEXT_PUBLIC_DEPLOY_URL matches
    CURRENT_DEPLOY_URL=$(vercel env ls 2>/dev/null | grep "NEXT_PUBLIC_DEPLOY_URL" | awk '{print $2}' || echo "")

    if [ "$CURRENT_DEPLOY_URL" != "$DEPLOY_URL" ]; then
        echo -e "${YELLOW}⚠ NEXT_PUBLIC_DEPLOY_URL doesn't match deployment URL${NC}"
        echo "Current: $CURRENT_DEPLOY_URL"
        echo "Actual:  $DEPLOY_URL"
        echo ""
        read -p "Update NEXT_PUBLIC_DEPLOY_URL? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            vercel env rm NEXT_PUBLIC_DEPLOY_URL production -y || true
            echo "$DEPLOY_URL" | vercel env add NEXT_PUBLIC_DEPLOY_URL production
            echo ""
            echo -e "${YELLOW}Redeploying with updated URL...${NC}"
            vercel --prod
        fi
    fi

    echo ""
    echo "Next steps:"
    echo "  1. Test your deployment: $DEPLOY_URL"
    echo "  2. Update ikas Developer Portal with callback URL"
    echo "  3. Run database migrations if needed"
else
    echo -e "${RED}✗${NC} Deployment failed"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Done!${NC}"
