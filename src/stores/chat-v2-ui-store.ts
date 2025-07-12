import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import {
  ChatMessage,
  ChatUser,
  TypingState,
  ComposerState,
} from '@/types/chat-v2';

interface ChatV2UIState {
  // Composer state
  composer: ComposerState;

  // Typing indicators
  typingUsers: TypingState;

  // Online presence
  onlineUsers: Record<string, ChatUser>;

  // UI state
  sidebarOpen: boolean;

  // Actions
  setComposerContent: (content: string) => void;
  setReplyTo: (message: ChatMessage | null) => void;
  addAttachment: (file: File) => void;
  removeAttachment: (id: string) => void;
  updateAttachment: (
    id: string,
    updates: Partial<import('@/types/chat-v2').AttachmentFile>,
  ) => void;
  clearComposer: () => void;

  // Typing indicators
  setUserTyping: (userId: string, user: ChatUser) => void;
  removeUserTyping: (userId: string) => void;
  clearTypingUsers: () => void;

  // Presence
  setUserOnline: (user: ChatUser) => void;
  setUserOffline: (userId: string) => void;
  clearOnlineUsers: () => void;

  // UI
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useChatV2UIStore = create<ChatV2UIState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    composer: {
      content: '',
      reply_to: null,
      attachments: [],
    },
    typingUsers: {},
    onlineUsers: {},
    sidebarOpen: true,

    // Composer actions
    setComposerContent: (content) =>
      set((state) => ({
        composer: { ...state.composer, content },
      })),

    setReplyTo: (message) =>
      set((state) => ({
        composer: { ...state.composer, reply_to: message },
      })),

    addAttachment: (file) => {
      const id = crypto.randomUUID();
      set((state) => ({
        composer: {
          ...state.composer,
          attachments: [
            ...state.composer.attachments,
            {
              id,
              file,
              uploading: false,
              uploaded: false,
            },
          ],
        },
      }));
    },

    removeAttachment: (id) =>
      set((state) => ({
        composer: {
          ...state.composer,
          attachments: state.composer.attachments.filter((a) => a.id !== id),
        },
      })),

    updateAttachment: (id, updates) =>
      set((state) => ({
        composer: {
          ...state.composer,
          attachments: state.composer.attachments.map((a) =>
            a.id === id ? { ...a, ...updates } : a,
          ),
        },
      })),

    clearComposer: () =>
      set((state) => ({
        composer: {
          content: '',
          reply_to: null,
          attachments: [],
        },
      })),

    // Typing indicators
    setUserTyping: (userId, user) =>
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [userId]: {
            user,
            timestamp: Date.now(),
          },
        },
      })),

    removeUserTyping: (userId) =>
      set((state) => {
        const { [userId]: removed, ...rest } = state.typingUsers;
        return { typingUsers: rest };
      }),

    clearTypingUsers: () => set({ typingUsers: {} }),

    // Presence
    setUserOnline: (user) =>
      set((state) => ({
        onlineUsers: {
          ...state.onlineUsers,
          [user.id]: { ...user, online: true },
        },
      })),

    setUserOffline: (userId) =>
      set((state) => {
        const { [userId]: removed, ...rest } = state.onlineUsers;
        return { onlineUsers: rest };
      }),

    clearOnlineUsers: () => set({ onlineUsers: {} }),

    // UI
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    setSidebarOpen: (open) => set({ sidebarOpen: open }),
  })),
);

// Cleanup typing indicators after 3 seconds of inactivity
setInterval(() => {
  const { typingUsers, removeUserTyping } = useChatV2UIStore.getState();
  const now = Date.now();

  Object.entries(typingUsers).forEach(([userId, state]) => {
    if (now - state.timestamp > 3000) {
      removeUserTyping(userId);
    }
  });
}, 1000);
