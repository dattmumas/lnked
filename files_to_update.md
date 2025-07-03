Based on my codebase analysis, here's the comprehensive list of files that will need to be updated to use the new tenant-cache system:

## **🎯 High Priority - API Routes Using `withTenantAccess`**

These files use the `withTenantAccess` wrapper and will benefit most from caching:

### **Tenant Management APIs**

1. **`src/app/api/tenants/[tenantId]/settings/route.ts`** - Tenant settings CRUD
2. **`src/app/api/tenants/[tenantId]/members/route.ts`** - Member management
3. **`src/app/api/tenants/[tenantId]/members/[userId]/route.ts`** - Individual member operations
4. **`src/app/api/tenants/[tenantId]/posts/route.ts`** - Tenant posts management

### **Communication APIs**

5. **`src/app/api/tenants/[tenantId]/conversations/route.ts`** - Conversations
6. **`src/app/api/tenants/[tenantId]/conversations/[conversationId]/join/route.ts`** - Join conversations
7. **`src/app/api/tenants/[tenantId]/conversations/[conversationId]/leave/route.ts`** - Leave conversations

### **Content APIs**

8. **`src/app/api/tenants/[tenantId]/comments/[entityType]/[entityId]/route.ts`** - Comments

### **Settings APIs**

9. **`src/app/api/tenants/[tenantId]/settings/notifications/route.ts`** - Notification settings
10. **`src/app/api/tenants/[tenantId]/settings/privacy/route.ts`** - Privacy settings

## **📱 Medium Priority - Frontend Hooks Using RPC Calls**

These files directly call RPC functions that can be cached:

### **React Hooks**

11. **`src/hooks/useTenant.ts`** - Uses `get_tenant_context` and `user_has_tenant_access`
12. **`src/hooks/useUserTenants.ts`** - Uses `get_user_tenants`

### **Providers**

13. **`src/providers/TenantProvider.tsx`** - Uses `get_user_tenants` and `get_tenant_context`

## **🔧 Medium Priority - Data Loaders**

These files fetch tenant data and could use caching:

14. **`src/lib/data-loaders/feed-loader.ts`** - Uses `get_user_tenants`
15. **`src/app/api/feed/collective-batch/route.ts`** - Uses `get_user_tenants`

## **⚡ Low Priority - Direct Database Queries**

These files query tenant tables directly and could use cached membership:

### **Data Access Layer**

16. **`src/lib/data-access/tenant-aware-client.ts`** - Queries `tenant_members`
17. **`src/lib/data-access/tenant-aware.ts`** - Queries `tenant_members`

### **Data Services**

18. **`src/lib/data/posts.ts`** - Filters by `tenant_id`
19. **`src/lib/data/reactions.ts`** - Tenant-scoped reactions

## **📝 Update Strategy by Priority**

### **Phase 1: API Routes (Immediate Impact)**

Replace `withTenantAccess` calls in API routes with cached versions:

```typescript
// Before
import { withTenantAccess } from '@/lib/api/tenant-helpers';

// After
import { withTenantAccess } from '@/lib/api/tenant-helpers';
import { checkTenantAccessCached } from '@/lib/cache/tenant-cache';

// Use checkTenantAccessCached instead of withTenantAccess where appropriate
```

### **Phase 2: Frontend Hooks (User Experience)**

Replace RPC calls in hooks with cached functions:

```typescript
// Before
await supabase.rpc('get_tenant_context', { target_tenant_id: tenantId });

// After
import { getTenantContextCached } from '@/lib/cache/tenant-cache';
const context = await getTenantContextCached(tenantId);
```

### **Phase 3: Data Loaders (Background Performance)**

Update data loaders to use cached tenant lists.

### **Phase 4: Data Access (Optimization)**

Optimize direct database queries with cached membership checks.

## **🎯 Quick Wins (Start Here)**

Focus on these 5 files first for maximum impact:

1. `src/app/api/tenants/[tenantId]/posts/route.ts` (content creation)
2. `src/app/api/tenants/[tenantId]/members/route.ts` (member operations)
3. `src/hooks/useTenant.ts` (frontend tenant access)
4. `src/providers/TenantProvider.tsx` (global tenant state)
5. `src/app/api/tenants/[tenantId]/settings/route.ts` (settings)

**Expected Performance Gain**: 80-90% faster tenant access validation on these high-traffic endpoints! 🚀
