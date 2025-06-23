import { NextRequest } from 'next/server';
import {
  createMockSupabaseClient,
  createMockUser,
} from '@/lib/test-utils';

import { POST } from '../route';

// Mock Supabase server client factory
jest.mock('@/lib/supabase/server', () => ({
  // Always return a fresh mock client so tests remain isolated
  createServerSupabaseClient: jest.fn(() => createMockSupabaseClient()),
}));

// Utility to create a mock Request compatible with the route handler
const createMockRequest = (
  body: Record<string, unknown>,
  overrides: Partial<Request> = {},
): Request => {
  const jsonBody = JSON.stringify(body);
  return {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: jest.fn().mockResolvedValue(body),
    // Provide minimal fields accessed by the handler
    ...overrides,
  } as unknown as Request;
};

describe('/api/chat/conversations POST', () => {
  const mockSupabase = createMockSupabaseClient() as any;
  const currentUser = createMockUser();

  beforeEach(() => {
    jest.clearAllMocks();

    // Return authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: currentUser },
      error: null,
    });
  });

  it('creates a direct conversation successfully and returns the conversation payload', async () => {
    const otherUserId = 'other-user-555';
    const conversationPayload = {
      id: 'conv-123',
      type: 'group',
      title: 'Chat with Bob',
      description: null,
      is_private: false,
      created_by: currentUser.id,
      last_message_at: new Date().toISOString(),
    };

    // ---- Mock database calls ----
    // 1. Insert into conversations – chain: insert().select().single()
    const singleMock = jest.fn().mockResolvedValue({
      data: conversationPayload,
      error: null,
    });
    const selectMock = jest.fn(() => ({ single: singleMock }));
    const insertMock = jest.fn(() => ({ select: selectMock }));

    // 2. Insert participants – returns { error: null }
    const insertParticipantsMock = jest.fn().mockResolvedValue({ error: null });

    // Configure mockSupabase.from
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'conversations') {
        return {
          insert: insertMock,
        } as any;
      }
      if (table === 'conversation_participants') {
        return {
          insert: insertParticipantsMock,
        } as any;
      }
      // Default fallback query builder
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      } as any;
    });

    // ---- Execute the handler ----
    const requestBody = {
      type: 'group',
      title: 'Chat with Bob',
      participant_ids: [otherUserId],
      is_private: false,
    };

    const request = createMockRequest(requestBody);
    // @ts-ignore – Our mock Request satisfies the minimal interface required
    const response = await POST(request);
    const { conversation, existing } = await response.json();

    // ---- Assertions ----
    expect(response.status).toBe(200);
    expect(existing).toBe(false);
    expect(conversation).toEqual(conversationPayload);

    // Verify Supabase interactions
    expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
    expect(insertMock).toHaveBeenCalled();
    expect(insertParticipantsMock).toHaveBeenCalledWith([
      expect.objectContaining({ user_id: currentUser.id, role: 'admin' }),
      expect.objectContaining({ user_id: otherUserId, role: 'member' }),
    ]);
  });
}); 