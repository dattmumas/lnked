# 📊 TECHNICAL CONTEXT

## 🏗️ INFRASTRUCTURE & DEPLOYMENT

### Database Management

**CRITICAL**: Database schema source of truth is `src/lib/database.types.ts`

- ❌ **No Supabase CLI migrations used**
- ❌ **Migration files in `supabase/migrations/` are NOT current state**
- ✅ **`database.types.ts` is the ONLY accurate representation of current schema**
- ✅ **All database changes pushed directly to production**
- ✅ **All database changes pushed directly via the SQL Editor - SQL code should be provided as a step to the user with instructions to add to Supabase in the browser**

### Deployment Workflow

- Direct production deployments (no migration pipeline)
- Schema changes applied directly to production database
- TypeScript types generated from live production schema
- No local development database migrations

### Schema Change Process

1. Make changes directly in production database
2. Regenerate `database.types.ts` from production schema
3. Update application code to use new schema
4. Deploy application changes

## 💻 TECHNOLOGY STACK

- **Framework**: Next.js 15.3.2
- **Language**: TypeScript 5.8.3
- **Database**: Supabase PostgreSQL (production-managed)
- **UI Library**: Shadcn/UI + Radix UI
- **Styling**: Tailwind CSS
- **State Management**: Zustand + React Query
- **Authentication**: Supabase Auth

## 🔐 CURRENT DATABASE SCHEMA (from database.types.ts)

### Posts Table (Current State)

```typescript
posts: {
  Row: {
    author: string | null;
    author_id: string;
    collective_id: string | null; // Single collective association (to be replaced)
    content: string | null;
    created_at: string;
    id: string;
    is_public: boolean;
    metadata: Json; // Already exists for extensibility
    post_type: Database['public']['Enums']['post_type_enum'];
    status: Database['public']['Enums']['post_status_type'];
    title: string;
    // ... other fields
  }
}
```

### Required Schema Changes for POST-001

1. **Add `post_collectives` junction table** (many-to-many relationship)
2. **Add `sharing_settings` field to posts** (or use existing `metadata`)
3. **Update RLS policies** for new junction table
4. **Maintain `collective_id` temporarily** for backward compatibility

## 🛠️ DEVELOPMENT TOOLS

- **Code Editor**: Cursor with integrated AI
- **Package Manager**: pnpm
- **Database Client**: Supabase JavaScript client
- **Type Safety**: Full TypeScript integration with generated database types
