import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SubscribeButton from '../app/newsletters/molecules/SubscribeButton'
import { useRouter } from 'next/navigation'

const push = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/test'
}))

jest.mock('../../lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) }
  })
}))

describe('SubscribeButton', () => {
  it('redirects unauthenticated users', async () => {
    render(
      <SubscribeButton targetEntityType="user" targetEntityId="1" targetName="Test" />
    )
    const button = await screen.findByRole('button', { name: /subscribe to test/i })
    fireEvent.click(button)
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/sign-in?redirect=/test')
    })
  })
})
