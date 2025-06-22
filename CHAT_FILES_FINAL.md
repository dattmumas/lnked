# Chat System Files - Final Implementation

## Core Components

- `src/components/chat/chat-panel.tsx` - Main chat panel with input and message display (245 lines)
- `src/components/chat/virtual-message-list.tsx` - Virtual scrolling message list using @tanstack/react-virtual (390 lines)
- `src/components/chat/ChatInterface.tsx` - Main chat interface with sidebar layout
- `src/components/chat/ChannelIcon.tsx` - Channel type icon component
- `src/components/chat/collective-channels-sidebar.tsx` - Sidebar for collective channels
- `src/components/chat/collective-icons-sidebar.tsx` - Sidebar for collective icons
- `src/components/chat/message-row.tsx` - Individual message row component
- `src/components/chat/message-input.tsx` - Message input component
- `src/components/chat/message-edit-form.tsx` - Message editing form

## State Management

- `src/lib/stores/chat-ui-store.ts` - Zustand store for UI state (typing indicators, scroll positions, reply targets)
- `src/lib/hooks/chat/use-conversations.ts` - React Query hooks for conversation management
- `src/lib/hooks/chat/use-messages.ts` - React Query hooks for message management with infinite scroll

## API Client & Services

- `src/lib/chat/api-client.ts` - API client for chat endpoints
- `src/lib/chat/chat-service.ts` - Chat service utilities
- `src/lib/chat/realtime-service.ts` - WebSocket realtime service
- `src/lib/chat/types.ts` - TypeScript types for chat
- `src/lib/chat/utils.ts` - Chat utility functions
- `src/lib/chat/middleware.ts` - Chat middleware

## API Routes

- `src/app/api/chat/conversations/route.ts` - Get all conversations
- `src/app/api/chat/conversations/[conversationId]/route.ts` - Single conversation operations
- `src/app/api/chat/[conversationId]/messages/route.ts` - Get messages with pagination
- `src/app/api/chat/[conversationId]/message/route.ts` - Send new message
- `src/app/api/chat/[conversationId]/messages/[messageId]/route.ts` - Update/delete message
- `src/app/api/chat/[conversationId]/messages/[messageId]/reactions/route.ts` - Message reactions
- `src/app/api/chat/[conversationId]/read/route.ts` - Mark conversation as read
- `src/app/api/chat/direct/route.ts` - Direct message conversations
- `src/app/api/chat/direct/[userId]/route.ts` - Direct message with specific user
- `src/app/api/chat/group/route.ts` - Group conversations
- `src/app/api/chat/search/route.ts` - Search messages
- `src/app/api/chat/link-preview/route.ts` - Link preview generation

## Page Components

- `src/app/chat/page.tsx` - Chat page
- `src/app/chat/layout.tsx` - Chat layout

## Supporting Hooks

- `src/hooks/useFirstChannel.ts` - Hook to get first channel for a collective
- `src/hooks/useOptimisticMessages.ts` - Optimistic message updates
- `src/hooks/useTypingStatus.ts` - Typing indicator management
- `src/hooks/useBatchedReadStatus.ts` - Batched read status updates
- `src/hooks/useConversationSecurity.ts` - Conversation security checks
- `src/hooks/use-unread-messages.ts` - Unread message count

## Constants & Types

- `src/lib/constants/chat.ts` - Chat-related constants
- `src/types/chat.ts` - Additional chat types
- `src/lib/constants/api-routes.ts` - API route constants

## Data Access Layer

- `src/lib/data-access/conversation.repository.ts` - Conversation database operations
- `src/lib/data-access/message.repository.ts` - Message database operations

## Icons

- `src/components/chat/icons/attachment-icon.tsx`
- `src/components/chat/icons/loading-spinner.tsx`
- `src/components/chat/icons/send-icon.tsx`

## Deprecated/Old Hooks (Still Present but Not Used)

- `src/lib/hooks/use-chat-v2.ts` - Old monolithic chat hook (552 lines - to be removed)
- `src/lib/hooks/use-chat.ts` - Original chat hook (to be removed)
- `src/lib/hooks/use-chat-realtime.ts` - Old realtime hook (to be removed)

## External Dependencies

- `@tanstack/react-query` - Server state management
- `@tanstack/react-virtual` - Virtual scrolling
- `zustand` - Client state management
- `lucide-react` - Icons

## Total Code Reduction

- Virtual list: 937 → 390 lines (58% reduction)
- Chat panel: 469 → 245 lines (48% reduction)
- Overall: ~1900 → ~900 lines (53% total reduction)
