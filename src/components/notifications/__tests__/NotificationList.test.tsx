import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { NotificationList } from '../NotificationList';

import type { Notification } from '@/types/notifications';

// Mock NotificationItem component
jest.mock('../NotificationItem', () => ({
  NotificationItem: ({ notification, onMarkAsRead, onDelete }: any) => (
    <div data-testid="notification-item" data-notification-id={notification.id}>
      <span>{notification.title}</span>
      <button onClick={() => onMarkAsRead?.(notification.id)}>Mark Read</button>
      <button onClick={() => onDelete?.(notification.id)}>Delete</button>
    </div>
  ),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
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

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// Mock Intersection Observer for infinite scroll
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

describe('NotificationList', () => {
  const mockOnMarkAsRead = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnMarkAllRead = jest.fn();
  const mockOnLoadMore = jest.fn();

  const sampleNotifications: Notification[] = [
    {
      id: 'notification-1',
      recipient_id: 'user-123',
      actor_id: 'user-456',
      type: 'post_like',
      title: 'Post liked',
      message: 'Alice liked your post',
      entity_type: 'post',
      entity_id: 'post-123',
      metadata: {},
      read_at: null,
      created_at: '2025-01-21T12:00:00Z',
      updated_at: '2025-01-21T12:00:00Z',
      actor: {
        id: 'user-456',
        full_name: 'Alice Smith',
        username: 'alice',
        avatar_url: 'https://example.com/alice.jpg',
      },
    },
    {
      id: 'notification-2',
      recipient_id: 'user-123',
      actor_id: 'user-789',
      type: 'comment',
      title: 'New comment',
      message: 'Bob commented on your post',
      entity_type: 'post',
      entity_id: 'post-456',
      metadata: {},
      read_at: '2025-01-21T11:00:00Z',
      created_at: '2025-01-21T11:00:00Z',
      updated_at: '2025-01-21T11:00:00Z',
      actor: {
        id: 'user-789',
        full_name: 'Bob Johnson',
        username: 'bob',
        avatar_url: null,
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render list of notifications', () => {
      render(
        <NotificationList
          notifications={sampleNotifications}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      expect(screen.getAllByTestId('notification-item')).toHaveLength(2);
      expect(screen.getByText('Post liked')).toBeInTheDocument();
      expect(screen.getByText('New comment')).toBeInTheDocument();
    });

    it('should render empty state when no notifications', () => {
      render(
        <NotificationList
          notifications={[]}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      expect(screen.getByText('No notifications')).toBeInTheDocument();
      expect(
        screen.getByText(
          'All caught up! Check back later for new notifications.',
        ),
      ).toBeInTheDocument();
      expect(screen.queryByTestId('notification-item')).not.toBeInTheDocument();
    });

    it('should render loading skeletons when loading', () => {
      render(
        <NotificationList
          notifications={[]}
          loading={true}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      expect(screen.getAllByTestId('skeleton')).toHaveLength(5); // Default skeleton count
    });

    it('should show mark all as read button when there are unread notifications', () => {
      const unreadNotifications = [
        { ...sampleNotifications[0], read_at: null },
        { ...sampleNotifications[1], read_at: null },
      ];

      render(
        <NotificationList
          notifications={unreadNotifications}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      expect(screen.getByText('Mark all as read')).toBeInTheDocument();
    });

    it('should not show mark all as read button when all notifications are read', () => {
      const readNotifications = [
        { ...sampleNotifications[0], read_at: '2025-01-21T12:00:00Z' },
        { ...sampleNotifications[1], read_at: '2025-01-21T12:00:00Z' },
      ];

      render(
        <NotificationList
          notifications={readNotifications}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument();
    });

    it('should show load more button when hasMore is true', () => {
      render(
        <NotificationList
          notifications={sampleNotifications}
          hasMore={true}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
          onLoadMore={mockOnLoadMore}
        />,
      );

      expect(screen.getByText('Load more')).toBeInTheDocument();
    });

    it('should not show load more button when hasMore is false', () => {
      render(
        <NotificationList
          notifications={sampleNotifications}
          hasMore={false}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
          onLoadMore={mockOnLoadMore}
        />,
      );

      expect(screen.queryByText('Load more')).not.toBeInTheDocument();
    });

    it('should show loading state for load more button', () => {
      render(
        <NotificationList
          notifications={sampleNotifications}
          hasMore={true}
          loadingMore={true}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
          onLoadMore={mockOnLoadMore}
        />,
      );

      const loadMoreButton = screen.getByTestId('button');
      expect(loadMoreButton).toBeDisabled();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call onMarkAllRead when clicking mark all as read button', async () => {
      const user = userEvent.setup();

      render(
        <NotificationList
          notifications={sampleNotifications}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      await user.click(screen.getByText('Mark all as read'));

      expect(mockOnMarkAllRead).toHaveBeenCalledTimes(1);
    });

    it('should call onLoadMore when clicking load more button', async () => {
      const user = userEvent.setup();

      render(
        <NotificationList
          notifications={sampleNotifications}
          hasMore={true}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
          onLoadMore={mockOnLoadMore}
        />,
      );

      await user.click(screen.getByText('Load more'));

      expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
    });

    it('should pass onMarkAsRead to NotificationItem components', async () => {
      const user = userEvent.setup();

      render(
        <NotificationList
          notifications={sampleNotifications}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      const markReadButtons = screen.getAllByText('Mark Read');
      await user.click(markReadButtons[0]);

      expect(mockOnMarkAsRead).toHaveBeenCalledWith('notification-1');
    });

    it('should pass onDelete to NotificationItem components', async () => {
      const user = userEvent.setup();

      render(
        <NotificationList
          notifications={sampleNotifications}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[1]);

      expect(mockOnDelete).toHaveBeenCalledWith('notification-2');
    });
  });

  describe('infinite scroll', () => {
    it('should set up intersection observer for infinite scroll', () => {
      render(
        <NotificationList
          notifications={sampleNotifications}
          hasMore={true}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
          onLoadMore={mockOnLoadMore}
        />,
      );

      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    it('should call onLoadMore when sentinel comes into view', async () => {
      const mockObserve = jest.fn();
      const mockIntersectionCallback = jest.fn();

      mockIntersectionObserver.mockImplementation((callback) => {
        mockIntersectionCallback.mockImplementation(callback);
        return {
          observe: mockObserve,
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        };
      });

      render(
        <NotificationList
          notifications={sampleNotifications}
          hasMore={true}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
          onLoadMore={mockOnLoadMore}
        />,
      );

      // Simulate intersection
      mockIntersectionCallback([{ isIntersecting: true }]);

      expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
    });

    it('should not trigger infinite scroll when already loading', async () => {
      const mockObserve = jest.fn();
      const mockIntersectionCallback = jest.fn();

      mockIntersectionObserver.mockImplementation((callback) => {
        mockIntersectionCallback.mockImplementation(callback);
        return {
          observe: mockObserve,
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        };
      });

      render(
        <NotificationList
          notifications={sampleNotifications}
          hasMore={true}
          loadingMore={true}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
          onLoadMore={mockOnLoadMore}
        />,
      );

      // Simulate intersection while loading
      mockIntersectionCallback([{ isIntersecting: true }]);

      expect(mockOnLoadMore).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle missing onMarkAllRead callback', async () => {
      const user = userEvent.setup();

      render(
        <NotificationList
          notifications={sampleNotifications}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
        />,
      );

      // Should not crash when mark all button is not shown
      expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument();
    });

    it('should handle missing onLoadMore callback', () => {
      render(
        <NotificationList
          notifications={sampleNotifications}
          hasMore={true}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      // Should not show load more button without onLoadMore
      expect(screen.queryByText('Load more')).not.toBeInTheDocument();
    });

    it('should handle notification without actor gracefully', () => {
      const notificationWithoutActor = {
        ...sampleNotifications[0],
        actor: null,
      };

      render(
        <NotificationList
          notifications={[notificationWithoutActor]}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      expect(screen.getByTestId('notification-item')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <NotificationList
          notifications={sampleNotifications}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(
        <NotificationList
          notifications={sampleNotifications}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        'Notifications',
      );
    });

    it('should announce empty state to screen readers', () => {
      render(
        <NotificationList
          notifications={[]}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      expect(screen.getByRole('status')).toHaveTextContent('No notifications');
    });
  });

  describe('performance', () => {
    it('should render large lists efficiently', () => {
      const largeNotificationList = Array.from({ length: 100 }, (_, index) => ({
        ...sampleNotifications[0],
        id: `notification-${index}`,
        title: `Notification ${index}`,
      }));

      const renderStart = performance.now();

      render(
        <NotificationList
          notifications={largeNotificationList}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;

      expect(renderTime).toBeLessThan(1000); // Should render in less than 1 second
      expect(screen.getAllByTestId('notification-item')).toHaveLength(100);
    });
  });

  describe('grouping', () => {
    it('should group notifications by date when enabled', () => {
      const notificationsWithDifferentDates = [
        {
          ...sampleNotifications[0],
          created_at: '2025-01-21T12:00:00Z',
        },
        {
          ...sampleNotifications[1],
          created_at: '2025-01-20T12:00:00Z',
        },
      ];

      render(
        <NotificationList
          notifications={notificationsWithDifferentDates}
          groupByDate={true}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });

    it('should not group notifications when groupByDate is false', () => {
      render(
        <NotificationList
          notifications={sampleNotifications}
          groupByDate={false}
          onMarkAsRead={mockOnMarkAsRead}
          onDelete={mockOnDelete}
          onMarkAllRead={mockOnMarkAllRead}
        />,
      );

      expect(screen.queryByText('Today')).not.toBeInTheDocument();
      expect(screen.queryByText('Yesterday')).not.toBeInTheDocument();
    });
  });
});
