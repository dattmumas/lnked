# Comprehensive Codebase Cleanup Analysis

## Files Confirmed for Removal

### 1. Backup Files

- `src/app/api/auth/callback/route.ts.backup_final`
- `src/app/api/auth/callback/route.ts.backup_final5`
- `src/app/api/auth/callback/route.ts.backup_final4`
- `src/app/api/auth/callback/route.ts.backup_final3`
- `src/app/api/subscribe/route.ts.rej`
- `src/components/editor/LexicalOptimizedEditor.tsx.backup`

### 2. Disabled Files

- `src/app/collectives/page.tsx.disabled`

### 3. Deprecated Chat Files (Not Imported Anywhere)

- `src/hooks/useConversationSecurity.ts` (196 lines)
- `src/components/chat/security-status.tsx` (222 lines)
- `src/hooks/useBatchedReadStatus.ts` (not imported anywhere)

### 4. Legacy Chat Hooks (Confirmed Not Used)

- `src/lib/hooks/use-chat.ts` (original chat hook)
- `src/lib/hooks/use-chat-realtime.ts` (old realtime hook)

### 5. Empty Directories

- `src/app/dashboard/dev/chat-test`
- `src/app/api/posts/[slug]/comments`
- `src/app/api/chat/direct/__tests__`
- `src/app/api/chat/message/[id]`
- `src/app/api/chat/conversations/__tests__`
- `src/app/api/streams`
- `src/app/api/videos/[id]/comments`
- `src/app/api/videos/[id]/playback`
- `src/app/api/videos/analytics/dashboard`
- `src/app/api/videos/analytics/summary`

## Summary

**Total Lines to Remove:** ~840 lines of code + multiple empty directories
**Backup Files:** 6 files
**Dead Code:** 3 unused chat files (614 lines)
**Empty Directories:** 10 directories

## Removal Commands
