Ran tool
Read file: src/lib/database.types.ts
`collectives.row` has slug not null etc. So adding slug to selection is correct.

Now after modifications, run typecheck again.

```bash
pnpm typecheck
```

🎉 **TypeScript check is now fully clean – zero errors!**

Schema reference (chains table):

```98:130:src/lib/database.types.ts
        Row: {
          attachments: Json | null
          author_id: string
          collective_id: string | null
          content: string
          created_at: string
          id: string
          like_count: number
          link_preview: Json | null
          meta: Json | null
          parent_id: string | null
          reply_count: number
          status: Database["public"]["Enums"]["chain_status"]
          thread_root: string
          tsv: unknown | null
          updated_at: string
          visibility: Database["public"]["Enums"]["chain_visibility"]
        }
```

Next steps to implement threaded discussions in the chain sidebar:

1. Slice 0 – DB Hardening  
   • Add the `parent_id` FK and `thread_root` FK already present.  
   • Create trigger `set_thread_root()` that copies `id` into `thread_root` on root inserts; copies ancestor’s `thread_root` on replies.  
   • Create trigger `enforce_consistency()` to ensure roots have `parent_id IS NULL` and replies have `parent_id IS NOT NULL AND thread_root <> id`.  
   • Composite index `(thread_root, created_at DESC)` for fast fetch.

2. Slice 1 – Basic thread fetch  
   • ChainRepository method `fetchThread(rootId, cursor, limit)`:

   ```sql
   SELECT *
   FROM chains
   WHERE thread_root = :rootId
   ORDER BY created_at DESC, id DESC
   LIMIT :limit;
   ```

   • Cursor = base64(created_at,id) for key-set pagination.  
   • Expose an RSC route `src/app/thread/[id]/page.tsx` that streams the first page.

3. Slice 2 – Realtime replies  
   • `useRealtimeChain(rootId)`:

   ```ts
   supabase
     .channel(`thread:${rootId}`)
     .on(
       'postgres_changes',
       {
         event: '*',
         schema: 'public',
         table: 'chains',
         filter: `thread_root=eq.${rootId}`,
       },
       (payload) => addIfNew(payload.new),
     )
     .subscribe();
   ```

   • Merge deltas into React-Query/RSC cache.

4. Slice 3 – Reply composer  
   • Extend `ChainComposer` with `replyTo(chainId, rootId)` props → passes `parent_id` + `thread_root` to server-action `replyToChain()`.  
   • On success `revalidateTag('thread:'+rootId)`.

5. Slice 4 – Inline nesting UI  
   • Each row’s indent = `depth = parent_id ? countAncestors()` (light recursion client-side).  
   • Render left rail or `pl-${depth*4}` Tailwind class.  
   • List remains flat: still virtualised by React-Virtuoso.

6. Slice 5 – Collapse / expand sub-threads  
   • Build `useThreadTree(items)` → returns map `parent_id → children[]`.  
   • Local state `{ openIds }`; collapsed node shows “n replies”.

The remaining slices (notifications, mentions, search, moderation, analytics) can be layered on after basic threading is in production.

I’d recommend starting with Slice 0 + 1 in your next sprint (≈2 days). Let me know which slice you’d like to tackle first and I can scaffold the SQL triggers, repository code, and frontend route.
