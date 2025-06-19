import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Mock the Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(),
}));

describe('Chat Conversations API', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      in: jest.fn(() => mockSupabase),
      order: jest.fn(() => mockSupabase),
      single: jest.fn(() => mockSupabase),
      insert: jest.fn(() => mockSupabase),
      delete: jest.fn(() => mockSupabase),
      gt: jest.fn(() => mockSupabase),
      neq: jest.fn(() => mockSupabase),
    };

    (createServerSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/chat/conversations', () => {
    it('should reject unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return empty array when user has no conversations', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        ...mockSupabase,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.conversations).toEqual([]);
    });

    it('should return conversations with unread counts and participants', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-456';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      // Mock conversation participants query
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'conversation_participants') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [{
                    conversation_id: conversationId,
                    last_read_at: '2024-01-01T00:00:00Z',
                    conversations: {
                      id: conversationId,
                      title: 'Test Conversation',
                      type: 'group',
                      description: 'Test description',
                      is_private: false,
                      last_message_at: '2024-01-02T00:00:00Z',
                      created_at: '2024-01-01T00:00:00Z',
                      created_by: userId,
                    },
                  }],
                  error: null,
                }),
              }),
            }),
          };
        }
        
        if (table === 'messages') {
          return {
            select: jest.fn().mockImplementation((query, options) => {
              if (options?.count === 'exact' && options?.head === true) {
                // Unread count query
                return {
                  eq: jest.fn().mockReturnValue({
                    gt: jest.fn().mockReturnValue({
                      neq: jest.fn().mockResolvedValue({
                        count: 5,
                        error: null,
                      }),
                    }),
                  }),
                };
              }
              // Last messages query
              return {
                in: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: [{
                      id: 'msg-789',
                      conversation_id: conversationId,
                      content: 'Last message',
                      created_at: '2024-01-02T00:00:00Z',
                      sender: {
                        id: 'sender-123',
                        username: 'testuser',
                        full_name: 'Test User',
                        avatar_url: 'https://example.com/avatar.jpg',
                      },
                    }],
                    error: null,
                  }),
                }),
              };
            }),
          };
        }

        return mockSupabase;
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.conversations).toHaveLength(1);
      expect(data.conversations[0]).toMatchObject({
        id: conversationId,
        title: 'Test Conversation',
        unread_count: 5,
        last_message: {
          id: 'msg-789',
          content: 'Last message',
          sender: {
            username: 'testuser',
          },
        },
      });
    });
  });

  describe('POST /api/chat/conversations', () => {
    it('should create a new group conversation', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-new';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      mockSupabase.insert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: conversationId,
              title: 'New Group',
              type: 'group',
              created_by: userId,
            },
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'conversations') {
          return mockSupabase;
        }
        if (table === 'conversation_participants') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return mockSupabase;
      });

      const request = new Request('http://localhost:3000/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Group',
          type: 'group',
          participant_ids: ['user-456', 'user-789'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.conversation).toMatchObject({
        id: conversationId,
        title: 'New Group',
        type: 'group',
      });
      expect(data.existing).toBe(false);
    });

    it('should return existing direct conversation if already exists', async () => {
      const userId = 'user-123';
      const otherUserId = 'user-456';
      const existingConvId = 'conv-existing';
      
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'conversations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({
                  data: [{
                    id: existingConvId,
                    type: 'direct',
                    conversation_participants: [
                      { user_id: userId },
                      { user_id: otherUserId },
                    ],
                  }],
                  error: null,
                }),
              }),
            }),
          };
        }
        return mockSupabase;
      });

      const request = new Request('http://localhost:3000/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({
          type: 'direct',
          participant_ids: [otherUserId],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.conversation.id).toBe(existingConvId);
      expect(data.existing).toBe(true);
    });

    it('should validate conversation type', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const request = new Request('http://localhost:3000/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({
          type: 'invalid-type',
          participant_ids: ['user-456'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid conversation type');
    });
  });
}); 