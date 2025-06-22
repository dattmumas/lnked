import { NotificationService, createNotificationService, createFollowNotification, createPostLikeNotification } from '../service';

// Mock the Supabase imports with inline factory functions
jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
    })),
    auth: {
      getUser: jest.fn(),
    },
    rpc: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  })),
}));

jest.mock('@/lib/supabase/browser', () => ({
  default: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
    })),
    auth: {
      getUser: jest.fn(),
    },
    rpc: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  },
}));

// Mock data helpers
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
};

const mockNotification = {
  id: 'notification-123',
  recipient_id: 'user-123',
  actor_id: 'actor-456', 
  type: 'post_like' as const,
  title: 'Post Liked',
  message: 'Someone liked your post',
  entity_type: 'post' as const,
  entity_id: 'post-789',
  metadata: {},
  read_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockPreferences = {
  id: 'pref-123',
  user_id: 'user-123',
  notification_type: 'post_like',
  email_enabled: true,
  push_enabled: true,
  in_app_enabled: true,
  created_at: '2025-01-21T12:00:00Z',
  updated_at: '2025-01-21T12:00:00Z',
};

describe('NotificationService', () => {
  let service: NotificationService;
  let mockSupabaseClient: any;

  beforeEach(() => {
    service = new NotificationService();
    // Get reference to the mocked client
    const { createServerSupabaseClient } = require('@/lib/supabase/server');
    mockSupabaseClient = createServerSupabaseClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getNotifications', () => {
    it('should fetch notifications with default pagination', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockResolvedValue({
        range: jest.fn().mockResolvedValue({
          data: [mockNotification],
          error: null,
          count: 1,
        }),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
          count: 0,
        }),
      });

      const result = await service.getNotifications();

      expect(result.notifications).toHaveLength(1);
      expect(result.total_count).toBe(1);
      expect(result.unread_count).toBe(0);
    });

    it('should apply filters correctly', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockResolvedValue({
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      });

      await service.getNotifications({ type: 'post_like', read: false, limit: 10 });

      expect(mockSupabaseClient.from.mock.calls[0][0].eq).toHaveBeenCalledWith('type', 'post_like');
      expect(mockSupabaseClient.from.mock.calls[0][0].is).toHaveBeenCalledWith('read_at', null);
      expect(mockSupabaseClient.from.mock.calls[0][0].range).toHaveBeenCalledWith(0, 9); // offset 0, limit 10 -> range 0-9
    });

    it('should handle errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockResolvedValue({
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: 0,
        }),
      });

      await expect(service.getNotifications()).rejects.toThrow('Failed to fetch notifications: Database error');
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockSupabaseClient.from.mockResolvedValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
          count: 5,
        }),
      });

      const count = await service.getUnreadCount();
      expect(count).toBe(5);
    });

    it('should return 0 on error', async () => {
      mockSupabaseClient.from.mockResolvedValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Error' },
          count: null,
        }),
      });

      const count = await service.getUnreadCount();
      expect(count).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark specific notifications as read', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockResolvedValue({
        update: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const result = await service.markAsRead(['notification-1', 'notification-2']);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from.mock.calls[0][0].update).toHaveBeenCalled();
      expect(mockSupabaseClient.from.mock.calls[0][0].in).toHaveBeenCalledWith('id', ['notification-1', 'notification-2']);
    });

    it('should mark all notifications as read when no IDs provided', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockResolvedValue({
        update: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const result = await service.markAsRead();

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from.mock.calls[0][0].update).toHaveBeenCalled();
      expect(mockSupabaseClient.from.mock.calls[0][0].eq).toHaveBeenCalledWith('recipient_id', mockUser.id);
    });

    it('should return error for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await service.markAsRead(['notification-1']);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });

    it('should handle database errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockResolvedValue({
        update: jest.fn().mockResolvedValue({
          error: { message: 'Update failed' },
        }),
      });

      const result = await service.markAsRead(['notification-1']);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('deleteNotifications', () => {
    it('should delete specified notifications', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockResolvedValue({
        delete: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const result = await service.deleteNotifications(['notification-1']);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from.mock.calls[0][0].delete).toHaveBeenCalled();
    });

    it('should return error for empty notification IDs', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await service.deleteNotifications([]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No notifications specified');
    });

    it('should return error for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await service.deleteNotifications(['notification-1']);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });
  });

  describe('createNotification', () => {
    it('should create notification via RPC', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: { id: 'new-notification' },
        error: null,
      });

      const result = await service.createNotification({
        recipient_id: 'user-123',
        actor_id: 'actor-456',
        type: 'post_like',
        title: 'Post Liked',
        message: 'Someone liked your post',
      });

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_notification', expect.any(Object));
    });

    it('should handle RPC errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      const result = await service.createNotification({
        recipient_id: 'user-123',
        actor_id: 'actor-456',
        type: 'post_like',
        title: 'Post Liked',
        message: 'Someone liked your post',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('RPC failed');
    });
  });

  describe('preferences management', () => {
    it('should get preferences', async () => {
      mockSupabaseClient.from.mockResolvedValue({
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'pref-1',
              user_id: 'user-123',
              notification_type: 'post_like',
              email_enabled: true,
              push_enabled: false,
              in_app_enabled: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          error: null,
        }),
      });

      const preferences = await service.getPreferences();

      expect(preferences).toHaveLength(1);
      expect(preferences[0].notification_type).toBe('post_like');
    });

    it('should update preferences', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockResolvedValue({
        upsert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const result = await service.updatePreferences([
        {
          notification_type: 'post_like',
          email_enabled: false,
        },
      ]);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from.mock.calls[0][0].upsert).toHaveBeenCalled();
    });
  });

  describe('real-time subscriptions', () => {
    it('should set up real-time subscription', () => {
      // Mock window for browser environment
      Object.defineProperty(window, 'window', {
        value: {},
        writable: true,
      });

      const callback = jest.fn();
      const unsubscribe = service.subscribeToNotifications('user-123', callback);

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('notifications:user-123');
      expect(mockSupabaseClient.from.mock.calls[0][0].on).toHaveBeenCalled();
      expect(mockSupabaseClient.from.mock.calls[0][0].subscribe).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should return null for server-side subscription', () => {
      // Remove window to simulate server environment
      Object.defineProperty(window, 'window', {
        value: undefined,
        writable: true,
      });

      const callback = jest.fn();
      const unsubscribe = service.subscribeToNotifications('user-123', callback);

      expect(unsubscribe).toBeNull();
    });

    it('should return null for empty user ID', () => {
      const callback = jest.fn();
      const unsubscribe = service.subscribeToNotifications('', callback);

      expect(unsubscribe).toBeNull();
    });
  });

  describe('factory function', () => {
    it('should create NotificationService instance', () => {
      const instance = createNotificationService();
      expect(instance).toBeInstanceOf(NotificationService);
    });
  });

  describe('helper functions', () => {
         it('should create follow notification', async () => {
       // Mock the service creation
       const serviceSpy = jest.spyOn(require('../service'), 'createNotificationService');
       serviceSpy.mockReturnValue({
         createNotification: jest.fn().mockResolvedValue({ success: true }),
       });

       const result = await createFollowNotification('follower-123', 'following-456', 'user');

       expect(result.success).toBe(true);
     });

         it('should create post like notification', async () => {
       // Mock parallel calls
       const mockPromiseAll = jest.spyOn(Promise, 'all');
       mockPromiseAll.mockResolvedValue([
         { data: { full_name: 'Test User', username: 'testuser' } },
         { data: { author_id: 'author-123', title: 'Test Post' } },
       ]);

       const serviceSpy = jest.spyOn(require('../service'), 'createNotificationService');
       serviceSpy.mockReturnValue({
         createNotification: jest.fn().mockResolvedValue({ success: true }),
       });

       const result = await createPostLikeNotification('user-123', 'post-456');

       expect(result.success).toBe(true);
     });
  });
}); 