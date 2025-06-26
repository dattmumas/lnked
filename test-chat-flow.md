# Chat Deletion and Recreation Test Flow

## Test Scenario

Test the complete flow of creating a conversation, deleting it, and recreating it with the same user.

## Prerequisites

- User is logged in
- User has access to at least one tenant
- Another user exists in the system to chat with

## Test Steps

### 1. Create a New Conversation

1. Navigate to `/chat`
2. Click the "+" button to start a new conversation
3. Search for a user (e.g., "matt")
4. Click on the user to create a conversation
5. **Expected**:
   - Conversation is created successfully (201 status)
   - User is redirected to the conversation
   - Conversation shows in the sidebar with the other user's name and avatar

### 2. Send Messages

1. Type a message in the chat input
2. Press Enter to send
3. **Expected**:
   - Message appears in the chat
   - Message shows as sent by you
   - Other participant can see the message

### 3. Delete the Conversation

1. Click the three-dot menu in the chat header
2. Select "Delete Conversation"
3. **Expected**:
   - DELETE request is sent (not POST)
   - Conversation is removed from the sidebar
   - User is redirected to the chat home page

### 4. Recreate the Conversation

1. Click the "+" button again
2. Search for the same user
3. Click on the user to create a new conversation
4. **Expected**:
   - New conversation is created (201 status)
   - This is a fresh conversation (no previous messages)
   - Conversation shows in the sidebar with the user's name and avatar

## API Endpoints Involved

### Creation

- `POST /api/tenants/{tenantId}/conversations`
  - Request: `{ type: 'direct', participant_ids: [userId] }`
  - Response: `{ data: { conversation: {...} }, timestamp: '...' }`

### Deletion

- `DELETE /api/chat/{conversationId}/delete`
  - Response: `{ message: 'Conversation deleted successfully' }`

### List Conversations

- `GET /api/chat/conversations` (legacy, being deprecated)
- Should return conversations with participant information

## Known Issues Fixed

1. ✅ Delete API was using POST instead of DELETE
2. ✅ UserSearchDialog was not handling wrapped response structure
3. ✅ TenantChannelsSidebar now shows participant names/avatars
4. ✅ create_tenant_conversation RPC type mismatch fixed

## Remaining Considerations

- The legacy `/api/chat/conversations` endpoint needs to return participant data
- Consider migrating to tenant-scoped conversation listing
- Ensure proper cleanup of related data (messages, reactions, etc.) on deletion
