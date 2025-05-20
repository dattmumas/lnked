import { render, screen, fireEvent } from '@testing-library/react'
import SubscribeButton from '../app/newsletters/molecules/SubscribeButton'
import { useRouter } from 'next/navigation'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/test'
}))

jest.mock('../../lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) }
  })
}))

describe('SubscribeButton', () => {
  it('redirects unauthenticated users', async () => {
    const router = useRouter()
    render(
      <SubscribeButton targetEntityType="user" targetEntityId="1" targetName="Test" />
    )
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(router.push).toHaveBeenCalledWith('/sign-in?redirect=/test')
  })
})
