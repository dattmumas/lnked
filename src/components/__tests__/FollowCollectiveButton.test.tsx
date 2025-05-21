import { render, screen, waitFor } from '@testing-library/react';
import FollowCollectiveButton from '../FollowCollectiveButton';

jest.mock('../../app/actions/followActions', () => ({
  followCollective: jest.fn(async () => ({ success: true })),
  unfollowCollective: jest.fn(async () => ({ success: true })),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/foo',
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('../../lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
  }),
}));

describe('FollowCollectiveButton', () => {
  it('renders nothing when user is not logged in', async () => {
    render(
      <FollowCollectiveButton
        targetCollectiveId="1"
        targetCollectiveName="foo"
        initialIsFollowing={false}
      />
    );
    await waitFor(() => {
      expect(screen.queryByRole('button')).toBeNull();
    });
  });
});
