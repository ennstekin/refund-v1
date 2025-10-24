#!/bin/bash

# Environment Variables Checker
# Validates that all required environment variables are set

set -e

echo "🔍 Checking Environment Variables"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Required environment variables
REQUIRED_VARS=(
    "NEXT_PUBLIC_GRAPH_API_URL"
    "NEXT_PUBLIC_ADMIN_URL"
    "NEXT_PUBLIC_CLIENT_ID"
    "CLIENT_SECRET"
    "NEXT_PUBLIC_DEPLOY_URL"
    "SECRET_COOKIE_PASSWORD"
    "DATABASE_URL"
)

MISSING_VARS=()
FOUND_VARS=()

# Check each variable
for VAR in "${REQUIRED_VARS[@]}"; do
    if vercel env ls 2>/dev/null | grep -q "$VAR"; then
        echo -e "${GREEN}✓${NC} $VAR is set"
        FOUND_VARS+=("$VAR")
    else
        echo -e "${RED}✗${NC} $VAR is missing"
        MISSING_VARS+=("$VAR")
    fi
done

echo ""
echo "Summary:"
echo "--------"
echo -e "Found: ${GREEN}${#FOUND_VARS[@]}${NC} / ${#REQUIRED_VARS[@]}"
echo -e "Missing: ${RED}${#MISSING_VARS[@]}${NC}"

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All required environment variables are set!${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠ Missing variables:${NC}"
    for VAR in "${MISSING_VARS[@]}"; do
        echo "  - $VAR"
    done
    echo ""
    echo "To add missing variables, run:"
    echo "  vercel env add <VARIABLE_NAME>"
    echo ""
    echo "Or set them via Vercel Dashboard:"
    echo "  https://vercel.com/dashboard → Your Project → Settings → Environment Variables"
    exit 1
fi
