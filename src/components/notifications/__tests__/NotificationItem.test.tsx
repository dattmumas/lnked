import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { NotificationItem } from '../NotificationItem';

import type { Notification } from '../../../types/notifications';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock notification config utility
jest.mock('@/types/notifications', () => ({
  getNotificationConfig: jest.fn((type: string) => ({
    icon: '🔔',
    color: 'bg-blue-500',
    priority: type === 'urgent' ? 'high' : 'normal',
  })),
  formatNotificationTime: jest.fn((date: string) => '2 hours ago'),
}));

// Mock UI components
jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="avatar-fallback">{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt: string }) => (
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    asChild,
    disabled,
    ...props
  }: any) => {
    if (asChild) {
      return (
        <div data-testid="button" {...props}>
          {children}
        </div>
      );
    }
    return (
      <button
        data-testid="button"
        onClick={onClick}
        data-variant={variant}
        data-size={size}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  },
}));

jest.mock('next/link', () => {
  return function Link({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) {
    return (
      <a href={href} data-testid="link">
        {children}
      </a>
    );
  };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">×</span>,
  ExternalLink: () => <span data-testid="external-link-icon">🔗</span>,
}));

describe('NotificationItem', () => {
  const mockOnMarkAsRead = jest.fn();

  const baseNotification: Notification = {
    id: 'notification-123',
    recipient_id: 'user-123',
    actor_id: 'user-456',
    type: 'post_like',
    title: 'Post liked',
    message: 'Alice liked your post "Amazing Article"',
    entity_type: 'post',
    entity_id: 'post-123',
    metadata: {
      post_title: 'Amazing Article',
      actorUsername: 'alice',
      actorFullName: 'Alice Smith',
      actorAvatarUrl: 'https://example.com/alice.jpg',
    },
    read_at: null,
    created_at: '2025-01-21T12:00:00Z',
    updated_at: '2025-01-21T12:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render notification with all content', () => {
      render(
        <NotificationItem
          notification={baseNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      expect(screen.getByText('Post liked')).toBeInTheDocument();
      expect(
        screen.getByText('Alice liked your post "Amazing Article"'),
      ).toBeInTheDocument();
      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
      expect(screen.getByTestId('badge')).toHaveTextContent('New');
    });

    it('should render actor avatar and fallback', () => {
      render(
        <NotificationItem
          notification={baseNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      expect(screen.getByTestId('avatar-image')).toHaveAttribute(
        'src',
        'https://example.com/alice.jpg',
      );
      expect(screen.getByTestId('avatar-image')).toHaveAttribute(
        'alt',
        'Alice Smith',
      );
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('AS'); // Alice Smith initials
    });

    it('should render without actor information', () => {
      const notificationWithoutActor = {
        ...baseNotification,
        actor_id: null,
        metadata: {
          ...baseNotification.metadata,
          actorUsername: undefined,
          actorFullName: undefined,
          actorAvatarUrl: undefined,
        },
      };

      render(
        <NotificationItem
          notification={notificationWithoutActor}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      expect(screen.queryByTestId('avatar')).not.toBeInTheDocument();
      expect(screen.getByText('Post liked')).toBeInTheDocument();
    });

    it('should show unread indicator for unread notifications', () => {
      render(
        <NotificationItem
          notification={baseNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      expect(screen.getByTestId('badge')).toHaveTextContent('New');
      expect(screen.getByRole('button')).toHaveClass('bg-accent/50');
    });

    it('should not show unread indicator for read notifications', () => {
      const readNotification = {
        ...baseNotification,
        read_at: '2025-01-21T13:00:00Z',
      };

      render(
        <NotificationItem
          notification={readNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      expect(screen.queryByText('New')).not.toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('bg-background');
    });

    it('should show high priority badge for urgent notifications', () => {
      const urgentNotification = {
        ...baseNotification,
        type: 'urgent' as const,
      };

      render(
        <NotificationItem
          notification={urgentNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      expect(screen.getByTestId('badge')).toHaveAttribute(
        'data-variant',
        'destructive',
      );
      expect(screen.getByTestId('badge')).toHaveTextContent('Important');
    });
  });

  describe('navigation links', () => {
    it('should generate correct link for post notification', () => {
      render(
        <NotificationItem
          notification={baseNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      const externalLinkButton = screen
        .getByTestId('external-link-icon')
        .closest('a');
      expect(externalLinkButton).toHaveAttribute('href', '/posts/post-123');
    });

    it('should generate correct link for user notification', () => {
      const userNotification = {
        ...baseNotification,
        entity_type: 'user' as const,
        entity_id: 'user-789',
      };

      render(
        <NotificationItem
          notification={userNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      const externalLinkButton = screen
        .getByTestId('external-link-icon')
        .closest('a');
      expect(externalLinkButton).toHaveAttribute('href', '/profile/user-789');
    });

    it('should generate correct link for collective notification', () => {
      const collectiveNotification = {
        ...baseNotification,
        entity_type: 'collective' as const,
        entity_id: 'collective-456',
      };

      render(
        <NotificationItem
          notification={collectiveNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      const externalLinkButton = screen
        .getByTestId('external-link-icon')
        .closest('a');
      expect(externalLinkButton).toHaveAttribute(
        'href',
        '/collectives/collective-456',
      );
    });

    it('should not show external link when no entity', () => {
      const notificationWithoutEntity = {
        ...baseNotification,
        entity_type: null,
        entity_id: null,
      };

      render(
        <NotificationItem
          notification={notificationWithoutEntity}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      expect(
        screen.queryByTestId('external-link-icon'),
      ).not.toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call onMarkAsRead when clicking on unread notification', async () => {
      const user = userEvent.setup();

      render(
        <NotificationItem
          notification={baseNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      await user.click(screen.getByRole('button'));

      expect(mockOnMarkAsRead).toHaveBeenCalledWith('notification-123');
      expect(mockPush).toHaveBeenCalledWith('/posts/post-123');
    });

    it('should not call onMarkAsRead for already read notification', async () => {
      const user = userEvent.setup();
      const readNotification = {
        ...baseNotification,
        read_at: '2025-01-21T13:00:00Z',
      };

      render(
        <NotificationItem
          notification={readNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      await user.click(screen.getByRole('button'));

      expect(mockOnMarkAsRead).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/posts/post-123');
    });

    it('should handle clicking on the notification body', async () => {
      const user = userEvent.setup();

      render(
        <NotificationItem
          notification={baseNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      await user.click(screen.getByText('Post liked'));

      expect(mockOnMarkAsRead).toHaveBeenCalledWith('notification-123');
    });

    it('should handle missing onMarkAsRead callback', async () => {
      const user = userEvent.setup();

      render(
        <NotificationItem
          notification={baseNotification}
          onMarkAsRead={jest.fn()}
        />,
      );

      // Should not throw when clicking
      await user.click(screen.getByRole('button'));

      expect(mockPush).toHaveBeenCalledWith('/posts/post-123');
    });
  });

  describe('keyboard navigation', () => {
    it('should handle Enter key press', async () => {
      const user = userEvent.setup();

      render(
        <NotificationItem
          notification={baseNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      await user.tab(); // Focus the notification
      await user.keyboard('{Enter}');

      expect(mockOnMarkAsRead).toHaveBeenCalledWith('notification-123');
      expect(mockPush).toHaveBeenCalledWith('/posts/post-123');
    });

    it('should handle Space key press', async () => {
      const user = userEvent.setup();

      render(
        <NotificationItem
          notification={baseNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      await user.tab(); // Focus the notification
      await user.keyboard(' ');

      expect(mockOnMarkAsRead).toHaveBeenCalledWith('notification-123');
      expect(mockPush).toHaveBeenCalledWith('/posts/post-123');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <NotificationItem
          notification={baseNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      const notificationButton = screen.getByRole('button');
      expect(notificationButton).toHaveAttribute('tabIndex', '0');
      expect(notificationButton).toHaveAttribute('role', 'button');
    });

    it('should have screen reader text for action buttons', () => {
      render(
        <NotificationItem
          notification={baseNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      expect(screen.getByText('View')).toHaveClass('sr-only');
    });

    it('should suppress hydration warnings for time-sensitive content', () => {
      render(
        <NotificationItem
          notification={baseNotification}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      const timeElement = screen.getByText('2 hours ago');
      expect(timeElement).toHaveAttribute('suppressHydrationWarning');
    });
  });

  describe('error handling', () => {
    it('should handle navigation without entity link', async () => {
      const user = userEvent.setup();
      const notificationWithoutEntity = {
        ...baseNotification,
        entity_type: null,
        entity_id: null,
      };

      render(
        <NotificationItem
          notification={notificationWithoutEntity}
          onMarkAsRead={mockOnMarkAsRead}
        />,
      );

      await user.click(screen.getByRole('button'));

      expect(mockOnMarkAsRead).toHaveBeenCalledWith('notification-123');
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('custom styling', () => {
    it('should apply custom className', () => {
      render(
        <NotificationItem
          notification={baseNotification}
          onMarkAsRead={mockOnMarkAsRead}
          className="custom-notification"
        />,
      );

      expect(screen.getByRole('button')).toHaveClass('custom-notification');
    });
  });
});
