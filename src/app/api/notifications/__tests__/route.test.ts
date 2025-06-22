import { NextRequest } from 'next/server';
import { createSupabaseClient, mockUser } from '@/lib/test-utils';
import { GET, PATCH, DELETE } from '../route';

// Mock notification data factory
const mockNotification = (overrides: any = {}) => ({
  id: 'notification-123',
  user_id: 'user-123',
  title: 'Test Notification',
  message: 'Test message',
  type: 'info',
  read_at: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(() => createSupabaseClient()),
}));

// Mock logger and metrics
jest.mock('@/lib/utils/structured-logger', () => ({
  createAPILogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('@/lib/utils/metrics', () => ({
  recordAPIMetrics: jest.fn(),
  createMetricsTimer: jest.fn(() => jest.fn(() => 100)),
}));

jest.mock('@/lib/notifications/service', () => ({
  createNotificationService: jest.fn(() => ({
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
    deleteNotifications: jest.fn(),
  })),
}));

const createMockRequest = (overrides: Partial<any> = {}): NextRequest => {
  const url = overrides.url || 'http://localhost:3000/api/notifications';
  return {
    url,
    method: overrides.method || 'GET',
    headers: new Headers({
      'content-type': 'application/json',
    }),
    json: jest.fn().mockResolvedValue(overrides.body || {}),
    ...overrides,
  } as any;
};

describe('/api/notifications', () => {
  let mockSupabase: any;
  let mockNotificationService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createSupabaseClient();
    
    const { createNotificationService } = require('@/lib/notifications/service');
    mockNotificationService = createNotificationService();
  });

  describe('GET /api/notifications', () => {
    it('returns notifications for authenticated user', async () => {
      const mockNotifications = [
        mockNotification({ id: '1', title: 'Test Notification 1' }),
        mockNotification({ id: '2', title: 'Test Notification 2' }),
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser() },
        error: null,
      });

      mockNotificationService.getNotifications.mockResolvedValue({
        notifications: mockNotifications,
        success: true,
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        notifications: mockNotifications,
        success: true,
      });
    });

    it('returns 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'User not authenticated',
      });
    });

    it('handles service errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser() },
        error: null,
      });

      mockNotificationService.getNotifications.mockRejectedValue(
        new Error('Service error')
      );

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to fetch notifications',
      });
    });

    it('supports query parameters', async () => {
      const user = mockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user },
        error: null,
      });

      mockNotificationService.getNotifications.mockResolvedValue({
        notifications: [],
        success: true,
      });

      const request = createMockRequest({
        url: 'http://localhost:3000/api/notifications?limit=10&type=follow&read=false',
      });

      await GET(request);

      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith({
        limit: 10,
        type: 'follow',
        read: false,
      });
    });

    it('validates numeric parameters', async () => {
      const user = mockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user },
        error: null,
      });

      const request = createMockRequest({
        url: 'http://localhost:3000/api/notifications?limit=invalid',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Invalid limit or offset parameter',
      });
    });
  });

  describe('PATCH /api/notifications', () => {
    it('marks notifications as read', async () => {
      const user = mockUser();
      const notificationIds = ['notification-1', 'notification-2'];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user },
        error: null,
      });

      mockNotificationService.markAsRead.mockResolvedValue({
        success: true,
      });

      const request = createMockRequest({
        method: 'PATCH',
        body: { notification_ids: notificationIds },
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(notificationIds);
    });

    it('validates notification_ids format', async () => {
      const user = mockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user },
        error: null,
      });

      const request = createMockRequest({
        method: 'PATCH',
        body: { notification_ids: 'invalid-format' }, // Should be array
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'notification_ids must be an array',
      });
    });

    it('returns 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest({
        method: 'PATCH',
        body: { notification_ids: ['notification-1'] },
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'User not authenticated',
      });
    });

    it('handles service failures', async () => {
      const user = mockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user },
        error: null,
      });

      mockNotificationService.markAsRead.mockResolvedValue({
        success: false,
        error: 'Notifications not found',
      });

      const request = createMockRequest({
        method: 'PATCH',
        body: { notification_ids: ['notification-1'] },
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({
        error: 'Notifications not found',
      });
    });
  });

  describe('DELETE /api/notifications', () => {
    it('deletes notifications successfully', async () => {
      const user = mockUser();
      const notificationIds = ['notification-1', 'notification-2'];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user },
        error: null,
      });

      mockNotificationService.deleteNotifications.mockResolvedValue({
        success: true,
      });

      const request = createMockRequest({
        method: 'DELETE',
        body: { notification_ids: notificationIds },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockNotificationService.deleteNotifications).toHaveBeenCalledWith(notificationIds);
    });

    it('requires notification_ids array', async () => {
      const user = mockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user },
        error: null,
      });

      const request = createMockRequest({
        method: 'DELETE',
        body: { notification_ids: [] }, // Empty array
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'notification_ids array is required and cannot be empty',
      });
    });

    it('validates all IDs are non-empty strings', async () => {
      const user = mockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user },
        error: null,
      });

      const request = createMockRequest({
        method: 'DELETE',
        body: { notification_ids: ['valid-id', '', 'another-valid-id'] },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'All notification IDs must be non-empty strings',
      });
    });

    it('handles service errors', async () => {
      const user = mockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user },
        error: null,
      });

      mockNotificationService.deleteNotifications.mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const request = createMockRequest({
        method: 'DELETE',
        body: { notification_ids: ['notification-1'] },
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'Database error',
      });
    });
  });

  describe('Error handling', () => {
    it('handles auth service errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth service unavailable' },
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'User not authenticated',
      });
    });

    it('handles JSON parsing errors', async () => {
      const user = mockUser();
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user },
        error: null,
      });

      const request = createMockRequest({
        method: 'PATCH',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Failed to mark notifications as read',
      });
    });
  });
}); 