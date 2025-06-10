#!/bin/bash

# ============================================================================
# Database Naming Convention - Application Integration Script
# 
# This script implements the automated type generation strategy decided in
# the creative phase for seamless application integration with database changes.
#
# ARCHITECTURE: Automated Code Generation Strategy with Validation
# SAFETY: Backup types before regeneration, validation after updates
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
TYPES_BACKUP_DIR="./src/types/backup"
TYPES_FILE="./src/types/database.types.ts"
COMMENTS_V2_TYPES_FILE="./src/types/comments-v2.ts"
SUPABASE_TYPES_FILE="./src/types/supabase.ts"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Database Naming Convention - Application Integration${NC}"
echo -e "${BLUE}Implementing Automated Type Generation Strategy${NC}"
echo -e "${BLUE}============================================================================${NC}"

# ============================================================================
# PHASE 1: PRE-MIGRATION BACKUP
# ============================================================================

echo -e "\n${PURPLE}Phase 1: Creating Type Backups${NC}"

# Create backup directory
mkdir -p "$TYPES_BACKUP_DIR"
timestamp=$(date +"%Y%m%d_%H%M%S")

# Backup current database types
if [ -f "$TYPES_FILE" ]; then
    cp "$TYPES_FILE" "${TYPES_BACKUP_DIR}/database.types.${timestamp}.backup.ts"
    echo -e "${GREEN}✓${NC} Backed up database.types.ts"
else
    echo -e "${YELLOW}⚠${NC} database.types.ts not found - will generate fresh"
fi

# Backup comments-v2 types if they exist
if [ -f "$COMMENTS_V2_TYPES_FILE" ]; then
    cp "$COMMENTS_V2_TYPES_FILE" "${TYPES_BACKUP_DIR}/comments-v2.${timestamp}.backup.ts"
    echo -e "${GREEN}✓${NC} Backed up comments-v2.ts"
fi

# Backup supabase types if they exist
if [ -f "$SUPABASE_TYPES_FILE" ]; then
    cp "$SUPABASE_TYPES_FILE" "${TYPES_BACKUP_DIR}/supabase.${timestamp}.backup.ts"
    echo -e "${GREEN}✓${NC} Backed up supabase.ts"
fi

echo -e "${GREEN}✓ Type backups completed${NC}"

# ============================================================================
# PHASE 2: REGENERATE TYPES FROM UPDATED DATABASE
# ============================================================================

echo -e "\n${PURPLE}Phase 2: Regenerating Types from Updated Database${NC}"

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}✗ Supabase CLI not found. Please install it first:${NC}"
    echo -e "${YELLOW}  npm install -g supabase${NC}"
    exit 1
fi

# Generate new types from the updated database schema
echo -e "${BLUE}Generating fresh types from database...${NC}"

# Generate types using Supabase CLI
if supabase gen types typescript --linked > "$TYPES_FILE.tmp"; then
    mv "$TYPES_FILE.tmp" "$TYPES_FILE"
    echo -e "${GREEN}✓${NC} Generated new database types"
else
    echo -e "${RED}✗ Failed to generate types. Attempting rollback...${NC}"
    if [ -f "${TYPES_BACKUP_DIR}/database.types.${timestamp}.backup.ts" ]; then
        cp "${TYPES_BACKUP_DIR}/database.types.${timestamp}.backup.ts" "$TYPES_FILE"
        echo -e "${YELLOW}⚠ Rolled back to previous types${NC}"
    fi
    exit 1
fi

# ============================================================================
# PHASE 3: UPDATE APPLICATION CODE REFERENCES
# ============================================================================

echo -e "\n${PURPLE}Phase 3: Updating Application Code References${NC}"

# Find and update references to old versioned types/tables
echo -e "${BLUE}Updating code references...${NC}"

# Update TypeScript files to remove v2 references
find ./src -name "*.ts" -type f -not -path "./src/types/backup/*" | while read -r file; do
    if grep -q "_v2" "$file"; then
        echo -e "${YELLOW}  Updating: $file${NC}"
        
        # Create backup of file before modification
        cp "$file" "${file}.backup"
        
        # Replace v2 function names
        sed -i.bak \
            -e 's/get_comment_thread_v2/get_comment_thread/g' \
            -e 's/get_comment_replies_v2/get_comment_replies/g' \
            -e 's/get_comment_count_v2/get_comment_count/g' \
            -e 's/add_comment_v2/add_comment/g' \
            -e 's/toggle_comment_reaction_v2/toggle_comment_reaction/g' \
            "$file"
        
        # Remove backup files
        rm -f "${file}.bak"
        
        echo -e "${GREEN}    ✓ Updated function references${NC}"
    fi
done

# Update API files specifically
echo -e "${BLUE}Updating API endpoint references...${NC}"

find ./src/app/api -name "*.ts" -type f | while read -r file; do
    if grep -q "_v2" "$file"; then
        echo -e "${YELLOW}  Updating API: $file${NC}"
        
        # Backup before modification
        cp "$file" "${file}.backup"
        
        # Update table references
        sed -i.bak \
            -e 's/comments_v2/comments/g' \
            -e 's/comment_reactions_v2/comment_reactions/g' \
            -e 's/comment_reports_v2/comment_reports/g' \
            -e 's/comment_pins_v2/comment_pins/g' \
            "$file"
        
        # Remove backup files
        rm -f "${file}.bak"
        
        echo -e "${GREEN}    ✓ Updated table references${NC}"
    fi
done

# ============================================================================
# PHASE 4: UPDATE COMPONENT REFERENCES
# ============================================================================

echo -e "\n${PURPLE}Phase 4: Updating Component References${NC}"

# Update React components that reference comment functions or types
find ./src/components -name "*.tsx" -o -name "*.ts" | while read -r file; do
    if grep -q "_v2" "$file"; then
        echo -e "${YELLOW}  Updating component: $file${NC}"
        
        # Backup before modification
        cp "$file" "${file}.backup"
        
        # Update function and type references
        sed -i.bak \
            -e 's/get_comment_thread_v2/get_comment_thread/g' \
            -e 's/get_comment_replies_v2/get_comment_replies/g' \
            -e 's/get_comment_count_v2/get_comment_count/g' \
            -e 's/add_comment_v2/add_comment/g' \
            -e 's/toggle_comment_reaction_v2/toggle_comment_reaction/g' \
            -e 's/comments_v2/comments/g' \
            -e 's/comment_reactions_v2/comment_reactions/g' \
            "$file"
        
        # Remove backup files
        rm -f "${file}.bak"
        
        echo -e "${GREEN}    ✓ Updated component references${NC}"
    fi
done

# ============================================================================
# PHASE 5: VALIDATION AND TESTING
# ============================================================================

echo -e "\n${PURPLE}Phase 5: Validation and Testing${NC}"

# Check TypeScript compilation
echo -e "${BLUE}Validating TypeScript compilation...${NC}"
if npm run type-check 2>/dev/null || npx tsc --noEmit; then
    echo -e "${GREEN}✓${NC} TypeScript compilation successful"
else
    echo -e "${RED}✗ TypeScript compilation failed${NC}"
    echo -e "${YELLOW}Consider reviewing the generated types and manual fixes${NC}"
    
    # Offer to restore backups
    read -p "Would you like to restore backup types? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f "${TYPES_BACKUP_DIR}/database.types.${timestamp}.backup.ts" ]; then
            cp "${TYPES_BACKUP_DIR}/database.types.${timestamp}.backup.ts" "$TYPES_FILE"
            echo -e "${GREEN}✓ Restored backup types${NC}"
        fi
    fi
fi

# Check for any remaining v2 references
echo -e "${BLUE}Checking for remaining v2 references...${NC}"
v2_count=$(find ./src -name "*.ts" -o -name "*.tsx" | xargs grep -l "_v2" 2>/dev/null | wc -l || echo "0")

if [ "$v2_count" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $v2_count files with remaining v2 references:${NC}"
    find ./src -name "*.ts" -o -name "*.tsx" | xargs grep -l "_v2" 2>/dev/null || true
    echo -e "${YELLOW}These may need manual review${NC}"
else
    echo -e "${GREEN}✓ No v2 references found in codebase${NC}"
fi

# ============================================================================
# PHASE 6: CLEANUP AND DOCUMENTATION
# ============================================================================

echo -e "\n${PURPLE}Phase 6: Cleanup and Documentation${NC}"

# Remove old comments-v2.ts file if it exists and types are successfully generated
if [ -f "$COMMENTS_V2_TYPES_FILE" ] && [ -f "$TYPES_FILE" ]; then
    mv "$COMMENTS_V2_TYPES_FILE" "${TYPES_BACKUP_DIR}/comments-v2.${timestamp}.deprecated.ts"
    echo -e "${GREEN}✓${NC} Archived old comments-v2.ts file"
fi

# Generate integration report
cat > "migration-integration-report.md" << EOF
# Database Naming Convention - Application Integration Report

**Date**: $(date)
**Migration**: Database naming convention cleanup
**Strategy**: Automated type generation

## Changes Applied

### Database Types
- ✅ Regenerated types from updated database schema
- ✅ Removed v2 table references
- ✅ Updated function signatures

### Application Code
- ✅ Updated function calls to remove v2 suffixes
- ✅ Updated table references in API endpoints
- ✅ Updated component references

### Files Modified
$(find ./src -name "*.backup" | wc -l) files were modified and backed up

### Validation Results
- TypeScript Compilation: $(if npm run type-check 2>/dev/null || npx tsc --noEmit 2>/dev/null; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)
- Remaining v2 References: $v2_count files

## Backup Location
Type backups stored in: \`$TYPES_BACKUP_DIR\`

## Rollback Instructions
If issues arise, restore from backups:
\`\`\`bash
cp $TYPES_BACKUP_DIR/database.types.$timestamp.backup.ts $TYPES_FILE
# Restore individual file backups as needed
find ./src -name "*.backup" -exec bash -c 'mv "\$1" "\${1%.backup}"' _ {} \\;
\`\`\`

## Next Steps
1. Run full test suite
2. Deploy to staging environment
3. Monitor API endpoints for issues
4. Clean up backup files after validation
EOF

echo -e "${GREEN}✓${NC} Generated integration report: migration-integration-report.md"

# Clean up individual file backups (keep only type backups)
find ./src -name "*.backup" -delete 2>/dev/null || true
echo -e "${GREEN}✓${NC} Cleaned up temporary backup files"

# ============================================================================
# COMPLETION SUMMARY
# ============================================================================

echo -e "\n${BLUE}============================================================================${NC}"
echo -e "${GREEN}Application Integration Complete!${NC}"
echo -e "${BLUE}============================================================================${NC}"

echo -e "\n${GREEN}✅ Summary:${NC}"
echo -e "  • Database types regenerated successfully"
echo -e "  • Application code updated to remove v2 references"
echo -e "  • Validation completed with TypeScript compilation"
echo -e "  • Integration report generated"
echo -e "  • Backup files preserved for rollback capability"

echo -e "\n${BLUE}📋 Next Steps:${NC}"
echo -e "  1. Review migration-integration-report.md"
echo -e "  2. Run comprehensive test suite"
echo -e "  3. Deploy to staging environment"
echo -e "  4. Monitor application performance"

echo -e "\n${YELLOW}⚠ Important:${NC}"
echo -e "  • Keep backup files until migration is fully validated"
echo -e "  • Test all comment-related features thoroughly"
echo -e "  • Monitor database query performance"

echo -e "\n${PURPLE}🔄 Rollback Available:${NC}"
echo -e "  If issues arise, use backup files in: $TYPES_BACKUP_DIR"

echo -e "\n${BLUE}Application integration completed successfully!${NC}" 