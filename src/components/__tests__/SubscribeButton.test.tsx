import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import SubscribeButton from '../app/newsletters/molecules/SubscribeButton';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/test',
}));

jest.mock('../../lib/supabase/browser', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
  }),
}));

beforeEach(() => {
  push.mockClear();
});

describe('SubscribeButton', () => {
  it('redirects unauthenticated users', async () => {
    await act(async () => {
      render(
        <SubscribeButton
          targetEntityType="user"
          targetEntityId="1"
          targetName="Test"
        />,
      );
    });
    const button = await screen.findByRole('button', {
      name: /subscribe to test/i,
    });
    fireEvent.click(button);
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/sign-in?redirect=/test');
    });
  });

  it('shows tier options before redirect when multiple tiers provided', async () => {
    await act(async () => {
      render(
        <SubscribeButton
          targetEntityType="user"
          targetEntityId="1"
          targetName="Test"
          tiers={[
            {
              id: 'price_1',
              unit_amount: 500,
              interval: 'month',
              description: 'Basic',
            },
            {
              id: 'price_2',
              unit_amount: 1000,
              interval: 'month',
              description: 'Pro',
            },
          ]}
        />,
      );
    });
    const button = await screen.findByRole('button', {
      name: /subscribe to test/i,
    });
    fireEvent.click(button);
    // Options should appear and no redirect yet
    expect(push).not.toHaveBeenCalled();
    const option = await screen.findByRole('button', { name: /basic/i });
    fireEvent.click(option);
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/sign-in?redirect=/test');
    });
  });
});
