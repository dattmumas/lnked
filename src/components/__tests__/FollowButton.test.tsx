import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FollowButton from '../FollowButton';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
  usePathname: jest.fn(() => '/profile/testuser'),
}));

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
};

jest.mock('../../lib/supabase/browser', () => ({
  createSupabaseBrowserClient: jest.fn(() => mockSupabaseClient),
}));

// Mock follow actions
jest.mock('../../app/actions/followActions', () => ({
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
}));

import { followUser, unfollowUser } from '../../app/actions/followActions';

const mockFollowUser = followUser as jest.MockedFunction<typeof followUser>;
const mockUnfollowUser = unfollowUser as jest.MockedFunction<
  typeof unfollowUser
>;

describe('FollowButton', () => {
  const defaultProps = {
    targetUserId: 'user-123',
    targetUserName: 'Test User',
    initialIsFollowing: false,
    currentUserId: 'current-user-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'current-user-123' } },
      error: null,
    });
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    });
  });

  it('renders follow button when not following', () => {
    render(<FollowButton {...defaultProps} />);

    expect(screen.getByRole('button')).toHaveTextContent('Follow');
    expect(screen.getByLabelText('Follow Test User')).toBeInTheDocument();
  });

  it('renders unfollow button when following', () => {
    render(<FollowButton {...defaultProps} initialIsFollowing={true} />);

    expect(screen.getByRole('button')).toHaveTextContent('Following');
    expect(screen.getByLabelText('Unfollow Test User')).toBeInTheDocument();
  });

  it('does not render for self', () => {
    const { container } = render(
      <FollowButton
        {...defaultProps}
        currentUserId="user-123"
        targetUserId="user-123"
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('handles follow action successfully', async () => {
    mockFollowUser.mockResolvedValue({ success: true });

    render(<FollowButton {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(button).toHaveTextContent('Processing...');

    await waitFor(() => {
      expect(mockFollowUser).toHaveBeenCalledWith('user-123');
    });

    await waitFor(() => {
      expect(button).toHaveTextContent('Following');
    });
  });

  it('handles unfollow action successfully', async () => {
    mockUnfollowUser.mockResolvedValue({ success: true });

    render(<FollowButton {...defaultProps} initialIsFollowing={true} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(button).toHaveTextContent('Processing...');

    await waitFor(() => {
      expect(mockUnfollowUser).toHaveBeenCalledWith('user-123');
    });

    await waitFor(() => {
      expect(button).toHaveTextContent('Follow');
    });
  });

  it('handles follow action failure', async () => {
    mockFollowUser.mockResolvedValue({
      success: false,
      error: 'Failed to follow user',
    });

    render(<FollowButton {...defaultProps} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Failed to follow user')).toBeInTheDocument();
    });

    // Should revert to original state
    expect(button).toHaveTextContent('Follow');
  });

  it('prevents self-following', async () => {
    render(
      <FollowButton
        {...defaultProps}
        currentUserId="user-123"
        targetUserId="user-123"
      />,
    );

    // Should not render the button for self
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('redirects to sign-in when not authenticated', () => {
    const mockPush = jest.fn();
    const { useRouter } = require('next/navigation');
    useRouter.mockReturnValue({ push: mockPush });

    render(<FollowButton {...defaultProps} currentUserId={null} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith(
      '/sign-in?redirect=%2Fprofile%2Ftestuser',
    );
  });

  it('syncs with server state', async () => {
    // Mock server returning that user is following
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { follower_id: 'current-user-123' },
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    render(<FollowButton {...defaultProps} initialIsFollowing={false} />);

    // Should eventually sync and show Following state
    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Following');
    });
  });
});
