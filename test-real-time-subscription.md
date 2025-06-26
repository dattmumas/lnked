# Real-Time Message Subscription Test Plan

## The Problem We Fixed

Previously, users only subscribed to real-time updates for the conversation they were **actively viewing**. This meant:

- User A sends message to User B
- User B is on chat page but viewing a DIFFERENT conversation
- User B never receives the message in real-time because they weren't subscribed to that specific conversation

## The Solution

Now users subscribe to **ALL their conversations** when they're on the chat page, regardless of which specific conversation they're viewing.

## Test Steps

### Setup

1. **User A** (sender): Open chat page in browser/tab 1
2. **User B** (recipient): Open chat page in browser/tab 2
3. Both users should see the same conversations in their sidebar

### Test 1: Recipient viewing different conversation

1. **User A**: Click on conversation with User B
2. **User B**: Click on a DIFFERENT conversation (not the one with User A)
3. **User A**: Send a message: "Test message 1"
4. **Expected Result**: User B should see the conversation with User A update in their sidebar (unread count, last message preview) even though they're not viewing that conversation

### Test 2: Recipient not viewing any conversation

1. **User A**: Stay in conversation with User B
2. **User B**: Click away from all conversations (back to chat home screen)
3. **User A**: Send a message: "Test message 2"
4. **Expected Result**: User B should see the conversation with User A appear/update in their sidebar

### Test 3: Recipient switches to conversation after receiving message

1. **User A**: Send message: "Test message 3"
2. **User B**: Click on the conversation with User A
3. **Expected Result**: User B should see all messages including "Test message 3" without needing to refresh

## Debug Console Output to Look For

### In User B's console (recipient):

```
🔌 useRealtimeMessagesForConversations: Setting up subscriptions for conversations: [array of conversation IDs]
📡 useRealtimeMessagesForConversations: Setting up subscription for conversation [conversation-id]
📨 useRealtimeMessagesForConversations: Received new message in conversation [conversation-id]: [message object]
✅ useRealtimeMessagesForConversations: Adding new message to cache for conversation [conversation-id]
```

### What should NOT happen:

- No console output in User B's browser = subscription not working
- Message appears in User A's console but not User B's = User B not subscribed to that conversation

## Success Criteria

✅ User B receives real-time messages even when not viewing the specific conversation  
✅ Conversation sidebar updates immediately with new message previews  
✅ Unread counts update in real-time  
✅ When User B switches to the conversation, they see all messages without refresh
