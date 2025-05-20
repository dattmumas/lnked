import { render, screen, fireEvent } from '@testing-library/react'
import FollowButton from '../FollowButton'
import { useRouter } from 'next/navigation'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/foo'
}))

jest.mock('../../lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) }
  })
}))

describe('FollowButton', () => {
  it('redirects when not logged in', () => {
    const router = useRouter()
    render(
      <FollowButton targetUserId="1" targetUserName="bob" initialIsFollowing={false} />
    )
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(router.push).toHaveBeenCalledWith('/sign-in?redirect=/foo')
  })
})
