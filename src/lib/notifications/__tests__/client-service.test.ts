import { ClientNotificationService, clientNotificationService } from '../client-service';

import type { NotificationFilters } from '@/types/notifications';

// Mock the Supabase browser import first
jest.mock('@/lib/supabase/browser', () => ({
  createSupabaseBrowserClient: jest.fn(() => ({
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
    channel: jest.fn(),
    removeChannel: jest.fn(),
  })),
}));

// Mock data
const mockUser = {
  id: 'user-123',
  full_name: 'John Doe',
  username: 'johndoe',
  avatar_url: 'https://example.com/avatar.jpg',
};

const mockNotification = {
  id: 'notification-123',
  recipient_id: 'user-123',
  actor_id: 'user-456',
  type: 'post_like',
  title: 'Post liked',
  message: 'Alice liked your post',
  entity_type: 'post',
  entity_id: 'post-123',
  metadata: { post_title: 'Test Post' },
  read_at: null,
  created_at: '2025-01-21T12:00:00Z',
  updated_at: '2025-01-21T12:00:00Z',
  actor: {
    id: 'user-456',
    full_name: 'Alice Smith',
    username: 'alice',
    avatar_url: 'https://example.com/alice.jpg',
  },
};

describe('ClientNotificationService', () => {
  let service: ClientNotificationService;

  beforeEach(() => {
    service = new ClientNotificationService();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('getNotifications', () => {
    let mockSupabaseBrowserClient: any;

    beforeEach(() => {
      // Get the mocked Supabase client
      const { createSupabaseBrowserClient } = require('@/lib/supabase/browser');
      mockSupabaseBrowserClient = createSupabaseBrowserClient();
      
      mockSupabaseBrowserClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it('should fetch notifications for authenticated user', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockNotification],
          error: null,
          count: 1,
        }),
      };

      const mockCountQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({
          count: 3,
          error: null,
        }),
      };

      mockSupabaseBrowserClient.from
        .mockReturnValueOnce(mockQuery)
        .mockReturnValueOnce(mockCountQuery);

      const result = await service.getNotifications();

      expect(result).toEqual({
        notifications: [mockNotification],
        total_count: 1,
        unread_count: 3,
        has_more: false,
      });

      expect(mockQuery.select).toHaveBeenCalledWith(
        expect.stringContaining('actor:users'),
        { count: 'exact' }
      );
      expect(mockQuery.eq).toHaveBeenCalledWith('recipient_id', mockUser.id);
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockQuery.range).toHaveBeenCalledWith(0, 19);
    });

    it('should return empty result for unauthenticated user', async () => {
      mockSupabaseBrowserClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await service.getNotifications();

      expect(result).toEqual({
        notifications: [],
        total_count: 0,
        unread_count: 0,
        has_more: false,
      });
    });

    it('should use request caching for identical requests', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockNotification],
          error: null,
          count: 1,
        }),
      };

      const mockCountQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({
          count: 1,
          error: null,
        }),
      };

      mockSupabaseBrowserClient.from
        .mockReturnValue(mockQuery)
        .mockReturnValue(mockCountQuery);

      // First request
      const promise1 = service.getNotifications();
      
      // Second identical request should return same promise
      const promise2 = service.getNotifications();

      expect(promise1).toBe(promise2);

      await promise1;
      await promise2;

      // Should only call Supabase once due to caching
      expect(mockSupabaseBrowserClient.from).toHaveBeenCalledTimes(2);
    });
  });

  describe('singleton instance', () => {
    it('should export singleton instance', () => {
      expect(clientNotificationService).toBeInstanceOf(ClientNotificationService);
    });
  });
});
