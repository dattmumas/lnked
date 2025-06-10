# Database Naming Convention Cleanup Plan

## Overview

This document outlines the naming convention issues found in the database schema and provides a comprehensive cleanup plan to standardize table names, remove versioned tables, and improve overall consistency.

## Issues Identified

### 1. Versioned Tables (Major Issue)

**Problem**: Multiple tables have `_v2` suffixes indicating they are newer versions of existing tables, but both versions exist simultaneously.

**Affected Tables**:

- `comments` vs `comments_v2`
- `comment_reactions` vs `comment_reactions_v2`
- `comment_reports_v2` (no base version)
- `comment_pins_v2` (no base version)

**Impact**:

- Confusing for developers
- Potential data inconsistency
- Maintenance overhead
- Unclear which table is the "source of truth"

### 2. Inconsistent Naming Patterns

**Problem**: Similar functionality uses different naming conventions across tables.

**Examples**:

- `post_reactions` vs `comment_reactions` (should be consistent)
- `post_bookmarks` vs `chain_bookmarks` (inconsistent entity prefixing)
- Mixed use of entity prefixes vs generic names

### 3. Function Naming Issues

**Problem**: Functions have `_v2` suffixes that should be removed.

**Affected Functions**:

- `get_comment_thread_v2()` → `get_comment_thread()`
- `get_comment_replies_v2()` → `get_comment_replies()`
- `get_comment_count_v2()` → `get_comment_count()`
- `add_comment_v2()` → `add_comment()`
- `toggle_comment_reaction_v2()` → `toggle_comment_reaction()`

### 4. Index Naming Inconsistencies

**Problem**: Indexes use inconsistent naming patterns and include version suffixes.

**Examples**:

- `idx_comments_v2_entity_created` → `idx_comments_entity_created`
- `idx_likes_post_id` vs `idx_reactions_post_id` (after table rename)

### 5. Trigger and Constraint Naming

**Problem**: Triggers and constraints reference old table names and have version suffixes.

## Proposed Solution

### Phase 1: Table Consolidation

1. **Drop legacy tables**: Remove old `comments` and `comment_reactions` tables
2. **Rename v2 tables**: Remove `_v2` suffix from all tables
3. **Standardize naming**: Ensure consistent patterns across similar functionality

### Phase 2: Function Cleanup

1. **Remove version suffixes**: Drop `_v2` from all function names
2. **Update function bodies**: Reference new table names
3. **Maintain API compatibility**: Ensure existing application code continues to work

### Phase 3: Infrastructure Updates

1. **Rename indexes**: Remove version suffixes and standardize naming
2. **Update triggers**: Reference new table and function names
3. **Fix constraints**: Update foreign key and check constraint names

### Phase 4: Standardization

1. **Consistent entity naming**: Decide on prefixed vs generic table names
2. **Update RLS policies**: Reference new table names
3. **Documentation**: Update table and column comments

## Recommended Naming Conventions

### Tables

- Use singular nouns: `comment` not `comments`
- Avoid version suffixes: `comment` not `comment_v2`
- Use descriptive names: `comment_reaction` not `reaction`
- Be consistent with entity prefixes

### Functions

- Use verb_noun pattern: `get_comment_thread`
- Avoid version suffixes
- Use snake_case consistently

### Indexes

- Pattern: `idx_{table}_{columns}_{type}`
- Example: `idx_comments_entity_created`
- Avoid abbreviations where possible

### Constraints

- Foreign keys: `{table}_{column}_fkey`
- Check constraints: `{table}_{column}_check`
- Unique constraints: `{table}_{columns}_unique`

## Migration Strategy

### Step 1: Preparation

1. **Backup database**: Full backup before any changes
2. **Application audit**: Identify all code references to affected tables/functions
3. **Test environment**: Run migration on staging first

### Step 2: Application Updates

1. **Update TypeScript types**: Modify database type definitions
2. **Update queries**: Change table and function references
3. **Update API endpoints**: Ensure compatibility

### Step 3: Database Migration

1. **Run cleanup script**: Execute the comprehensive migration
2. **Verify data integrity**: Ensure no data loss
3. **Test functionality**: Verify all features work correctly

### Step 4: Cleanup

1. **Remove old migration files**: Clean up obsolete migration scripts
2. **Update documentation**: Reflect new naming conventions
3. **Code review**: Ensure all references are updated

## Benefits of Cleanup

### Developer Experience

- **Clarity**: Clear, consistent naming reduces confusion
- **Maintainability**: Easier to understand and modify code
- **Onboarding**: New developers can understand schema faster

### System Performance

- **Reduced complexity**: Fewer tables and functions to maintain
- **Better indexing**: Consistent index naming improves query optimization
- **Cleaner metadata**: Simplified system catalogs

### Data Integrity

- **Single source of truth**: No confusion about which table to use
- **Consistent constraints**: Standardized validation rules
- **Better relationships**: Clear foreign key relationships

## Risk Assessment

### Low Risk

- Function renames (with proper application updates)
- Index renames (transparent to applications)
- Comment and documentation updates

### Medium Risk

- Table renames (requires application code changes)
- Trigger updates (could affect data consistency if not done atomically)

### High Risk

- Dropping legacy tables (potential data loss if not properly migrated)
- RLS policy updates (could affect security if misconfigured)

## Rollback Plan

### Immediate Rollback

1. **Restore from backup**: If major issues occur
2. **Revert application code**: Roll back to previous version
3. **Monitor systems**: Ensure stability after rollback

### Partial Rollback

1. **Recreate specific tables**: If only certain changes cause issues
2. **Restore specific functions**: Rollback individual components
3. **Gradual migration**: Implement changes in smaller batches

## Timeline

### Week 1: Preparation

- Database backup
- Application code audit
- Test environment setup

### Week 2: Application Updates

- Update TypeScript types
- Modify queries and API calls
- Test in staging environment

### Week 3: Migration

- Execute database cleanup script
- Verify data integrity
- Deploy application updates

### Week 4: Validation

- Monitor system performance
- Fix any issues discovered
- Update documentation

## Success Criteria

1. **No data loss**: All existing data preserved and accessible
2. **Functional parity**: All features work as before
3. **Performance maintained**: No degradation in query performance
4. **Clean schema**: No versioned tables or functions remain
5. **Consistent naming**: All tables, functions, and indexes follow conventions

## Conclusion

This cleanup will significantly improve the database schema's maintainability and developer experience. While it requires careful planning and execution, the long-term benefits of having a clean, consistent naming convention far outweigh the short-term migration effort.

The provided migration script (`database_cleanup_migration.sql`) implements all the necessary changes in a single transaction, ensuring atomicity and data consistency throughout the process.
