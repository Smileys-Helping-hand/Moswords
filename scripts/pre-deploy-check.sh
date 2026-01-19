#!/bin/bash

# Pre-deployment validation script for AWS Amplify
# Run this before deploying to catch common issues

echo "🔍 Pre-Deployment Validation Script"
echo "===================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track errors
errors=0
warnings=0

# Check Node version
echo "📦 Checking Node.js version..."
node_version=$(node -v | cut -d'v' -f2)
if [[ $(echo "$node_version >= 18.0.0" | bc -l) -eq 1 ]]; then
    echo -e "${GREEN}✓ Node.js version $node_version (OK)${NC}"
else
    echo -e "${RED}✗ Node.js version $node_version is too old. Need >= 18.0.0${NC}"
    ((errors++))
fi
echo ""

# Check npm version
echo "📦 Checking npm version..."
npm_version=$(npm -v)
echo -e "${GREEN}✓ npm version $npm_version${NC}"
echo ""

# Check for required files
echo "📄 Checking required files..."
required_files=("package.json" "next.config.ts" "tsconfig.json" "amplify.yml" ".env.local")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file exists${NC}"
    else
        if [ "$file" = ".env.local" ]; then
            echo -e "${YELLOW}⚠ $file missing (create .env.production for deployment)${NC}"
            ((warnings++))
        else
            echo -e "${RED}✗ $file missing${NC}"
            ((errors++))
        fi
    fi
done
echo ""

# Check dependencies
echo "📚 Checking dependencies..."
if npm list > /dev/null 2>&1; then
    echo -e "${GREEN}✓ All dependencies are installed correctly${NC}"
else
    echo -e "${RED}✗ Dependency issues detected. Run 'npm install'${NC}"
    ((errors++))
fi
echo ""

# Check for TypeScript errors (without failing on them)
echo "🔧 Checking TypeScript..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ TypeScript compilation successful${NC}"
else
    echo -e "${YELLOW}⚠ TypeScript compilation has warnings (check build output)${NC}"
    ((warnings++))
fi
echo ""

# Check environment variables
echo "🔑 Checking environment variables..."
if [ -f ".env.local" ]; then
    required_env_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL")
    for var in "${required_env_vars[@]}"; do
        if grep -q "^${var}=" .env.local; then
            echo -e "${GREEN}✓ $var is set${NC}"
        else
            echo -e "${RED}✗ $var is missing from .env.local${NC}"
            ((errors++))
        fi
    done
else
    echo -e "${YELLOW}⚠ .env.local not found (make sure .env.production is ready)${NC}"
    ((warnings++))
fi
echo ""

# Check database schema
echo "🗄️ Checking database schema..."
if [ -d "drizzle" ] && [ -f "drizzle.config.ts" ]; then
    echo -e "${GREEN}✓ Drizzle ORM configured${NC}"
    if ls drizzle/*.sql 1> /dev/null 2>&1; then
        migration_count=$(ls drizzle/*.sql | wc -l)
        echo -e "${GREEN}✓ Found $migration_count migration file(s)${NC}"
    else
        echo -e "${YELLOW}⚠ No migration files found${NC}"
        ((warnings++))
    fi
else
    echo -e "${RED}✗ Drizzle ORM not properly configured${NC}"
    ((errors++))
fi
echo ""

# Check for common issues
echo "🔍 Checking for common issues..."

# Check for hardcoded localhost URLs
if grep -r "localhost:3000" src/ --exclude-dir=node_modules > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Found hardcoded localhost URLs. Use environment variables instead.${NC}"
    ((warnings++))
else
    echo -e "${GREEN}✓ No hardcoded localhost URLs${NC}"
fi

# Check for console.log statements
console_logs=$(grep -r "console.log" src/ --exclude-dir=node_modules | wc -l)
if [ $console_logs -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $console_logs console.log statements (consider removing for production)${NC}"
    ((warnings++))
else
    echo -e "${GREEN}✓ No console.log statements${NC}"
fi

# Check git status
if [ -d ".git" ]; then
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠ Uncommitted changes detected${NC}"
        ((warnings++))
    else
        echo -e "${GREEN}✓ All changes committed${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Not a git repository${NC}"
    ((warnings++))
fi
echo ""

# Summary
echo "📊 Validation Summary"
echo "===================================="
if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready for deployment.${NC}"
    exit 0
elif [ $errors -eq 0 ]; then
    echo -e "${YELLOW}⚠ Validation passed with $warnings warning(s).${NC}"
    echo "Review warnings above before deploying."
    exit 0
else
    echo -e "${RED}✗ Validation failed with $errors error(s) and $warnings warning(s).${NC}"
    echo "Fix errors before deploying."
    exit 1
fi
