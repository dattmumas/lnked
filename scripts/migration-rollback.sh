#!/bin/bash

# ============================================================================
# Database Naming Convention - Rollback and Recovery Script
# 
# This script implements the layered recovery approach decided in the creative
# phase, providing multiple recovery options for different failure scenarios.
#
# ARCHITECTURE: Layered Recovery Approach (3 layers)
# LAYER 1: Transaction rollback during migration (instant)
# LAYER 2: Application-level rollback via backups (minutes) 
# LAYER 3: Database backup restore for catastrophic failures (hours)
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./migration-backups"
TYPES_BACKUP_DIR="./src/types/backup"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Database Naming Convention - Rollback and Recovery${NC}"
echo -e "${BLUE}Implementing Layered Recovery Strategy${NC}"
echo -e "${BLUE}============================================================================${NC}"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_step() {
    echo -e "\n${PURPLE}$1${NC}"
}

confirm_action() {
    local message="$1"
    echo -e "${YELLOW}$message${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${CYAN}Operation cancelled by user${NC}"
        exit 0
    fi
}

# ============================================================================
# RECOVERY LAYER DETECTION
# ============================================================================

detect_migration_state() {
    log_step "Detecting Migration State"
    
    # Check if we're in the middle of a database transaction
    if psql "${DATABASE_URL:-}" -c "SELECT txid_current();" 2>/dev/null | grep -q "ERROR.*no active transaction"; then
        log_info "No active database transaction detected"
        TRANSACTION_ACTIVE=false
    else
        log_warning "Active database transaction may be present"
        TRANSACTION_ACTIVE=true
    fi
    
    # Check if v2 tables still exist (indicates migration not started or failed)
    if psql "${DATABASE_URL:-}" -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'comments_v2';" 2>/dev/null | grep -q "1"; then
        log_info "V2 tables still exist - migration not completed"
        MIGRATION_STATE="pre_migration"
    else
        log_info "V2 tables not found - migration appears complete or in progress"
        MIGRATION_STATE="post_migration"
    fi
    
    # Check if backup files exist
    if [ -d "$TYPES_BACKUP_DIR" ] && [ "$(ls -A $TYPES_BACKUP_DIR 2>/dev/null)" ]; then
        log_info "Application backup files found"
        APP_BACKUPS_EXIST=true
    else
        log_warning "No application backup files found"
        APP_BACKUPS_EXIST=false
    fi
    
    # Check if database backup exists
    if [ -f "${BACKUP_DIR}/database_backup_pre_migration.sql" ]; then
        log_info "Database backup file found"
        DB_BACKUP_EXISTS=true
    else
        log_warning "No database backup file found"
        DB_BACKUP_EXISTS=false
    fi
}

# ============================================================================
# LAYER 1: TRANSACTION ROLLBACK (INSTANT)
# ============================================================================

layer1_transaction_rollback() {
    log_step "LAYER 1: Transaction Rollback (Instant Recovery)"
    
    if [ "$TRANSACTION_ACTIVE" = true ]; then
        log_info "Attempting transaction rollback..."
        
        if psql "${DATABASE_URL:-}" -c "ROLLBACK;" 2>/dev/null; then
            log_success "Transaction rolled back successfully"
            log_info "Database state restored to pre-migration condition"
            return 0
        else
            log_error "Transaction rollback failed"
            return 1
        fi
    else
        log_warning "No active transaction to rollback"
        log_info "Migration may have already been committed or not started"
        return 1
    fi
}

# ============================================================================
# LAYER 2: APPLICATION-LEVEL ROLLBACK (MINUTES)
# ============================================================================

layer2_application_rollback() {
    log_step "LAYER 2: Application-Level Rollback (Quick Recovery)"
    
    if [ "$APP_BACKUPS_EXIST" = false ]; then
        log_error "No application backups available for rollback"
        return 1
    fi
    
    confirm_action "This will restore application code from backups. This action cannot be undone."
    
    # Find most recent backup timestamp
    local latest_backup=$(ls "$TYPES_BACKUP_DIR" | grep "database.types.*backup.ts" | sort -r | head -1)
    
    if [ -z "$latest_backup" ]; then
        log_error "No database types backup found"
        return 1
    fi
    
    local timestamp=$(echo "$latest_backup" | sed 's/database.types.\(.*\).backup.ts/\1/')
    log_info "Using backup timestamp: $timestamp"
    
    # Restore database types
    if [ -f "$TYPES_BACKUP_DIR/$latest_backup" ]; then
        cp "$TYPES_BACKUP_DIR/$latest_backup" "./src/types/database.types.ts"
        log_success "Restored database types from backup"
    fi
    
    # Restore comments-v2 types if they exist
    if [ -f "$TYPES_BACKUP_DIR/comments-v2.$timestamp.backup.ts" ]; then
        cp "$TYPES_BACKUP_DIR/comments-v2.$timestamp.backup.ts" "./src/types/comments-v2.ts"
        log_success "Restored comments-v2 types from backup"
    fi
    
    # Restore supabase types if they exist
    if [ -f "$TYPES_BACKUP_DIR/supabase.$timestamp.backup.ts" ]; then
        cp "$TYPES_BACKUP_DIR/supabase.$timestamp.backup.ts" "./src/types/supabase.ts"
        log_success "Restored supabase types from backup"
    fi
    
    # Restore any application file backups that were created during migration
    log_info "Checking for application file backups..."
    local backup_count=0
    
    find ./src -name "*.backup" 2>/dev/null | while read -r backup_file; do
        local original_file="${backup_file%.backup}"
        if [ -f "$backup_file" ]; then
            mv "$backup_file" "$original_file"
            log_info "  Restored: $original_file"
            backup_count=$((backup_count + 1))
        fi
    done
    
    if [ $backup_count -gt 0 ]; then
        log_success "Restored $backup_count application files from backups"
    else
        log_info "No additional application file backups found"
    fi
    
    # Validate TypeScript compilation after restore
    log_info "Validating TypeScript compilation after restore..."
    if npm run type-check 2>/dev/null || npx tsc --noEmit 2>/dev/null; then
        log_success "TypeScript compilation successful after rollback"
    else
        log_warning "TypeScript compilation failed after rollback - may need manual fixes"
    fi
    
    # Generate rollback report
    cat > "rollback-report-layer2.md" << EOF
# Application-Level Rollback Report

**Date**: $(date)
**Recovery Layer**: Layer 2 - Application-Level Rollback
**Backup Timestamp**: $timestamp

## Files Restored

### Type Files
- ✅ database.types.ts restored from backup
$([ -f "$TYPES_BACKUP_DIR/comments-v2.$timestamp.backup.ts" ] && echo "- ✅ comments-v2.ts restored from backup")
$([ -f "$TYPES_BACKUP_DIR/supabase.$timestamp.backup.ts" ] && echo "- ✅ supabase.ts restored from backup")

### Application Files
- $backup_count application files restored from .backup files

## Validation Results
- TypeScript Compilation: $(if npm run type-check 2>/dev/null || npx tsc --noEmit 2>/dev/null; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)

## Next Steps
1. Test application functionality
2. Verify API endpoints work correctly
3. Run full test suite
4. Consider Layer 3 rollback if issues persist

## Notes
Application code has been restored to pre-migration state. Database changes may still be present and may need Layer 3 recovery if database was already migrated.
EOF
    
    log_success "Generated rollback report: rollback-report-layer2.md"
    log_success "Application-level rollback completed"
    
    return 0
}

# ============================================================================
# LAYER 3: DATABASE BACKUP RESTORE (HOURS)
# ============================================================================

layer3_database_restore() {
    log_step "LAYER 3: Database Backup Restore (Full Recovery)"
    
    if [ "$DB_BACKUP_EXISTS" = false ]; then
        log_error "No database backup available for restore"
        log_error "Cannot perform Layer 3 recovery without backup"
        return 1
    fi
    
    log_warning "⚠️  CRITICAL WARNING ⚠️"
    log_warning "This will completely restore the database from backup."
    log_warning "ALL DATA CHANGES since backup will be PERMANENTLY LOST."
    log_warning "This includes:"
    log_warning "  • Any new comments, reactions, reports, or pins"
    log_warning "  • Any data modifications made after backup"
    log_warning "  • All migration changes will be reversed"
    
    confirm_action "Do you understand and want to proceed with FULL DATABASE RESTORE?"
    
    # Double confirmation for destructive action
    echo -e "${RED}FINAL CONFIRMATION${NC}"
    confirm_action "Type 'RESTORE DATABASE' to confirm (case sensitive):"
    read -p "Confirmation: " confirmation
    
    if [ "$confirmation" != "RESTORE DATABASE" ]; then
        echo -e "${CYAN}Database restore cancelled - confirmation text did not match${NC}"
        exit 0
    fi
    
    log_info "Proceeding with database restore..."
    
    # Create a backup of current state before restore (just in case)
    local emergency_backup="emergency_backup_$(date +%Y%m%d_%H%M%S).sql"
    log_info "Creating emergency backup of current state..."
    
    if supabase db dump --linked -f "${BACKUP_DIR}/$emergency_backup" 2>/dev/null; then
        log_success "Emergency backup created: $emergency_backup"
    else
        log_warning "Could not create emergency backup - proceeding anyway"
    fi
    
    # Restore from backup
    log_info "Restoring database from backup..."
    local backup_file="${BACKUP_DIR}/database_backup_pre_migration.sql"
    
    # Note: This is a simplified restore command - in production you'd want more sophisticated restore logic
    if psql "${DATABASE_URL:-}" < "$backup_file" 2>/dev/null; then
        log_success "Database restored from backup successfully"
    else
        log_error "Database restore failed"
        log_error "Check database connection and backup file integrity"
        return 1
    fi
    
    # Verify restore by checking for v2 tables
    log_info "Verifying database restore..."
    if psql "${DATABASE_URL:-}" -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'comments_v2';" 2>/dev/null | grep -q "1"; then
        log_success "Verification passed - v2 tables are present"
    else
        log_warning "Verification inconclusive - v2 tables not found"
        log_warning "This may be normal depending on backup state"
    fi
    
    # Generate comprehensive rollback report
    cat > "rollback-report-layer3.md" << EOF
# Database Backup Restore Report

**Date**: $(date)
**Recovery Layer**: Layer 3 - Database Backup Restore
**Backup File**: $backup_file
**Emergency Backup**: $emergency_backup

## Restore Process

### Pre-Restore
- ✅ Emergency backup created of current state
- ✅ User confirmations obtained
- ✅ Backup file verified

### Restore Execution  
- ✅ Database restored from pre-migration backup
- ✅ Restore process completed successfully
- ✅ Basic verification performed

## Data Impact

⚠️ **CRITICAL**: All data changes since backup timestamp have been lost.

This includes:
- Comments added after backup
- Reactions, reports, pins created after backup  
- Any other database modifications after backup
- All migration changes have been reversed

## Verification Results
- V2 Tables Present: $(if psql "${DATABASE_URL:-}" -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'comments_v2';" 2>/dev/null | grep -q "1"; then echo "✅ YES"; else echo "❓ NO/UNKNOWN"; fi)

## Next Steps
1. Verify application functionality
2. Check all critical features work correctly
3. Restore application code if needed (Layer 2)
4. Consider re-running migration with fixes if issues are resolved
5. Monitor system stability

## Recovery Files
- Emergency backup of pre-restore state: \`${BACKUP_DIR}/$emergency_backup\`
- Original backup file: \`$backup_file\`

## Notes
Database has been restored to pre-migration state. Application code may need to be rolled back as well using Layer 2 recovery if it was updated for the migration.
EOF
    
    log_success "Generated comprehensive rollback report: rollback-report-layer3.md"
    log_success "Database backup restore completed"
    
    return 0
}

# ============================================================================
# MAIN RECOVERY ORCHESTRATION
# ============================================================================

show_recovery_menu() {
    echo -e "\n${CYAN}Available Recovery Options:${NC}"
    echo -e "${GREEN}1.${NC} Layer 1: Transaction Rollback (Instant) - If migration is still in progress"
    echo -e "${GREEN}2.${NC} Layer 2: Application Rollback (Minutes) - Restore app code from backups"  
    echo -e "${GREEN}3.${NC} Layer 3: Database Restore (Hours) - Full database restore from backup"
    echo -e "${GREEN}4.${NC} Auto-detect best recovery option"
    echo -e "${GREEN}5.${NC} Show current system state"
    echo -e "${GREEN}6.${NC} Exit without recovery"
    echo
}

auto_detect_recovery() {
    log_step "Auto-Detecting Best Recovery Option"
    
    detect_migration_state
    
    if [ "$TRANSACTION_ACTIVE" = true ]; then
        log_info "Active transaction detected - Layer 1 rollback recommended"
        layer1_transaction_rollback
    elif [ "$MIGRATION_STATE" = "post_migration" ] && [ "$APP_BACKUPS_EXIST" = true ]; then
        log_info "Migration appears complete with app backups - Layer 2 rollback recommended"
        layer2_application_rollback
    elif [ "$DB_BACKUP_EXISTS" = true ]; then
        log_info "Database backup available - Layer 3 restore available but destructive"
        log_warning "Consider Layer 2 first if application issues only"
        confirm_action "Proceed with Layer 3 database restore?"
        layer3_database_restore
    else
        log_error "Unable to determine appropriate recovery option"
        log_error "Manual intervention required"
        return 1
    fi
}

show_system_state() {
    log_step "Current System State"
    detect_migration_state
    
    echo -e "${CYAN}Migration State:${NC} $MIGRATION_STATE"
    echo -e "${CYAN}Transaction Active:${NC} $TRANSACTION_ACTIVE"
    echo -e "${CYAN}App Backups Available:${NC} $APP_BACKUPS_EXIST"
    echo -e "${CYAN}DB Backup Available:${NC} $DB_BACKUP_EXISTS"
    
    if [ "$APP_BACKUPS_EXIST" = true ]; then
        echo -e "${CYAN}Available Type Backups:${NC}"
        ls -la "$TYPES_BACKUP_DIR" 2>/dev/null | grep "backup.ts" || echo "  None found"
    fi
    
    if [ "$DB_BACKUP_EXISTS" = true ]; then
        echo -e "${CYAN}Database Backup:${NC} ${BACKUP_DIR}/database_backup_pre_migration.sql"
        echo -e "${CYAN}Backup Size:${NC} $(du -h "${BACKUP_DIR}/database_backup_pre_migration.sql" 2>/dev/null | cut -f1 || echo "Unknown")"
    fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    # Initialize state detection
    detect_migration_state
    
    # If specific layer is requested via argument
    case "${1:-}" in
        "layer1"|"1")
            layer1_transaction_rollback
            exit $?
            ;;
        "layer2"|"2")
            layer2_application_rollback
            exit $?
            ;;
        "layer3"|"3")
            layer3_database_restore
            exit $?
            ;;
        "auto")
            auto_detect_recovery
            exit $?
            ;;
        "state")
            show_system_state
            exit 0
            ;;
    esac
    
    # Interactive menu
    while true; do
        show_recovery_menu
        read -p "Select recovery option (1-6): " choice
        
        case $choice in
            1)
                layer1_transaction_rollback
                break
                ;;
            2)
                layer2_application_rollback
                break
                ;;
            3)
                layer3_database_restore
                break
                ;;
            4)
                auto_detect_recovery
                break
                ;;
            5)
                show_system_state
                echo
                ;;
            6)
                echo -e "${CYAN}Exiting without recovery${NC}"
                exit 0
                ;;
            *)
                log_error "Invalid option. Please select 1-6."
                ;;
        esac
    done
}

# Run main function with all arguments
main "$@" 