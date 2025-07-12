### Package Blueprint — Supabase-centric Realtime Chat (July 2025)

| #                             | Package                                          | React / Non-React | Role in the stack                                                                                                                                                                                                    | Why it matters / How you’ll wire it in |
| ----------------------------- | ------------------------------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Core Supabase SDKs**        |                                                  |                   |                                                                                                                                                                                                                      |                                        |
| 1                             | `@supabase/supabase-js` (v3)                     | non-react         | Single client for Postgres CRUD, **Realtime Broadcast / Presence / DB-change** channels. Initialize once (`supabaseClient.ts`), reuse everywhere. ([Supabase][1])                                                    |                                        |
| 2                             | `@supabase/auth-helpers-react`                   | react             | Gives you `useSupabaseClient`, `useSession`, SSR helpers. Eliminates hand-rolled context/state for auth, keeps bundle small.                                                                                         |                                        |
|  |
| **Data & State**              |                                                  |                   |                                                                                                                                                                                                                      |                                        |
| 4                             | `@tanstack/react-query` (v5)                     | react             | Caches paged message history (`useInfiniteQuery`), handles optimistic inserts from the Realtime channel (`setQueryData`), retries on network loss. No duplication with local UI state.                               |                                        |
| 5                             | `zustand`                                        | react             | Lightweight store for **ephemeral UI state**: draft text, typing indicator, active room id. Keeps React tree slim; avoids global Redux boilerplate.                                                                  |                                        |
| **List Virtualization**       |                                                  |                   |                                                                                                                                                                                                                      |                                        |
| 6                             | `react-virtuoso` or `@virtuoso.dev/message-list` | react             | Renders thousands of messages with <2 ms commit time. `VirtuosoMessageList` has built-in **anchor-scrolling** for chat UX (maintains scroll position when history loads or new messages arrive). ([virtuoso.dev][3]) |                                        |
| **Input, Validation & Forms** |                                                  |                   |                                                                                                                                                                                                                      |                                        |
| 7                             | `react-hook-form`                                | react             | Uncontrolled composer form ⇒ zero re-renders per keystroke; integrates cleanly with Zod below.                                                                                                                       |                                        |
| 8                             | `zod`                                            | non-react         | Runtime schema for message payloads; plug into RHF’s `zodResolver` and into server-side edge functions.                                                                                                              |                                        |
| **UX Enhancers**              |                                                  |                   |                                                                                                                                                                                                                      |                                        |
| 9                             | `emoji-mart`                                     | react             | Async-loaded emoji picker; respects native emoji set on the device.                                                                                                                                                  |                                        |
| 10                            | `linkifyjs` (+ `linkify-react`)                  | react/non         | Auto-detect & render URLs in message text.                                                                                                                                                                           |                                        |
| 11                            | `react-hot-toast`                                | react             | Connection-loss, upload progress, error feedback—promise-aware and 3 kB gzip.                                                                                                                                        |                                        |
| 12                            | `framer-motion`                                  | react             | Hardware-accelerated enter/exit/typing-dots animations without additional CSS.                                                                                                                                       |                                        |
| **Security & Utilities**      |                                                  |                   |                                                                                                                                                                                                                      |                                        |
| 13                            | `dompurify`                                      | non-react         | Sanitises any pasted/HTML content before rendering – prevents XSS.                                                                                                                                                   |                                        |
| 14                            | `nanoid`                                         | non-react         | 21-char UUIDs for _optimistic_ message IDs before the DB round-trip.                                                                                                                                                 |                                        |
| 15                            | `date-fns`                                       | non-react         | Lightweight timestamp formatting (`formatDistanceToNow`) for delivered/seen chips.                                                                                                                                   |                                        |
| **Attachments (optional)**    |                                                  |                   |                                                                                                                                                                                                                      |                                        |
| 16                            | `react-dropzone`                                 | react             | Drag-and-drop file picker; streams files straight into **Supabase Storage**; progress surfaced via `react-hot-toast`.                                                                                                |                                        |

---

#### Integration Flow (10-Step Outline)

1. **Bootstrap**

   ```ts
   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
   );
   ```

2. **Auth Provider** – Wrap `_app.tsx` with `<SessionContextProvider>`, then expose `useSession()` and guard routes.

3. **Message query** – `useInfiniteQuery(['messages', roomId], fetchPage)`. Hydrate initial server render.

4. **Realtime channel**

   ```ts
   const channel = supabase
     .channel(`room:${roomId}`, { config: { presence: { key: userId } } })
     .on('broadcast', { event: 'message' }, handleIncoming)
     .on('presence', { event: 'sync' }, handlePresence)
     .subscribe();
   ```

5. **Optimistic send**

   - Create local ID with `nanoid()` → `setQueryData` to show instantly.
   - `supabase.from('messages').insert({...})` → reconcile on ack.

6. **Virtualized list** –

   ```tsx
   <VirtuosoMessageList
     data={messages}
     itemContent={(i, msg) => <ChatBubble {...msg} />}
     followOutput="auto"
   />
   ```

7. **Composer** – `react-hook-form` + Zod resolver; emoji picker inside a popover.

8. **Uploads** – `react-dropzone` → `supabase.storage.from('chat').upload(path, file)`.

9. **UI polish** – shadcn components + framer-motion animations; toast errors via `react-hot-toast`.

10. **Testing & linting** – RTL + Vitest; ESLint (airbnb, sonar, unicorn rules) to keep performance slips out.

---

**Result:** a lean (< 160 kB gzipped JS) chat front-end that scrolls at 60 fps, recovers gracefully from offline lapses, and reaches production in days—not weeks.

[1]: https://supabase.com/docs/guides/realtime/presence?utm_source=chatgpt.com 'Presence | Supabase Docs'
[2]: https://supabase.com/blog/supabase-ui-library 'Introducing the Supabase UI Library'
[3]: https://virtuoso.dev/virtuoso-message-list/?utm_source=chatgpt.com 'Virtuoso Message List'
