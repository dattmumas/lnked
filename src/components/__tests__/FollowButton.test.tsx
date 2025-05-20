import { render, screen, waitFor } from '@testing-library/react'
import FollowButton from '../FollowButton'

// Mock server actions to avoid Node.js Request errors
jest.mock('../../app/actions/followActions', () => ({
  followUser: jest.fn(async () => ({ success: true })),
  unfollowUser: jest.fn(async () => ({ success: true })),
}))

jest.mock('next/navigation', () => ({
  usePathname: () => '/foo',
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() })
}))

jest.mock('../../lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) }
  })
}))

describe('FollowButton', () => {
  it('renders nothing when user is not logged in', async () => {
    render(
      <FollowButton targetUserId="1" targetUserName="bob" initialIsFollowing={false} />
    )
    await waitFor(() => {
      expect(screen.queryByRole('button')).toBeNull()
    })
  })
})
