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
  activeConversationId: string | undefined;
  
  // Typing indicators
  typingUsers: Map<string, TypingUser[]>; // conversationId -> typing users
  
  // UI state
  scrollPositions: Map<string, number>; // conversationId -> scroll position
  
  // Online users
  onlineUsers: Set<string>;
  
  // Actions
  setActiveConversation: (conversationId: string | undefined) => void;
  addTypingUser: (conversationId: string, user: TypingUser) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  clearTypingUsers: (conversationId: string) => void;
  
  setScrollPosition: (conversationId: string, position: number) => void;
  getScrollPosition: (conversationId: string) => number | undefined;
  
  // Reply state
  replyTargets: Map<string, string>; // conversationId -> messageId
  setReplyTarget: (conversationId: string, messageId: string | undefined) => void;
  getReplyTarget: (conversationId: string) => string | undefined;
  
  // General store reset
  reset: () => void;
}

export const useChatUIStore = create<ChatUIState>()(
  devtools(
    (set, get) => ({
      // Initial state
      activeConversationId: undefined,
      typingUsers: new Map(),
      scrollPositions: new Map(),
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
          if (typeof position === 'number' && position >= 0) {
            newScrollPositions.set(conversationId, position);
          }
          return { scrollPositions: newScrollPositions };
        });
      },
      
      getScrollPosition: (conversationId) => {
        const position = get().scrollPositions.get(conversationId);
        return (position !== null && position !== undefined && !Number.isNaN(position)) ? position : undefined;
      },
      
      // Reply state management
      replyTargets: new Map(),
      setReplyTarget: (conversationId, messageId) => {
        set((state) => {
          const newReplyTargets = new Map(state.replyTargets);
          if (messageId) {
            newReplyTargets.set(conversationId, messageId);
          } else {
            newReplyTargets.delete(conversationId);
          }
          return { replyTargets: newReplyTargets };
        });
      },
      getReplyTarget: (conversationId) => {
        return get().replyTargets.get(conversationId);
      },
      
      // Reset all state to initial values
      reset: () => {
        set({
          activeConversationId: undefined,
          typingUsers: new Map(),
          scrollPositions: new Map(),
          replyTargets: new Map(),
        });
      },
    }),
    {
      name: 'chat-ui-store',
    }
  )
); 