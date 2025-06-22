import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// Custom render function that includes common providers
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  // Add your app's providers here when needed
  // const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  //   return (
  //     <QueryProvider>
  //       <ThemeProvider>
  //         {children}
  //       </ThemeProvider>
  //     </QueryProvider>
  //   )
  // }

  return render(ui, { ...options });
};

// Helper for testing async components
export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 0));
};

// Helper to simulate user interactions
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  avatar_url: null,
  ...overrides,
});

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
