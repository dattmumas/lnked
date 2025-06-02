# 🚀 PRODUCTION DEPLOYMENT CONTEXT

## 🔐 CRITICAL DATABASE MANAGEMENT INFORMATION

### Source of Truth

**ONLY AUTHORITATIVE SOURCE**: `src/lib/database.types.ts`

- ✅ Generated directly from production Supabase database
- ✅ Reflects actual current schema state
- ✅ Updated after any production schema changes

### What NOT to Trust

- ❌ **Migration files in `supabase/migrations/`** - Outdated/inaccurate
- ❌ **Any schema documentation in docs/** - May be outdated
- ❌ **Code comments about schema** - May be outdated
- ❌ **README database sections** - May be outdated

## 🛠️ DATABASE CHANGE WORKFLOW

### Current Production Process

1. **Direct Production Changes**: Make schema changes directly in production Supabase dashboard
2. **Type Regeneration**: Regenerate `database.types.ts` from production schema
3. **Code Updates**: Update application code to use new schema
4. **Deploy**: Push application changes to production

### No Migration Pipeline

- ❌ No Supabase CLI used
- ❌ No local development database
- ❌ No migration scripts executed
- ❌ No schema version control

## 📊 CURRENT SCHEMA STATE (POST-001 Context)

### Posts Table (Production Current)

```typescript
posts: {
  Row: {
    author: string | null;
    author_id: string;
    collective_id: string | null; // Single collective (exists in production)
    content: string | null;
    created_at: string;
    id: string;
    is_public: boolean;
    metadata: Json; // JSONB field (exists in production)
    post_type: Database['public']['Enums']['post_type_enum'];
    status: Database['public']['Enums']['post_status_type'];
    title: string;
    updated_at: string | null;
    // ... other fields
  }
}
```

### Required Changes for POST-001

1. **Add `post_collectives` table** (new junction table)
2. **Use existing `metadata` field** for sharing settings (no new field needed)
3. **Keep `collective_id`** for backward compatibility
4. **Add RLS policies** for new junction table

## ⚠️ IMPLEMENTATION IMPLICATIONS

### For Database Changes

- Must coordinate with production database access
- Schema changes affect live users immediately
- No rollback via migrations (manual recovery only)
- Type generation must happen after schema changes

### For Development

- Always check `database.types.ts` for current schema
- Don't rely on migration files for schema understanding
- Test against production schema state
- Coordinate database changes with deployments

## 🔄 MEMORY BANK UPDATE PROTOCOL

### When Database Schema Changes

1. **Update `memory-bank/techContext.md`** with new schema info
2. **Update `memory-bank/productionContext.md`** (this file) with changes
3. **Update relevant task documentation** with schema changes
4. **Regenerate types** after production changes
5. **Update implementation code** to match new schema

### Schema Documentation Priority

1. `src/lib/database.types.ts` (AUTHORITATIVE)
2. `memory-bank/techContext.md` (summary)
3. `memory-bank/productionContext.md` (process)
4. Task-specific documentation (implementation context)

## 🚨 CRITICAL REMINDERS

- **Never assume migration files are current**
- **Always verify schema against database.types.ts**
- **Coordinate schema changes with production access**
- **Update types immediately after schema changes**
- **Test against actual production schema state**

---

**Last Updated**: 2025-01-06  
**Context**: POST-001 Post Creation Architecture Redesign  
**Schema State**: Pre-junction table implementation
