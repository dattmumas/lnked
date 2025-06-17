#!/bin/bash

echo "🔧 Fixing import order errors across the codebase..."
echo ""

# Count initial import order errors
INITIAL_COUNT=$(pnpm lint 2>&1 | grep -c "import/order")
echo "📊 Initial import/order errors: $INITIAL_COUNT"
echo ""

# Fix imports in batches to avoid overwhelming the system
echo "🔄 Running ESLint auto-fix on directories..."

# Fix src/app directory
echo "  📁 Fixing src/app..."
pnpm eslint --fix "src/app/**/*.{ts,tsx}" --ext .ts,.tsx 2>/dev/null

# Fix src/components directory
echo "  📁 Fixing src/components..."
pnpm eslint --fix "src/components/**/*.{ts,tsx}" --ext .ts,.tsx 2>/dev/null

# Fix src/lib directory
echo "  📁 Fixing src/lib..."
pnpm eslint --fix "src/lib/**/*.{ts,tsx}" --ext .ts,.tsx 2>/dev/null

# Fix src/hooks directory
echo "  📁 Fixing src/hooks..."
pnpm eslint --fix "src/hooks/**/*.{ts,tsx}" --ext .ts,.tsx 2>/dev/null

# Fix src/services directory
echo "  📁 Fixing src/services..."
pnpm eslint --fix "src/services/**/*.{ts,tsx}" --ext .ts,.tsx 2>/dev/null

# Fix src/types directory
echo "  📁 Fixing src/types..."
pnpm eslint --fix "src/types/**/*.{ts,tsx}" --ext .ts,.tsx 2>/dev/null

echo ""
echo "✅ Auto-fix complete!"
echo ""

# Count remaining import order errors
FINAL_COUNT=$(pnpm lint 2>&1 | grep -c "import/order")
FIXED_COUNT=$((INITIAL_COUNT - FINAL_COUNT))

echo "📊 Results:"
echo "  - Initial import/order errors: $INITIAL_COUNT"
echo "  - Remaining import/order errors: $FINAL_COUNT"
echo "  - Fixed: $FIXED_COUNT errors"
echo ""

# Show git status
echo "📝 Modified files:"
git diff --stat --color 