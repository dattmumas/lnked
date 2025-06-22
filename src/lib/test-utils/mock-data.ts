// Mock data factories for consistent test data across tests

export const createMockUser = (overrides = {}) => ({
  id: 'test-user-123',
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  avatar_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const createMockPost = (overrides = {}) => ({
  id: 'test-post-123',
  title: 'Test Post',
  content: 'This is test content',
  slug: 'test-post',
  published: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  author_id: 'test-user-123',
  collective_id: null,
  thumbnail_url: null,
  meta_description: null,
  ...overrides,
})

export const createMockConversation = (overrides = {}) => ({
  id: 'test-conversation-123',
  title: 'Test Conversation',
  type: 'direct' as const,
  is_private: true,
  created_by: 'test-user-123',
  collective_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const createMockMessage = (overrides = {}) => ({
  id: 'test-message-123',
  content: 'Test message content',
  conversation_id: 'test-conversation-123',
  sender_id: 'test-user-123',
  message_type: 'text' as const,
  reply_to_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  edited_at: null,
  deleted_at: null,
  ...overrides,
})

export const createMockCollective = (overrides = {}) => ({
  id: 'test-collective-123',
  name: 'Test Collective',
  slug: 'test-collective',
  description: 'A test collective',
  is_private: false,
  created_by: 'test-user-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const createMockVideo = (overrides = {}) => ({
  id: 'test-video-123',
  title: 'Test Video',
  description: 'A test video',
  mux_asset_id: 'test-mux-asset',
  mux_playback_id: 'test-playback-id',
  created_by: 'test-user-123',
  is_public: true,
  privacy_setting: 'public' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  ...overrides,
}) 