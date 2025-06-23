import { render, type RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

// Custom render function that includes common providers
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): ReturnType<typeof render> => {
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
export const waitForLoadingToFinish = (): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, 0));
};

// Helper for testing error boundaries
export const simulateError = (error: Error): void => {
  // Mock console.error to avoid noise in tests
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  throw error;
  consoleSpy.mockRestore();
};

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
