#!/bin/bash

# Vercel Deployment Setup Script
# This script helps you set up and deploy your ikas refund app to Vercel

set -e

echo "🚀 ikas Refund App - Vercel Deployment Setup"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI is not installed${NC}"
    echo "Install it with: npm i -g vercel"
    exit 1
fi

echo -e "${GREEN}✓ Vercel CLI is installed${NC}"
echo ""

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠ You need to log in to Vercel${NC}"
    echo "Running: vercel login"
    vercel login
else
    echo -e "${GREEN}✓ Logged in to Vercel as: $(vercel whoami)${NC}"
fi

echo ""
echo "📋 Step 1: Linking your project to Vercel..."
echo "--------------------------------------------"

# Link project if not already linked
if [ ! -f ".vercel/project.json" ]; then
    echo "This will link your local project to Vercel."
    vercel link
else
    echo -e "${GREEN}✓ Project already linked to Vercel${NC}"
fi

echo ""
echo "📋 Step 2: Environment Variables"
echo "---------------------------------"
echo ""
echo "Required environment variables:"
echo "  - NEXT_PUBLIC_GRAPH_API_URL"
echo "  - NEXT_PUBLIC_ADMIN_URL"
echo "  - NEXT_PUBLIC_CLIENT_ID"
echo "  - CLIENT_SECRET"
echo "  - NEXT_PUBLIC_DEPLOY_URL"
echo "  - SECRET_COOKIE_PASSWORD"
echo "  - DATABASE_URL"
echo ""
echo "You have two options:"
echo "  1. Set them manually via Vercel Dashboard"
echo "  2. Use 'vercel env' command to add them"
echo ""
read -p "Do you want to add environment variables now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Opening Vercel Dashboard for environment variables..."
    echo "Navigate to: Settings > Environment Variables"

    # Get project info
    PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*"' | cut -d'"' -f4)

    if [ ! -z "$PROJECT_ID" ]; then
        echo ""
        echo "Or run these commands to add env vars via CLI:"
        echo ""
        echo "vercel env add NEXT_PUBLIC_GRAPH_API_URL"
        echo "vercel env add NEXT_PUBLIC_ADMIN_URL"
        echo "vercel env add NEXT_PUBLIC_CLIENT_ID"
        echo "vercel env add CLIENT_SECRET"
        echo "vercel env add NEXT_PUBLIC_DEPLOY_URL"
        echo "vercel env add SECRET_COOKIE_PASSWORD"
        echo "vercel env add DATABASE_URL"
    fi
fi

echo ""
echo "📋 Step 3: Database Setup (Vercel Postgres)"
echo "-------------------------------------------"
echo ""
echo "To create a Vercel Postgres database:"
echo "  1. Go to: https://vercel.com/dashboard"
echo "  2. Select your project"
echo "  3. Go to 'Storage' tab"
echo "  4. Click 'Create Database' > 'Postgres'"
echo "  5. DATABASE_URL will be automatically added to your env vars"
echo ""
read -p "Press enter when database is created..."

echo ""
echo "📋 Step 4: Deploy to Vercel"
echo "---------------------------"
echo ""
read -p "Ready to deploy? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Deploying to Vercel..."
    vercel --prod

    echo ""
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Update NEXT_PUBLIC_DEPLOY_URL with your Vercel URL"
    echo "  2. Redeploy: vercel --prod"
    echo "  3. Run database migrations: npx prisma migrate deploy"
    echo "  4. Update ikas Developer Portal with your callback URL"
else
    echo ""
    echo "Skipping deployment. You can deploy later with: vercel --prod"
fi

echo ""
echo "📖 For detailed instructions, see: VERCEL_DEPLOY.md"
echo ""
echo -e "${GREEN}✅ Setup script completed!${NC}"
