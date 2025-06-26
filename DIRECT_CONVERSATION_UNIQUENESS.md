# Direct Conversation Uniqueness System

## Problem Solved

Previously, multiple direct conversations could be created between the same two users, leading to confusion and fragmented message history.

## Solution Implemented

### 1. Database-Level Uniqueness Constraint

- **Added `direct_conversation_hash` column** to `conversations` table
- **Generated hash** from sorted participant user IDs (e.g., "uuid1|uuid2")
- **Unique index** prevents duplicate direct conversations at database level

### 2. Automatic Hash Generation

- **Trigger function** `update_direct_conversation_hash()` automatically populates hash when participants are added/removed
- **Deterministic sorting** ensures same hash regardless of participant order
- **Only applies to direct conversations** (type = 'direct')

### 3. Safe Conversation Creation Function

- **`find_or_create_direct_conversation(user1_id, user2_id, target_tenant_id)`**
- **Atomic operation** - either finds existing or creates new, never duplicates
- **Cross-tenant support** - direct messages work across tenant boundaries
- **Returns conversation UUID** for immediate use

### 4. Updated API Logic

- **Direct conversations** use the safe `find_or_create_direct_conversation` function
- **Group/Channel conversations** continue using existing `create_tenant_conversation` RPC
- **Guaranteed uniqueness** for all future direct message creation

## Database Schema Changes

```sql
-- New column for uniqueness
ALTER TABLE conversations
ADD COLUMN direct_conversation_hash TEXT;

-- Unique constraint
CREATE UNIQUE INDEX idx_unique_direct_conversations
ON conversations (direct_conversation_hash)
WHERE type = 'direct' AND direct_conversation_hash IS NOT NULL;

-- Trigger for automatic hash generation
CREATE TRIGGER update_direct_conversation_hash_trigger
  AFTER INSERT OR UPDATE OR DELETE ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_direct_conversation_hash();
```

## API Changes

### Before

```typescript
// Could create multiple conversations between same users
const conversation = await createConversation({
  type: 'direct',
  participant_ids: [otherUserId],
});
```

### After

```typescript
// Guaranteed unique conversation between users
const conversationId = await supabase.rpc(
  'find_or_create_direct_conversation',
  {
    user1_id: currentUserId,
    user2_id: otherUserId,
    target_tenant_id: tenantId,
  },
);
```

## Benefits

1. **No Duplicate Conversations** - Database constraint prevents duplicates
2. **Automatic Resolution** - Always returns the correct conversation
3. **Cross-Tenant Support** - Direct messages work across tenant boundaries
4. **Backward Compatible** - Existing conversations get hashes automatically
5. **Performance** - Index ensures fast lookups
6. **Data Integrity** - Triggers maintain consistency automatically

## Testing

After database cleanup and reimplementation:

- ✅ Creating direct conversation between User A and User B
- ✅ Attempting to create another conversation between same users should return existing one
- ✅ Real-time messaging works across tenants
- ✅ UI shows single conversation per user pair
- ✅ No duplicate conversations possible

## Migration Applied

- `20250626_enforce_unique_direct_conversations` - Implements complete uniqueness system
- All existing direct conversations updated with proper hashes
- Future conversations guaranteed unique through database constraints
