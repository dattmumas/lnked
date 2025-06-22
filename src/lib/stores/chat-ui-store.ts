import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface TypingUser {
  user_id: string;
  username: string;
  conversation_id: string;
  timestamp: number;
}

interface ChatUIState {
  // Active conversation
  activeConversationId: string | null;
  
  // Typing indicators
  typingUsers: Map<string, TypingUser[]>; // conversationId -> typing users
  
  // UI state
  scrollPositions: Map<string, number>; // conversationId -> scroll position
  replyTargets: Map<string, string>; // conversationId -> messageId
  
  // Online users
  onlineUsers: Set<string>;
  
  // Actions
  setActiveConversation: (conversationId: string | null) => void;
  addTypingUser: (conversationId: string, user: TypingUser) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  clearTypingUsers: (conversationId: string) => void;
  
  setScrollPosition: (conversationId: string, position: number) => void;
  getScrollPosition: (conversationId: string) => number;
  
  setReplyTarget: (conversationId: string, messageId: string | null) => void;
  getReplyTarget: (conversationId: string) => string | null;
  
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  isUserOnline: (userId: string) => boolean;
  
  // Reset
  reset: () => void;
}

export const useChatUIStore = create<ChatUIState>()(
  devtools(
    (set, get) => ({
      // Initial state
      activeConversationId: null,
      typingUsers: new Map(),
      scrollPositions: new Map(),
      replyTargets: new Map(),
      onlineUsers: new Set(),
      
      // Actions
      setActiveConversation: (conversationId) => {
        set({ activeConversationId: conversationId });
      },
      
      addTypingUser: (conversationId, user) => {
        set((state) => {
          const newTypingUsers = new Map(state.typingUsers);
          const users = newTypingUsers.get(conversationId) || [];
          // Remove existing entry for this user
          const filtered = users.filter(u => u.user_id !== user.user_id);
          // Add new entry
          newTypingUsers.set(conversationId, [...filtered, user]);
          return { typingUsers: newTypingUsers };
        });
      },
      
      removeTypingUser: (conversationId, userId) => {
        set((state) => {
          const newTypingUsers = new Map(state.typingUsers);
          const users = newTypingUsers.get(conversationId) || [];
          const filtered = users.filter(u => u.user_id !== userId);
          if (filtered.length === 0) {
            newTypingUsers.delete(conversationId);
          } else {
            newTypingUsers.set(conversationId, filtered);
          }
          return { typingUsers: newTypingUsers };
        });
      },
      
      clearTypingUsers: (conversationId) => {
        set((state) => {
          const newTypingUsers = new Map(state.typingUsers);
          newTypingUsers.delete(conversationId);
          return { typingUsers: newTypingUsers };
        });
      },
      
      setScrollPosition: (conversationId, position) => {
        set((state) => {
          const newScrollPositions = new Map(state.scrollPositions);
          newScrollPositions.set(conversationId, position);
          return { scrollPositions: newScrollPositions };
        });
      },
      
      getScrollPosition: (conversationId) => {
        return get().scrollPositions.get(conversationId) || 0;
      },
      
      setReplyTarget: (conversationId, messageId) => {
        set((state) => {
          const newReplyTargets = new Map(state.replyTargets);
          if (messageId === null) {
            newReplyTargets.delete(conversationId);
          } else {
            newReplyTargets.set(conversationId, messageId);
          }
          return { replyTargets: newReplyTargets };
        });
      },
      
      getReplyTarget: (conversationId) => {
        return get().replyTargets.get(conversationId) || null;
      },
      
      addOnlineUser: (userId) => {
        set((state) => {
          const newOnlineUsers = new Set(state.onlineUsers);
          newOnlineUsers.add(userId);
          return { onlineUsers: newOnlineUsers };
        });
      },
      
      removeOnlineUser: (userId) => {
        set((state) => {
          const newOnlineUsers = new Set(state.onlineUsers);
          newOnlineUsers.delete(userId);
          return { onlineUsers: newOnlineUsers };
        });
      },
      
      isUserOnline: (userId) => {
        return get().onlineUsers.has(userId);
      },
      
      reset: () => {
        set({
          activeConversationId: null,
          typingUsers: new Map(),
          scrollPositions: new Map(),
          replyTargets: new Map(),
          onlineUsers: new Set(),
        });
      },
    }),
    {
      name: 'chat-ui-store',
    }
  )
); 