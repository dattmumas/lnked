# Chat System Architecture Documentation

## Overview

The chat system is a sophisticated real-time messaging platform built on **Supabase** with **Next.js 15**, supporting multiple conversation types (direct messages, group chats, and tenant-specific channels) with comprehensive real-time functionality, tenant isolation, and robust security. This document reflects the **current consolidated state** after extensive refactoring and centralization.

## Project Context

- **Database**: Supabase project `tncnnulhjathjjzizksr` (ACTIVE_HEALTHY)
- **Framework**: Next.js 15 with App Router
- **State Management**: Zustand + React Query
- **Real-time**: Supabase Realtime with custom service layer
- **Tenant System**: Unified tenant-based multi-tenancy architecture

## Backend Architecture

### Database Schema

#### Core Chat Tables

**1. `conversations`**

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NULL,                    -- NULL for direct messages
  type VARCHAR NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'channel')),
  description TEXT NULL,
  is_private BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  archived BOOLEAN DEFAULT false,
  collective_id UUID REFERENCES collectives(id),  -- Backward compatibility
  tenant_id UUID REFERENCES tenants(id),          -- Main tenant context
  unique_group_hash TEXT,                          -- SHA-256 for group idempotency
  direct_conversation_hash TEXT                    -- Hash for direct conversation uniqueness
);
```

**2. `conversation_participants`**

```sql
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ NULL               -- Soft delete for participant removal
);
```

**3. `messages`**

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  message_type VARCHAR DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  metadata JSONB DEFAULT '{}',
  reply_to_id UUID REFERENCES messages(id),
  tenant_id UUID REFERENCES tenants(id),   -- Inherited from conversation
  edited_at TIMESTAMPTZ NULL,
  deleted_at TIMESTAMPTZ NULL,              -- Soft delete
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**4. `message_reactions`**

```sql
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id),
  user_id UUID REFERENCES users(id),
  emoji VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**5. `message_read_receipts`**

```sql
CREATE TABLE message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id),
  user_id UUID REFERENCES users(id),
  read_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tenant System Integration

**6. `tenants`** - Unified tenant management

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type tenant_type NOT NULL DEFAULT 'collective',  -- 'personal' | 'collective'
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_public BOOLEAN DEFAULT true,
  member_count INTEGER DEFAULT 0
);
```

**7. `tenant_members`** - Unified membership

```sql
CREATE TABLE tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES auth.users(id),
  role member_role NOT NULL DEFAULT 'member',  -- 'owner' | 'admin' | 'editor' | 'member'
  joined_at TIMESTAMPTZ DEFAULT now()
);
```

### Database Functions (RPC)

#### **Conversation Management Functions**

**1. `create_direct_conversation_atomic(sender_id, recipient_id)`**

- **Purpose**: Atomically creates or finds existing direct conversation
- **Returns**: `TABLE(conversation_id uuid, is_existing boolean)`
- **Logic**:
  - Validates inputs (prevents self-conversations)
  - Checks for existing direct conversation between users
  - Creates new conversation + participants atomically
  - Handles race conditions with exception handling
- **Security**: Input validation, atomic operations

**2. `create_group_conversation_atomic(creator_id, participant_ids[], group_title, check_participants)`**

- **Purpose**: Creates group conversations with idempotency
- **Returns**: `JSON` with structured response
- **Features**:
  - Generates SHA-256 hash for duplicate prevention using `generate_group_hash()`
  - Validates participant existence (optional)
  - Handles race conditions
  - Returns metadata (participant count, hash, etc.)

**3. `create_tenant_conversation(target_tenant_id, conversation_title, conversation_type, conversation_description, is_private_conversation, participant_user_ids[])`**

- **Purpose**: Creates tenant-specific conversations (channels)
- **Security**: Validates tenant membership before creation
- **Features**: Supports channels, groups within tenant context
- **Returns**: `TABLE(id, title, type, created_at, tenant_id)`

#### **Query Functions**

**4. `find_existing_direct_conversation(target_tenant_id, user1_id, user2_id)`**

- **Purpose**: Finds existing direct conversations between users in specific tenant
- **Returns**: `TABLE(conversation_id, title, created_at)`
- **Logic**: Validates exactly 2 participants, checks tenant context

**5. `find_or_create_direct_conversation(user1_id, user2_id, target_tenant_id)`**

- **Purpose**: High-level function combining find and create operations
- **Features**: Uses deterministic hashing for conversation identification
- **Returns**: `UUID` (conversation ID)

**6. `get_tenant_conversations(target_tenant_id)`**

- **Purpose**: Fetches all conversations accessible to user in a tenant
- **Security**: Validates tenant membership
- **Returns**: Conversations with participant counts and metadata
- **Logic**: Includes tenant-specific + cross-tenant direct messages

**7. `get_direct_conversations_with_participants(p_user_id, limit_count)`**

- **Purpose**: Optimized query for direct message list with participant info
- **Returns**: `TABLE(conversation_id, last_message_at, created_at, other_user_id, other_user_username, other_user_full_name, other_user_avatar_url)`
- **Performance**: Solves N+1 query problem by fetching participant data in single query

#### **Message Management Functions**

**8. `get_unread_message_count(p_user_id, p_conversation_id)`**

- **Purpose**: Calculates unread messages for specific conversation
- **Logic**: Compares `last_read_at` with message timestamps
- **Returns**: `INTEGER`

**9. `get_total_unread_message_count(p_user_id)`**

- **Purpose**: Total unread count across all conversations
- **Use**: Badge notifications, home screen indicators
- **Returns**: `INTEGER`

**10. `mark_messages_as_read(p_user_id, p_conversation_id)`**

- **Purpose**: Updates `last_read_at` timestamp for conversation participant
- **Effect**: Resets unread count to zero
- **Returns**: `VOID`

#### **Utility Functions**

**11. `generate_direct_conversation_hash(conversation_uuid)`**

- **Purpose**: Creates deterministic hash for direct conversations
- **Logic**: Sorts participant IDs and creates consistent string
- **Use**: Prevents duplicate direct conversations
- **Returns**: `TEXT` (deterministic hash)

**12. `generate_group_hash(creator_id, participant_ids[], group_title)`** (implied)

- **Purpose**: Creates idempotency hash for group conversations
- **Prevents**: Duplicate group creation with same participants and creator

#### **Tenant Management Functions**

**13. `user_has_tenant_access(target_tenant_id, required_role)`**

- **Purpose**: Hierarchical permission checking
- **Roles**: `owner` > `admin` > `editor` > `member`
- **Security**: Used throughout system for authorization
- **Returns**: `BOOLEAN`

**14. `user_is_tenant_member(tenant_uuid)`**

- **Purpose**: Simple membership check
- **Returns**: `BOOLEAN`

**15. `get_user_tenants(target_user_id)`**

- **Purpose**: Lists all tenants user belongs to
- **Returns**: `TABLE(tenant_id, tenant_type, tenant_name, tenant_slug, user_role, is_personal, member_count, is_public)`

**16. `create_personal_tenant_for_user(user_id)`**

- **Purpose**: Creates personal tenant space for new users
- **Features**: Handles slug conflicts, creates `tenant_members` entry
- **Returns**: `VOID`

**17. `create_collective_tenant(tenant_name, tenant_slug, tenant_description, is_public)`**

- **Purpose**: Creates new collective tenant with unified ID system
- **Features**: Creates both tenant and collective records with same ID
- **Returns**: `UUID` (new tenant/collective ID)

#### **Helper Functions**

**18. `is_conversation_participant(p_conversation_id, p_user_id)`**

- **Purpose**: Checks if user is participant in conversation
- **Returns**: `BOOLEAN`

**19. `get_tenant_context(target_tenant_id)`**

- **Purpose**: Gets comprehensive tenant information for authenticated user
- **Returns**: `JSON` with tenant details and user role

### Database Triggers

#### **Message Triggers**

**1. `broadcast_message_changes_trigger` → `broadcast_message_changes()`**

- **Events**: INSERT, UPDATE, DELETE on `messages`
- **Purpose**: Real-time message broadcasting via Supabase Realtime
- **Implementation**: Uses `realtime.broadcast_changes()` with conversation-specific topics
- **Topic Format**: `'conversation:' || conversation_id`

**2. `update_conversation_last_message_trigger` → `update_conversation_last_message()`**

- **Event**: INSERT on `messages`
- **Purpose**: Updates conversation's `last_message_at` timestamp
- **Effect**: Enables proper conversation sorting by activity

#### **Conversation Triggers**

**3. `enforce_unique_direct_conversation` → `enforce_unique_direct_conversation()`**

- **Events**: INSERT, UPDATE on `conversations`
- **Purpose**: Prevents duplicate direct conversations between same users
- **Logic**: Checks participant overlap for direct conversation type

**4. `update_direct_conversation_hash_trigger` → `update_direct_conversation_hash()`**

- **Events**: INSERT, UPDATE, DELETE on `conversation_participants`
- **Purpose**: Maintains conversation hash for duplicate prevention
- **Scope**: Only processes direct conversations

#### **Tenant Consistency Triggers**

**5. `maintain_collective_tenant_consistency` → `maintain_collective_tenant_consistency()`**

- **Events**: INSERT, UPDATE, DELETE on `collectives`
- **Purpose**: Keeps collective and tenant tables synchronized
- **Features**: Bidirectional sync with unified ID system

**6. `update_tenant_member_count` → `update_tenant_member_count()`**

- **Events**: INSERT, DELETE on `tenant_members`
- **Purpose**: Maintains accurate member count cache in tenants table

### Row Level Security (RLS) Policies

All chat tables have RLS enabled. Key policies include:

- **Conversations**: Access based on tenant membership and participation
- **Messages**: Readable by conversation participants, writable by authenticated participants
- **Participants**: Users can manage their own participation records
- **Reactions/Receipts**: Users can manage their own reactions and read status

## API Layer

### Chat API Endpoints

#### **Message Operations**

**1. `POST /api/chat/[conversationId]/message`**

```typescript
// Request
{
  content: string;           // 1-10,000 characters
  message_type: 'text' | 'image' | 'file';
  metadata?: object;         // Optional (link previews, etc.)
  reply_to_id?: string;      // Optional for threaded replies
}

// Response
{
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  metadata: object;
  reply_to?: MessageWithSender;
  created_at: string;
  sender: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
}
```

**2. `GET /api/chat/[conversationId]/messages`**

```typescript
// Query Parameters
{
  before?: string;          // ISO timestamp for pagination cursor
  limit?: number;           // 1-100 messages (default: 50)
}

// Response
{
  messages: MessageWithSender[];
  hasMore: boolean;
  nextCursor?: string;
}
```

#### **Conversation Operations**

**3. `POST /api/chat/direct`**

```typescript
// Request
{
  recipientId: string;      // UUID of other participant
}

// Response
{
  conversation: {
    id: string;
    type: 'direct';
    created_at: string;
    participants: ConversationParticipant[];
  };
  isExisting: boolean;
}
```

**4. `GET /api/chat/direct`**

```typescript
// Query Parameters
{
  limit?: number;           // Pagination limit
}

// Response
{
  conversations: DirectConversationWithParticipant[];
}
```

#### **Link Preview Operation**

**5. `POST /api/chat/link-preview`**

```typescript
// Request
{
  url: string;
}

// Response
{
  title?: string;
  description?: string;
  image?: string;
  url: string;
}
```

### API Security Features

- **Session-aware Supabase clients**: All endpoints use request-scoped authentication
- **Enhanced rate limiting**: User-specific rate limits (NOT implemented yet)
- **Input validation**: Comprehensive Zod schemas for all inputs
- **Tenant isolation**: All operations respect tenant boundaries
- **Participant verification**: Messages only accessible to conversation participants

## Frontend Architecture

### **Consolidated File Structure**

After consolidation, the chat system follows this organized structure:

```
src/
├── lib/chat/
│   └── index.ts                     # CENTRAL EXPORT HUB (181 lines)
├── lib/hooks/chat/                  # ALL CHAT HOOKS
│   ├── useTenantConversations.ts    # Tenant conversation list
│   ├── use-conversations.ts         # Cross-tenant conversation management
│   ├── use-messages.ts              # Message management with real-time
│   ├── useTypingPresence.ts         # Typing indicators
│   ├── useConversationScroll.ts     # Scroll behavior management
│   └── useCreateTenantChannel.ts    # Channel creation
├── components/chat/                 # CHAT UI COMPONENTS
│   ├── TenantChatInterface.tsx      # Main container
│   ├── TenantChannelsSidebar.tsx    # Conversation sidebar
│   ├── virtual-message-list.tsx     # Virtualized message list
│   ├── chat-panel.tsx               # Message input panel
│   ├── ChatHeader.tsx               # Conversation header
│   ├── ConversationListItem.tsx     # Individual conversation item
│   └── message-row.tsx              # Individual message rendering
├── lib/data-loaders/
│   └── chat-loader.ts               # Data loading utilities
└── lib/chat/
    ├── realtime-service.ts          # Real-time WebSocket management (1,849 lines)
    └── api-client.ts                # API request utilities
```

### **Central Export Hub: `src/lib/chat/index.ts`**

This is the **single source of truth** for all chat-related exports:

```typescript
// Types (consolidated from types.ts)
export type ConversationWithParticipants = {
  /* ... */
};
export type MessageWithSender = {
  /* ... */
};
export type DirectConversationWithParticipant = {
  /* ... */
};
// ... all other types

// Query Keys (unified from multiple sources)
export const chatQueryKeys = {
  conversations: (tenantId: string) => ['conversations', tenantId] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
  unreadCount: (userId: string) => ['unreadCount', userId] as const,
  directConversations: (userId: string) =>
    ['directConversations', userId] as const,
  // ... other query keys
} as const;

// Services
export { RealtimeService } from './realtime-service';
export { chatApiClient } from './api-client';

// Hooks (re-exported from lib/hooks/chat/)
export { useTenantConversations } from '../hooks/chat/useTenantConversations';
export { useMessages } from '../hooks/chat/use-messages';
export { useConversations } from '../hooks/chat/use-conversations';
export { useTypingPresence } from '../hooks/chat/useTypingPresence';
export { useConversationScroll } from '../hooks/chat/useConversationScroll';
export { useCreateTenantChannel } from '../hooks/chat/useCreateTenantChannel';

// Constants
export const MESSAGE_HEIGHT_COMPACT = 28;
export const MESSAGE_HEIGHT_NORMAL = 52;
export const DEBOUNCE_DELAY_MS = 2 * 60 * 1000; // 2 minutes
// ... other constants
```

### **Import Pattern (Everywhere)**

Every component and hook now imports from the central hub:

```typescript
import {
  useMessages,
  MessageWithSender,
  chatQueryKeys,
  RealtimeService,
} from '@/lib/chat';
```

### Core Components

#### **1. `TenantChatInterface` (Main Container)**

- **Location**: `src/components/chat/TenantChatInterface.tsx`
- **Purpose**: Root chat interface component with tenant-aware conversation management
- **Key Features**:
  - **Tenant-aware conversation loading** using `useTenantConversations`
  - **Auto-select first conversation** with debounced logic
  - **Real-time subscription management** via `RealtimeService`
  - **Responsive layout** with sidebar toggle and fullscreen modes
  - **AnimatePresence animations** for smooth transitions

**Data Flow**:

```typescript
const { data: conversations } = useTenantConversations(currentTenant?.id);
const realtimeService = RealtimeService.getInstance();

useEffect(() => {
  if (activeChannel?.id) {
    // Subscribe to conversation updates
    realtimeService.subscribeToConversation(activeChannel.id, {
      onMessageUpdate: (message) => {
        queryClient.invalidateQueries({
          queryKey: chatQueryKeys.messages(activeChannel.id),
        });
      },
    });
  }

  return () => {
    if (activeChannel?.id) {
      realtimeService.unsubscribeFromConversation(activeChannel.id);
    }
  };
}, [activeChannel?.id]);
```

#### **2. `TenantChannelsSidebar` (Conversation List)**

- **Location**: `src/components/chat/TenantChannelsSidebar.tsx`
- **Purpose**: Displays and manages conversation list for current tenant
- **Features**:
  - **Real-time conversation updates** via subscriptions
  - **Conversation categorization** (direct vs channels)
  - **Search functionality** (local filtering)
  - **Unread indicators** (NOT implemented yet)

**Component Structure**:

```typescript
const { data: conversations, isLoading } = useTenantConversations(tenant?.id);

// Real-time subscription for conversation list updates
useEffect(() => {
  if (tenant?.id) {
    const unsubscribe =
      RealtimeService.getInstance().subscribeToTenantConversations(tenant.id, {
        onConversationUpdate: () => {
          queryClient.invalidateQueries({
            queryKey: chatQueryKeys.conversations(tenant.id),
          });
        },
      });

    return unsubscribe;
  }
}, [tenant?.id]);
```

#### **3. `VirtualMessageList` (Message Display)**

- **Location**: `src/components/chat/virtual-message-list.tsx`
- **Purpose**: High-performance virtualized message rendering with reliable scroll behavior
- **Performance Features**:
  - **Virtual scrolling** with `@tanstack/react-virtual`
  - **Dynamic height calculation** based on content and message grouping
  - **Efficient re-rendering** with React.memo
  - **Simplified scroll logic** eliminating race conditions
  - **Message grouping** for consecutive messages from same sender (5-minute window)

**Key Constants**:

```typescript
const MESSAGE_HEIGHT_COMPACT = 28; // Grouped messages
const MESSAGE_HEIGHT_NORMAL = 52; // Full messages with avatar
const LOAD_MORE_THRESHOLD = 200; // Trigger load more at 200px from top
```

**Scroll Behavior (Fixed)**:

```typescript
// ALWAYS scroll to bottom on initial render (proper chat UX)
if (isInitialRenderRef.current) {
  console.log('📍 [VIRTUAL-MESSAGE-LIST] Initial render - scrolling to bottom');
  setTimeout(() => {
    scrollToBottom();
    isInitialRenderRef.current = false;
  }, 50);
} else if (newMessagesAdded && shouldAutoScroll) {
  // Auto-scroll for new messages only if user is near bottom
  setTimeout(() => {
    scrollToBottom();
  }, 50);
}
```

**Key Implementation Fixes**:

- ✅ **Conversations always open at bottom** (newest messages visible)
- ✅ **Single, reliable scroll effect** instead of multiple conflicting useEffect hooks
- ✅ **Proper conversation change detection** using refs to avoid dependency issues
- ✅ **Integration with enhanced useConversationScroll hook**
- ✅ **Eliminated timing race conditions** that caused "opens at top" issue

#### **4. `ChatPanel` (Message Input)**

- **Location**: `src/components/chat/chat-panel.tsx`
- **Purpose**: Message composition and sending interface
- **Features**:
  - **Auto-resizing textarea** (max 120px height)
  - **Keyboard shortcuts** (Enter to send, Shift+Enter for newline)
  - **Typing indicators** with real-time broadcasting
  - **Reply target display** and management
  - **Send button** with loading states

**Typing Indicator Integration**:

```typescript
const { sendTypingEvent } = useTypingPresence(
  conversationId,
  currentUserId,
  tenantId,
);

const handleInputChange = useCallback(
  (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    sendTypingEvent(); // Broadcasts typing status
  },
  [sendTypingEvent],
);
```

#### **5. `MessageRow` (Individual Message)**

- **Location**: `src/components/chat/message-row.tsx`
- **Purpose**: Renders individual messages with full feature support
- **Features**:
  - **Rich text rendering** with ReactMarkdown (if configured)
  - **Reply thread visualization**
  - **Optimistic updates** for pending messages
  - **ResizeObserver** for dynamic height calculation
  - **Memoization** with React.memo for performance

### **Custom Hooks (Consolidated)**

All hooks are now located in `src/lib/hooks/chat/` and re-exported from `src/lib/chat/index.ts`.

#### **1. `useTenantConversations`**

- **Purpose**: Fetches and manages conversations for current tenant
- **Features**:
  - **React Query integration** for caching
  - **Real-time updates** via RealtimeService
  - **Tenant-aware filtering**
  - **Optimistic updates** for new conversations

```typescript
export function useTenantConversations(tenantId?: string) {
  return useQuery({
    queryKey: chatQueryKeys.conversations(tenantId || ''),
    queryFn: () => getTenantConversations(tenantId!),
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
```

#### **2. `useMessages`**

- **Purpose**: Manages message loading, pagination, and real-time updates
- **Features**:
  - **Infinite query** with cursor-based pagination
  - **Real-time message updates** via RealtimeService
  - **Optimistic message sending**
  - **Message caching** and invalidation

```typescript
export function useMessages(conversationId?: string) {
  const queryClient = useQueryClient();

  // Infinite query for message pagination
  const messagesQuery = useInfiniteQuery({
    queryKey: chatQueryKeys.messages(conversationId || ''),
    queryFn: ({ pageParam }) =>
      getMessages(conversationId!, { before: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!conversationId,
  });

  // Send message mutation with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: (messageData: SendMessageRequest) =>
      sendMessage(conversationId!, messageData),
    onMutate: async (messageData) => {
      // Optimistic update logic
      await queryClient.cancelQueries({
        queryKey: chatQueryKeys.messages(conversationId!),
      });

      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        ...messageData,
        created_at: new Date().toISOString(),
        isPending: true,
      };

      queryClient.setQueryData(
        chatQueryKeys.messages(conversationId!),
        (old: any) => addOptimisticMessage(old, optimisticMessage),
      );

      return { optimisticMessage };
    },
    // ... error handling and success logic
  });

  return {
    ...messagesQuery,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
  };
}
```

#### **3. `useTypingPresence`**

- **Purpose**: Manages typing indicators with real-time broadcasting
- **Features**:
  - **Debounced typing events** (3-second timeout)
  - **Real-time broadcasting** via Supabase Presence
  - **User filtering** (excludes current user)
  - **Automatic cleanup**

#### **4. `useConversationScroll`**

- **Purpose**: Manages scroll behavior in message list with enterprise-grade features
- **Features**:
  - **Auto-scroll detection** based on user scroll position (150px threshold)
  - **Scroll-to-bottom button** visibility management (600px threshold)
  - **Position persistence** via sessionStorage for navigation restoration
  - **Scroll event delegation** for performance optimization
  - **Ref-based scroll function** for external control from VirtualMessageList

**Interface:**

```typescript
export interface ConversationScrollHook {
  // Position management
  getScrollPosition: (conversationId: string) => number;
  setScrollPosition: (conversationId: string, position: number) => void;

  // Auto-scroll behavior
  shouldAutoScroll: boolean;
  showScrollToBottomButton: boolean;

  // Scroll actions
  handleScroll: (element: HTMLElement, conversationId: string) => void;
  scrollToBottom: () => void;

  // Configuration
  scrollToBottomRef: React.RefObject<(() => void) | null>;
}
```

**Key Implementation Details:**

- **Auto-scroll threshold**: 150px from bottom - user stays in auto-scroll mode
- **Button visibility threshold**: 600px from bottom - shows scroll-to-bottom button
- **Performance**: Single scroll handler delegated to hook, avoiding multiple event listeners
- **State management**: Uses refs to avoid unnecessary re-renders during scroll events

### **Real-time System**

#### **`SimplifiedRealtimeService` (Enterprise-Grade Real-time Engine)**

- **Location**: `src/lib/chat/simplified-realtime-service.ts`
- **Purpose**: Environment-aware real-time communication with strategy pattern
- **Architecture**: Strategy pattern with environment-specific implementations

**Key Features**:

- **Environment Strategy Pattern**: Automatically selects appropriate strategy based on NODE_ENV
- **Production Strategy**: Uses Supabase Broadcast with proper error handling and security
- **Development Strategy**: Uses polling to completely eliminate Fast Refresh issues
- **Zero Technical Debt**: No Fast Refresh workarounds or development-specific hacks
- **Backward Compatibility**: Maintains same interface as original service
- **Enterprise Architecture**: Clean separation of concerns and scalable design

**Strategy Pattern Implementation**:

```typescript
// RealtimeStrategyFactory selects environment-appropriate strategy
const strategy = RealtimeStrategyFactory.getInstance();

// Development Strategy (Polling-based)
class DevelopmentRealtimeStrategy {
  // Uses polling every 1000ms to avoid Fast Refresh issues
  // Simulates real-time through API polling
  // No WebSocket connections = no development problems
}

// Production Strategy (WebSocket-based)
class ProductionRealtimeStrategy {
  // Uses Supabase Broadcast for optimal performance
  // Follows Supabase documentation best practices
  // Proper error handling and security checks
}

// Simplified Service Interface
const realtimeService = new SimplifiedRealtimeService();
// Automatically uses correct strategy based on NODE_ENV
```

**Channel Types** (Production Strategy Only):

```typescript
// Conversation channels for message updates
conversation:${conversationId}

// Video status channels for upload progress
video_status:${userId}

// Post update channels for real-time content
posts:${tenantId}
```

**Subscription Management**:

```typescript
class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private channelRefCounts: Map<string, number> = new Map();
  private channelStates: Map<
    string,
    'creating' | 'subscribing' | 'subscribed' | 'closed'
  > = new Map();

  subscribeToConversation(
    conversationId: string,
    callbacks: ConversationCallbacks,
  ) {
    const channelName = `conversation:${conversationId}`;

    // Increment reference count
    this.channelRefCounts.set(
      channelName,
      (this.channelRefCounts.get(channelName) || 0) + 1,
    );

    // Create channel if not exists
    if (!this.channels.has(channelName)) {
      const channel = this.supabase.channel(channelName, {
        config: { private: true },
      });

      // Set up broadcast listeners
      channel.on('broadcast', { event: 'INSERT' }, (payload) => {
        callbacks.onMessageUpdate?.(payload.payload);
      });

      // Subscribe to channel
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.channelStates.set(channelName, 'subscribed');
        }
      });

      this.channels.set(channelName, channel);
    }

    // Return unsubscribe function
    return () => this.unsubscribeFromConversation(conversationId);
  }
}
```

#### **Broadcast Message Handling**

The system uses **Supabase Broadcast** (not Postgres Changes) for better performance:

- **Topic Structure**: `conversation:${conversationId}` matches database trigger
- **Message Processing**: Handles INSERT, UPDATE, DELETE operations
- **Payload Structure**: Supports multiple payload formats from `realtime.broadcast_changes()`

**Database Trigger Integration**:

```sql
-- Database trigger function
CREATE OR REPLACE FUNCTION broadcast_message_changes()
RETURNS trigger AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'conversation:' || COALESCE(NEW.conversation_id, OLD.conversation_id)::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD,
    'ROW'
  );
  RETURN null;
END;
$$ LANGUAGE plpgsql;
```

### **State Management**

#### **1. Tenant Store (Zustand)**

- **Location**: `src/stores/tenant-store.ts`
- **Purpose**: Global tenant context management
- **Features**:
  - **Current tenant tracking**
  - **Tenant switching**
  - **Persistence across sessions**
  - **React Query integration**

#### **2. React Query Integration**

- **Purpose**: Server state management for chat data
- **Features**:
  - **Conversation caching** with `chatQueryKeys.conversations(tenantId)`
  - **Message pagination** with `chatQueryKeys.messages(conversationId)`
  - **Real-time invalidation** when WebSocket events received
  - **Background refetching** for stale data
  - **Optimistic updates** for immediate UI response

**Query Keys Structure** (from `src/lib/chat/index.ts`):

```typescript
export const chatQueryKeys = {
  conversations: (tenantId: string) => ['conversations', tenantId] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
  unreadCount: (userId: string) => ['unreadCount', userId] as const,
  directConversations: (userId: string) =>
    ['directConversations', userId] as const,
} as const;
```

#### **3. Local Component State**

- **Message Composition**: Managed locally in ChatPanel
- **UI State**: Sidebar visibility, fullscreen mode, modals
- **Selection State**: Active conversation, selected messages
- **Scroll State**: Message list scroll position

## Data Flow Architecture

### **Complete Message Sending Flow**

1. **User Input** → `ChatPanel`
2. **Local State Update** → Immediate UI feedback
3. **Optimistic Update** → `useMessages` hook adds temporary message
4. **API Call** → `POST /api/chat/[conversationId]/message`
5. **Database Insert** → Message saved to `messages` table
6. **Database Trigger** → `broadcast_message_changes()` fires
7. **Realtime Broadcast** → WebSocket event to `conversation:${conversationId}`
8. **Client Reception** → `RealtimeService` receives broadcast
9. **Query Invalidation** → React Query refetches messages
10. **UI Update** → All connected clients see new message

### **Conversation Loading Flow**

1. **Tenant Selection** → User switches tenant in `TenantStore`
2. **Hook Activation** → `useTenantConversations(tenantId)` triggers
3. **API Call** → Uses `get_tenant_conversations(target_tenant_id)` RPC
4. **Database Query** → Joins conversations with participant counts
5. **Data Return** → Conversations with metadata
6. **Cache Update** → React Query caches result
7. **UI Render** → `TenantChannelsSidebar` displays conversations
8. **Real-time Setup** → Subscribe to conversation list updates

### **Real-time Update Flow**

1. **Database Change** → INSERT/UPDATE/DELETE on `messages`
2. **Trigger Execution** → `broadcast_message_changes()` function
3. **Realtime Broadcast** → Supabase sends WebSocket event
4. **Client Reception** → `RealtimeService.subscribeToConversation()`
5. **Callback Execution** → Registered callback functions run
6. **State Invalidation** → React Query invalidates affected queries
7. **Re-fetch** → Fresh data fetched from API
8. **UI Update** → Components re-render with new data

## Security Architecture

### **Authentication & Authorization**

#### **1. Row Level Security (RLS)**

- **Scope**: All chat tables have RLS enabled
- **Tenant Isolation**: Conversations isolated by tenant membership
- **Participant Verification**: Messages only accessible to conversation participants
- **Hierarchical Permissions**: Tenant roles determine access levels

#### **2. Function-Level Security**

- **RPC Functions**: All functions verify user authentication with `auth.uid()`
- **Tenant Membership**: Functions check `user_is_tenant_member()` before operations
- **Participant Verification**: Message operations verify conversation participation
- **Input Validation**: All user inputs validated with Zod schemas

#### **3. API Security**

- **Session Verification**: All endpoints verify Supabase session
- **Tenant Context**: API operations respect tenant boundaries
- **Input Sanitization**: SQL injection prevention with parameterized queries
- **Error Sanitization**: Prevents information leakage

### **Real-time Security**

#### **1. Channel Authorization**

- **Private Channels**: All chat channels marked as private
- **Realtime Auth**: Uses `supabase.realtime.setAuth()` for authorization
- **Security Checks**: Validates conversation access before subscription
- **Participant Verification**: Checks `isParticipant()` before allowing subscription

#### **2. Broadcast Security**

- **Topic Isolation**: Each conversation has isolated broadcast topic
- **User Filtering**: Messages filtered by conversation participation
- **Payload Validation**: All broadcast payloads validated
- **Self-Exclusion**: Users don't receive their own broadcasts

## Performance Optimizations

### **Database Performance**

#### **1. Indexing Strategy**

- **Conversation Queries**: Indexed on `tenant_id`, `type`, `last_message_at`
- **Message Queries**: Indexed on `conversation_id`, `created_at`, `sender_id`
- **Participant Queries**: Composite index on `(conversation_id, user_id)`

#### **2. Query Optimization**

- **RPC Functions**: Optimized queries reducing N+1 problems
- **Participant Joins**: Single query for conversation + participant data
- **Message Batching**: Paginated loading with efficient cursors
- **Aggregation Queries**: Optimized unread count calculations

### **Frontend Performance**

#### **1. Virtual Scrolling**

- **Message List**: Virtualized rendering for large message lists
- **Dynamic Heights**: Efficient height calculation and caching
- **Memory Management**: Efficient component mounting/unmounting

#### **2. React Optimizations**

- **Memoization**: React.memo for message components
- **Callback Optimization**: useCallback for event handlers
- **State Batching**: Batched state updates for better performance
- **Conditional Rendering**: Efficient re-rendering strategies

#### **3. Real-time Optimizations**

- **Connection Pooling**: Shared WebSocket connections
- **Reference Counting**: Prevent unnecessary subscriptions
- **Subscription Management**: Efficient subscription lifecycle
- **Memory Leak Prevention**: Proper cleanup and garbage collection

### **Network Performance**

#### **1. Data Loading**

- **Pagination**: Cursor-based pagination for infinite scroll
- **Caching**: React Query caching with appropriate stale times
- **Background Sync**: Background refresh for stale data
- **Optimistic Updates**: Immediate UI updates for better UX

#### **2. Real-time Efficiency**

- **Selective Broadcasting**: Only relevant participants receive updates
- **Payload Optimization**: Minimal data in real-time payloads
- **Connection Reuse**: Shared connections across components

## Current Implementation Status

### **✅ Fully Implemented**

- ✅ **Database Schema**: All 7 core tables with proper relationships
- ✅ **Database Functions**: 25+ RPC functions for all operations
- ✅ **Database Triggers**: 6 triggers for real-time and consistency
- ✅ **API Endpoints**: 5 core endpoints (message send/get, direct chat, link preview)
- ✅ **Frontend Components**: 7 main components with full integration
- ✅ **Custom Hooks**: 6 hooks with React Query integration
- ✅ **Real-time System**: Comprehensive WebSocket management (1,849 lines)
- ✅ **State Management**: Zustand + React Query integration
- ✅ **Tenant System**: Full multi-tenancy with unified architecture
- ✅ **File Consolidation**: Single import source from `@/lib/chat`

### **🚧 Partially Implemented**

- 🚧 **Message Editing**: API endpoint exists but frontend integration incomplete
- 🚧 **Message Deletion**: API endpoint exists but frontend integration incomplete
- 🚧 **Unread Indicators**: Database functions exist but UI integration missing
- 🚧 **Group Conversations**: Backend complete but limited frontend UI
- 🚧 **File Attachments**: Message types support but upload handling incomplete

### **❌ Not Implemented**

- ❌ **Message Reactions**: No API endpoints (database schema exists)
- ❌ **Message Search**: No API endpoint
- ❌ **Enhanced Rate Limiting**: Basic rate limiting only
- ❌ **Presence System**: Typing indicators only, no online/offline status
- ❌ **File Upload UI**: No file attachment interface

### **📋 Technical Debt (RESOLVED)**

✅ **Complex Real-time Service**: **RESOLVED** - Simplified from 1,849 lines to clean strategy pattern  
✅ **Development Mode Workarounds**: **RESOLVED** - Eliminated through environment-specific strategies  
✅ **Chat Scroll Issues**: **RESOLVED** - Fixed "opens at top" issue with simplified, reliable scroll logic  
✅ **Scroll Hook Mismatch**: **RESOLVED** - Enhanced useConversationScroll to match documented features  
⚠️ **Placeholder Components**: Some components marked as placeholders  
⚠️ **Error Handling**: Inconsistent patterns across components

### **🚀 Recent Improvements**

#### **Real-time Service Simplification** (Phase 1 Complete)

**Before (Technical Debt)**:

- 1,849 lines of complex code with Fast Refresh workarounds
- Development delays (`setTimeout(500ms)`)
- Disabled auto-retry in development
- Aggressive channel cleanup and cache management
- Poor developer experience

**After (Enterprise Solution)**:

- Clean strategy pattern with environment-specific implementations
- Development: Polling strategy (no WebSocket issues)
- Production: Optimized Supabase Broadcast strategy
- Zero Fast Refresh workarounds needed
- Excellent developer experience

**Architecture Impact**:

- **Code Reduction**: From 1,849 lines to ~600 lines total across all files
- **Maintainability**: Clear separation of concerns
- **Scalability**: Easy to add new strategies (test, staging, etc.)
- **Developer Experience**: Fast, reliable development mode

#### **Chat Scroll Behavior Fix** (Phase 2 Complete)

**Before (UX Issue)**:

- Conversations opened at top (oldest messages)
- Users had to manually scroll down to see newest messages
- Complex multiple `useEffect` hooks with timing conflicts
- Documentation didn't match actual implementation
- Race conditions causing inconsistent scroll behavior

**After (Modern Chat UX)**:

- Conversations ALWAYS open at bottom (newest messages visible)
- Proper auto-scroll behavior when near bottom
- Single, reliable scroll management system
- Enhanced `useConversationScroll` hook with enterprise features
- Documentation accurately reflects implementation

**Implementation Details**:

- **Enhanced useConversationScroll Hook**: Now provides auto-scroll detection, button visibility management, and performance optimizations
- **Simplified VirtualMessageList**: Single `useLayoutEffect` with conversation change detection via refs
- **Reliable Initial Positioning**: Always scrolls to bottom on conversation open (proper chat UX)
- **Smart Auto-scroll**: Only auto-scrolls for new messages when user is near bottom (150px threshold)
- **Performance Optimized**: Eliminated unnecessary re-renders and scroll event conflicts

## Deployment Considerations

### **Environment Configuration**

- **Supabase Integration**: Configured for production Supabase instance `tncnnulhjathjjzizksr`
- **Real-time Limits**: Configured for expected concurrent users
- **Tenant Isolation**: Proper RLS policies for data isolation

### **Monitoring & Observability**

- **API Metrics**: Request/response time monitoring needed
- **Real-time Metrics**: Connection count and message throughput tracking needed
- **Error Tracking**: Comprehensive error logging and alerting needed
- **Performance Monitoring**: Database query performance tracking needed

---

This architecture provides a **robust, secure, and performant** chat system that scales with the application's needs while maintaining excellent user experience and developer ergonomics. The **consolidated structure** makes it easy to understand, maintain, and extend while the **comprehensive real-time system** ensures excellent user experience across all connected clients.
