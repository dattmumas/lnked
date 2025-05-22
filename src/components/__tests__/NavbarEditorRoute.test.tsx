import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  usePathname: () => '/posts/new',
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock('../../lib/supabase/browser', () => ({
  __esModule: true,
  default: {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null } }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signOut: jest.fn(),
    },
  },
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: null } }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signOut: jest.fn(),
    },
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Navbar = require('../Navbar').default;

describe('Navbar on editor route', () => {
  it('shows sign in link when not authenticated', async () => {
    render(<Navbar initialUser={null} initialUsername={null} />);
    const signIn = await screen.findByRole('link', { name: /sign in/i });
    expect(signIn).toBeInTheDocument();
  });
});
