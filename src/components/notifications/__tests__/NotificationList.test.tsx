import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { NotificationList } from '../NotificationList';

import type { Notification } from '../../../types/notifications';

// Mock server actions
jest.mock('@/app/actions/notificationActions', () => ({
  markNotificationsAsRead: jest.fn(),
  deleteNotifications: jest.fn(),
}));

// Mock UI components
jest.mock('../../../components/ui/button', () => ({
  Button: ({ children, onClick, variant, disabled, ...props }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      data-variant={variant}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('../../../components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

jest.mock('../../../components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
  }: {
    children: React.ReactNode;
    variant?: string;
  }) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}));

jest.mock('../../../components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

jest.mock('../../../components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div
      data-testid="tabs"
      data-value={value}
      data-onvaluechange={onValueChange}
    >
      {children}
    </div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children, value, onClick }: any) => (
    <button data-testid="tab-trigger" data-value={value} onClick={onClick}>
      {children}
    </button>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-content">{children}</div>
  ),
}));

// Mock NotificationItem component
jest.mock('../NotificationItem', () => ({
  NotificationItem: ({ notification }: { notification: Notification }) => (
    <div data-testid="notification-item" data-notification-id={notification.id}>
      <span>{notification.title}</span>
      <span data-testid="notification-message">{notification.message}</span>
    </div>
  ),
}));

// Mock fetch
global.fetch = jest.fn();

describe('NotificationList', () => {
  const mockNotifications: Notification[] = [
    {
      id: '1',
      recipient_id: 'user-123',
      actor_id: 'user-456',
      type: 'follow',
      title: 'New follower',
      message: 'Alice started following you',
      entity_type: 'user',
      entity_id: 'user-456',
      metadata: { actorUsername: 'alice' },
      read_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      recipient_id: 'user-123',
      actor_id: 'user-789',
      type: 'post_like',
      title: 'Post Liked',
      message: 'Alice liked your post',
      entity_type: 'post',
      entity_id: 'post-123',
      metadata: { postSlug: 'my-post' },
      read_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('rendering', () => {
    it('should render with initial notifications', () => {
      render(
        <NotificationList
          initialNotifications={mockNotifications}
          initialUnreadCount={1}
        />,
      );

      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getAllByTestId('notification-item')).toHaveLength(2);
      expect(screen.getByText('New follower')).toBeInTheDocument();
      expect(screen.getByText('Post Liked')).toBeInTheDocument();
    });

    it('should show unread count badge', () => {
      render(
        <NotificationList
          initialNotifications={mockNotifications}
          initialUnreadCount={3}
        />,
      );

      const badge = screen.getByTestId('badge');
      expect(badge).toHaveTextContent('3');
      expect(badge).toHaveAttribute('data-variant', 'destructive');
    });

    it('should not show unread badge when count is 0', () => {
      render(
        <NotificationList
          initialNotifications={mockNotifications}
          initialUnreadCount={0}
        />,
      );

      expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
    });

    it('should show mark all read button when there are unread notifications', () => {
      render(
        <NotificationList
          initialNotifications={mockNotifications}
          initialUnreadCount={2}
        />,
      );

      expect(screen.getByText('Mark All Read')).toBeInTheDocument();
    });

    it('should not show mark all read button when no unread notifications', () => {
      render(
        <NotificationList
          initialNotifications={mockNotifications}
          initialUnreadCount={0}
        />,
      );

      expect(screen.queryByText('Mark All Read')).not.toBeInTheDocument();
    });

    it('should render empty state when no initial notifications and API returns empty', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notifications: [],
          unread_count: 0,
          has_more: false,
        }),
      });

      render(<NotificationList />);

      await waitFor(() => {
        expect(screen.getByText('No notifications')).toBeInTheDocument();
        expect(
          screen.getByText("You don't have any notifications yet."),
        ).toBeInTheDocument();
      });
    });
  });

  describe('tab filtering', () => {
    it('should render filter tabs', () => {
      render(
        <NotificationList
          initialNotifications={mockNotifications}
          initialUnreadCount={1}
        />,
      );

      expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Unread')).toBeInTheDocument();
      expect(screen.getByText('Follows')).toBeInTheDocument();
    });

    it('should show unread count in unread tab', () => {
      render(
        <NotificationList
          initialNotifications={mockNotifications}
          initialUnreadCount={3}
        />,
      );

      expect(screen.getByText(/Unread.*\(3\)/)).toBeInTheDocument();
    });

    it('should not show count in unread tab when count is 0', () => {
      render(
        <NotificationList
          initialNotifications={mockNotifications}
          initialUnreadCount={0}
        />,
      );

      const unreadText = screen.getByText('Unread');
      expect(unreadText.textContent).toBe('Unread');
      expect(unreadText.textContent).not.toMatch(/\(\d+\)/);
    });
  });

  describe('API integration', () => {
    it('should fetch notifications on mount when no initial data', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notifications: mockNotifications,
          unread_count: 2,
          has_more: false,
        }),
      });

      render(<NotificationList />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/notifications?');
      });
    });

    it('should handle API errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      render(<NotificationList />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error fetching notifications:',
          expect.any(Error),
        );
      });

      consoleSpy.mockRestore();
    });

    it('should show loading skeletons when fetching data', async () => {
      // Delay the fetch to see loading state
      (fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    notifications: [],
                    unread_count: 0,
                    has_more: false,
                  }),
                }),
              100,
            ),
          ),
      );

      render(<NotificationList />);

      expect(screen.getAllByTestId('skeleton')).toHaveLength(15); // 5 skeletons × 3 elements each
    });
  });

  describe('load more functionality', () => {
    it('should show load more button when there are more notifications', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notifications: mockNotifications,
          unread_count: 2,
          has_more: true,
        }),
      });

      render(<NotificationList />);

      await waitFor(() => {
        expect(screen.getByText('Load More')).toBeInTheDocument();
      });
    });

    it('should not show load more button when no more notifications', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notifications: mockNotifications,
          unread_count: 2,
          has_more: false,
        }),
      });

      render(<NotificationList />);

      await waitFor(() => {
        expect(screen.queryByText('Load More')).not.toBeInTheDocument();
      });
    });

    it('should fetch more notifications when load more is clicked', async () => {
      const user = userEvent.setup();

      // Initial fetch
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notifications: mockNotifications,
          unread_count: 2,
          has_more: true,
        }),
      });

      // Load more fetch
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notifications: [{ ...mockNotifications[0], id: 'notification-3' }],
          unread_count: 2,
          has_more: false,
        }),
      });

      render(<NotificationList />);

      await waitFor(() => {
        expect(screen.getByText('Load More')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Load More'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/notifications?offset=2&limit=20',
        );
      });
    });
  });

  describe('mark all as read functionality', () => {
    it('should call mark as read action when mark all read is clicked', async () => {
      const {
        markNotificationsAsRead,
      } = require('@/app/actions/notificationActions');
      markNotificationsAsRead.mockResolvedValue({ success: true });

      const user = userEvent.setup();

      render(
        <NotificationList
          initialNotifications={mockNotifications}
          initialUnreadCount={2}
        />,
      );

      await user.click(screen.getByText('Mark All Read'));

      expect(markNotificationsAsRead).toHaveBeenCalledWith(undefined);
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <NotificationList
          initialNotifications={mockNotifications}
          initialUnreadCount={1}
        />,
      );

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        'Notifications',
      );
    });

    it('should use proper ARIA structure for tabs', () => {
      render(
        <NotificationList
          initialNotifications={mockNotifications}
          initialUnreadCount={1}
        />,
      );

      expect(screen.getByTestId('tabs')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
    });
  });

  describe('custom styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <NotificationList
          initialNotifications={mockNotifications}
          className="custom-notification-list"
        />,
      );

      expect(container.firstChild).toHaveClass('custom-notification-list');
    });
  });

  it('filters notifications by type', async () => {
    const user = userEvent.setup();

    expect(screen.getByText('New follower')).toBeInTheDocument();
    expect(screen.queryByText('Post Liked')).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'post_like' }));
    expect(screen.getByText('Post Liked')).toBeInTheDocument();
    expect(screen.queryByText('New follower')).not.toBeInTheDocument();

    await user.click(screen.getByText('Follows'));
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/notifications?type=follow');
    });
  });

  it('shows only unread notifications when filter is "unread"', async () => {
    expect(screen.getByText('New follower')).toBeInTheDocument();
    expect(screen.getByText('Post Liked')).toBeInTheDocument();
  });
});
