# New Chat Implementation Plan (Revised)

This document outlines the step-by-step plan to create a new, modern, and performant chat system. This plan is designed to build an entirely new frontend and middle-layer architecture while integrating with the **existing backend database schemas** (`tenants`, `conversations`, `messages`, etc.).

**Guiding Principles:**

- **No Legacy Frontend:** All chat-related components, hooks, and stores will be built from scratch.
- **Utilize Existing Backend:** The plan leverages the existing Supabase tables and RLS policies. No database migrations will be created.
- **Modern Stack:** The implementation will follow the blueprint in `New_Chat_Plan.md`, using `react-query`, `zustand`, `react-virtuoso`, and other specified packages.

---

## Phase 1: Architecture & Data-Access Layer

This phase focuses on defining the interaction patterns with the existing backend and setting up the core data-fetching logic for our new frontend.

### Step 1.1: Confirm Backend Integration Points

We will build our chat system on the following existing public tables:

- `tenants`: The root of our multi-tenancy model.
- `tenant_members`: Defines user membership and roles within tenants, critical for RLS.
- `conversations`: The core table for chat channels/rooms. We will use `id`, `tenant_id`, and `title`.
- `conversation_participants`: Links users to conversations.
- `messages`: Stores all chat messages, linked to a `conversation_id`.

And the following views:

- `channels` (Supabase **Realtime** channels, _not_ a database table): Every conversation row will map one-to-one to a Realtime topic named `conversation:${conversationId}`. These channels power Broadcast (new messages, typing) and Presence (online users).

No database changes are needed. The work here is to build typed client-side functions to interact with these tables.

### Step 1.2: New Data-Fetching Hooks with React Query

We will create a new set of hooks in `src/hooks/chat-v2/` to handle all data fetching, ensuring a clean separation from legacy code.

- **`useTenantConversations.ts`**:

  - Creates a hook `useTenantConversations(tenantId)`.
  - Uses `@tanstack/react-query`'s `useQuery` to fetch all `conversations` where `tenant_id` matches the active tenant.
  - Query Key: `['tenants', tenantId, 'conversations']`
  - This will power the conversation sidebar.

- **`useConversationMessages.ts`**:
  - Creates a hook `useConversationMessages(conversationId)`.
  - Uses `useInfiniteQuery` to fetch paginated messages from the `messages` table for the given `conversationId`.
  - Query Key: `['conversations', conversationId, 'messages']`
  - Implements `getNextPageParam` for infinite scrolling.

---

## Phase 2: Frontend Scaffolding & Component Creation

This phase involves building the core UI structure and all necessary components from scratch.

### Step 2.1: New Route and Page Structure

- Create a new route `src/app/(app)/chat-v2/[conversationId]/page.tsx`.
- The page will be a server component that fetches initial conversation details.
- It will render a client component, `NewChatInterface.tsx`, which will orchestrate the entire chat UI.

### Step 2.2: Create the Main Chat UI Components

All components will be created new to avoid any legacy dependencies.

- **`NewChatInterface.tsx` (`src/components/chat-v2/`)**:

  - The main client component.
  - Fetches the active `tenantId` from the existing `useTenantStore` Zustand store.
  - Uses the new `useTenantConversations` and `useConversationMessages` hooks.
  - Manages the overall layout, composing the sidebar, message list, and composer.

- **`ConversationSidebar.tsx` (`src/components/chat-v2/`)**:

  - Displays a list of conversations for the current tenant.
  - Uses the data from `useTenantConversations`.
  - Handles navigation between conversations by updating the `conversationId` in the URL.

- **`MessageList.tsx` (`src/components/chat-v2/`)**:

  - Uses `react-virtuoso` to render the virtualized list of messages from `useConversationMessages`.
  - Will be configured for "chat" behavior (scroll anchoring, etc.).
  - Renders a `MessageBubble` for each item.

- **`MessageBubble.tsx` (`src/components/chat-v2/`)**:
  - Renders a single message, including the user's avatar, username, content, and timestamp.
  - Will sanitize content with `dompurify` and auto-link URLs with `linkify-react`.

### Step 2.3: New Zustand Store for UI State

- Create `src/stores/chat-v2-ui-store.ts`.
- This store will manage ephemeral UI state that does not belong in React Query, such as message composer text, reply-to context, and typing indicators.

---

## Phase 3: Realtime Integration & Channel Lifecycle

In addition to wiring Postgres Changes, we need a clear strategy for **creating, subscribing to, and cleaning up Supabase Realtime channels**. This section details how each recommended package participates in the channel layer.

### Channel Layer & Lifecycle

| Concern                           | Implementation                                                                                                                                     | Packages Involved                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------- |
| **Channel Creation**              | `const channel = supabase.channel(`conversation:${conversationId}`, { config: { presence: { key: session.user.id } } });`                          | `@supabase/supabase-js (v3)`                                                                |
| **Broadcast – New Messages**      | `channel.send({ type: 'broadcast', event: 'new_message', payload: dbMessage });` Fired from the server action **after** inserting into `messages`. | `@supabase/supabase-js`, React Query (`queryClient.setQueryData`) to merge into cache       |
| **Broadcast – Typing Indicators** | Composer emits `'typing_start'` and `'typing_stop'` events as the user types. Uses a debounced `channel.send(...)`.                                | `zustand` (draft state), `@supabase/supabase-js`, `framer-motion` (typing dots animation)   |
| **Presence – Online Users**       | `channel.track({ user_id: session.user.id })` announces presence. `channel.on('presence', { event: 'sync' }, ...)` updates a `usePresenceStore`.   | `@supabase/supabase-js`, `zustand`                                                          |
| **Fallback – Postgres Changes**   | Redundant safety net: `supabase.channel('public:messages') ...` to guarantee delivery even if Broadcast is missed (mobile background, etc.).       | `@supabase/supabase-js`                                                                     |
| **Error & Reconnect UX**          | On `channel.on('error'                                                                                                                             | 'timeout', ...)`we call`toast.error(...)`. On `channel.on('open', ...)`we`toast.dismiss()`. | `react-hot-toast` |
| **Cleanup**                       | In `useEffect` return callback, `channel.unsubscribe()` to prevent memory leaks when the user navigates away.                                      | React (`useEffect`), `@supabase/supabase-js`                                                |

> **Why both Broadcast + Postgres Changes?**
>
> 1. **Broadcast** delivers sub-second latency for real-time UX.
> 2. **Postgres Changes** guarantees eventual consistency (e.g., if the sender closes the tab before broadcast fires).

### Updated Step 3 Workflow

1. **Subscribe to Presence + Broadcast** when `conversationId` mounts.
2. **Hydrate initial messages** via `useConversationMessages`.
3. **Render messages** in `MessageList` (`react-virtuoso`).
4. **Handle incoming broadcast events** to prepend messages or update typing indicators.
5. **Fallback to Postgres-Changes** subscription for robustness.
6. **Display connection state** to the user via `react-hot-toast`.
7. **Gracefully unsubscribe** on component unmount or conversation switch.

All other Phase 3 subsections remain unchanged but now reference this channel lifecycle.

---

## Phase 4: Composer and Sending Logic

This phase builds the message input and the logic to send new messages optimistically.

### Step 4.1: Build the `MessageComposer.tsx`

- Create a new component `src/components/chat-v2/MessageComposer.tsx`.
- Use `react-hook-form` for an uncontrolled input to maximize performance (no re-renders on keypress).
- Use `zod` with `zodResolver` to validate message content (e.g., not empty).
- Include buttons for an emoji picker and file attachments.

### Step 4.2: Implement Optimistic Message Sending

- When the user submits the form:
  1.  Generate a temporary client-side ID using `nanoid()`.
  2.  Create an optimistic message object with a "sending" status.
  3.  Immediately update the `useConversationMessages` query cache via `queryClient.setQueryData` to make the message appear instantly in the UI.
  4.  Call a new server action, `sendChatMessage(conversationId, content)`.
  5.  The server action inserts the message into the `public.messages` table.
  6.  The `Postgres Changes` subscription (from Phase 3) will automatically deliver the finalized message from the database, at which point the client can reconcile the optimistic message with the real one.

This revised plan leverages your existing backend infrastructure while enabling the development of a completely new, modern, and performant frontend chat experience.

## Package Integration Matrix

The table below shows how **each** recommended package from `New_Chat_Plan.md` is integrated into this implementation plan.

| #   | Package                                         | Where / How It Is Used                                                                                                                                                       |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **@supabase/supabase-js (v3)**                  | Centralized client (`src/lib/supabase/client.ts`) imported in all server actions and hooks. Used for CRUD, Realtime Broadcast, Presence, and Postgres Changes subscriptions. |
| 2   | **@supabase/auth-helpers-react**                | Provides `SessionContextProvider`, `useSupabaseClient`, and `useSession` wrappers around the React tree (already applied globally in `src/providers/query-provider.tsx`).    |
| 3   | **@tanstack/react-query (v5)**                  | Core data-fetching layer in `useTenantConversations`, `useConversationMessages`, and mutation helpers (`sendChatMessage`).                                                   |
| 4   | **zustand**                                     | Ephemeral UI state in `chat-v2-ui-store.ts` (draft text, reply target, typing indicators).                                                                                   |
| 5   | **react-virtuoso / @virtuoso.dev/message-list** | Efficient, anchor-aware message list in `MessageList.tsx`.                                                                                                                   |
| 6   | **react-hook-form**                             | Uncontrolled message composer form in `MessageComposer.tsx`.                                                                                                                 |
| 7   | **zod**                                         | Schema validation for outgoing messages (`MessageSchema`) via `zodResolver` in `react-hook-form`.                                                                            |
| 8   | **emoji-mart**                                  | Emoji picker inside the composer popover (lazy-loaded with `next/dynamic`).                                                                                                  |
| 9   | **linkifyjs** + `linkify-react`                 | Auto-linking URLs in `MessageBubble` content.                                                                                                                                |
| 10  | **react-hot-toast**                             | Global toast notifications for send failures, upload progress, connection loss (configured in `_app.tsx`).                                                                   |
| 11  | **framer-motion**                               | Enter/exit animations for messages and typing dots.                                                                                                                          |
| 12  | **dompurify**                                   | Sanitization of message HTML before rendering.                                                                                                                               |
| 13  | **nanoid**                                      | Generates optimistic client-side IDs for messages.                                                                                                                           |
| 14  | **date-fns**                                    | Formats timestamps in `MessageBubble` (`formatDistanceToNow`).                                                                                                               |
| 15  | **react-dropzone**                              | Drag-and-drop file uploads in the composer; integrates with Supabase Storage.                                                                                                |

---
