// API Routes - Centralized endpoint definitions
export const API_ROUTES = {
  // Collective-related endpoints
  COLLECTIVE_CHANNELS: (collectiveId: string, limit?: number) =>
    `/api/collectives/${collectiveId}/channels${limit !== undefined && limit !== null ? `?limit=${limit}` : ''}`,

  COLLECTIVE_DETAILS: (collectiveId: string) =>
    `/api/collectives/${collectiveId}`,

  COLLECTIVE_STRIPE_ONBOARD: (collectiveId: string) =>
    `/api/collectives/${collectiveId}/stripe-onboard`,

  // Chat conversation endpoints
  // CHAT_CONVERSATIONS: '/api/chat/conversations', // REMOVED: Use tenant-scoped /api/tenants/[tenantId]/conversations instead
  CHAT_DIRECT: '/api/chat/direct',
  CHAT_GROUP: '/api/chat/group',
  CHAT_SEARCH: '/api/chat/search',
  CHAT_LINK_PREVIEW: '/api/chat/link-preview',

  // Chat conversation-specific endpoints
  CHAT_CONVERSATION_MESSAGES: (conversationId: string) =>
    `/api/chat/${conversationId}/messages`,

  CHAT_CONVERSATION_MESSAGE: (conversationId: string) =>
    `/api/chat/${conversationId}/message`,

  CHAT_CONVERSATION_READ: (conversationId: string) =>
    `/api/chat/${conversationId}/read`,

  // Message-specific endpoints
  CHAT_MESSAGE_REACTIONS: (messageId: string) =>
    `/api/chat/messages/${messageId}/reactions`,

  CHAT_MESSAGE_EDIT: (conversationId: string, messageId: string) =>
    `/api/chat/${conversationId}/messages/${messageId}`,

  // Delete chat for current user
  CHAT_CONVERSATION_DELETE_FOR_ME: (conversationId: string) =>
    `/api/chat/${conversationId}/delete`,

  // Delete specific message (same as edit path, but convenience)
  CHAT_MESSAGE_DELETE: (conversationId: string, messageId: string) =>
    `/api/chat/${conversationId}/messages/${messageId}`,
} as const;

// Type helper for API route functions
export type ApiRouteFunction = (...args: string[]) => string;
export type ApiRouteConstant = string;
export type ApiRoute = ApiRouteFunction | ApiRouteConstant;
