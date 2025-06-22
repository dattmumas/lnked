import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import '@testing-library/jest-dom';

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
} from '../form';
import { Input } from '../input';
import { Button } from '../button';

// Test form schema
const TestFormSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
});

type TestFormValues = z.infer<typeof TestFormSchema>;

// Test form component
const TestForm: React.FC<{
  onSubmit: (data: TestFormValues) => void;
  defaultValues?: Partial<TestFormValues>;
}> = ({ onSubmit, defaultValues = {} }) => {
  const form = useForm<TestFormValues>({
    resolver: zodResolver(TestFormSchema),
    defaultValues: {
      email: '',
      password: '',
      username: '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter your email" {...field} />
              </FormControl>
              <FormDescription>We'll never share your email.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Enter password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};

// Component to test useFormField hook
const FormFieldTestComponent: React.FC = () => {
  const formField = useFormField();

  return (
    <div data-testid="form-field-data">
      <span data-testid="field-id">{formField.id}</span>
      <span data-testid="field-name">{formField.name}</span>
      <span data-testid="field-invalid">{formField.invalid.toString()}</span>
      <span data-testid="field-error">
        {formField.error?.message || 'no-error'}
      </span>
    </div>
  );
};

const FormFieldTestWrapper: React.FC = () => {
  const form = useForm<TestFormValues>({
    resolver: zodResolver(TestFormSchema),
    defaultValues: { email: '', password: '', username: '' },
  });

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="email"
        render={() => (
          <FormItem>
            <FormFieldTestComponent />
          </FormItem>
        )}
      />
    </Form>
  );
};

describe('Form Components', () => {
  describe('Form Integration', () => {
    it('renders form with all fields', () => {
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /submit/i }),
      ).toBeInTheDocument();
    });

    it('handles valid form submission', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const usernameInput = screen.getByLabelText(/username/i);
      const submitButton = screen.getByRole('button', { name: /submit/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(usernameInput, 'testuser');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith(
          {
            email: 'test@example.com',
            password: 'password123',
            username: 'testuser',
          },
          expect.any(Object), // React Hook Form passes additional parameters
        );
      });
    });

    it('prevents submission with invalid data', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Check for validation error messages
        expect(
          screen.getByText(/please enter a valid email/i),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/password must be at least 6 characters/i),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/username must be at least 3 characters/i),
        ).toBeInTheDocument();
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('displays validation errors on blur', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);

      await user.type(emailInput, 'invalid-email');
      await user.tab(); // Trigger blur

      await waitFor(
        () => {
          expect(
            screen.getByText(/please enter a valid email/i),
          ).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });

    it('clears validation errors when input becomes valid', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);

      // Enter invalid email and trigger validation
      await user.type(emailInput, 'invalid');
      await user.tab();

      await waitFor(
        () => {
          expect(
            screen.getByText(/please enter a valid email/i),
          ).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // Fix the email
      await user.clear(emailInput);
      await user.type(emailInput, 'test@example.com');
      await user.tab(); // Trigger revalidation

      await waitFor(
        () => {
          expect(
            screen.queryByText(/please enter a valid email/i),
          ).not.toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });

    it('works with default values', () => {
      const mockSubmit = jest.fn();
      const defaultValues = {
        email: 'default@example.com',
        username: 'defaultuser',
      };

      render(<TestForm onSubmit={mockSubmit} defaultValues={defaultValues} />);

      expect(
        screen.getByDisplayValue('default@example.com'),
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('defaultuser')).toBeInTheDocument();
    });
  });

  describe('FormField Component', () => {
    it('renders with proper accessibility attributes', () => {
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);

      expect(emailInput).toHaveAttribute('id');
      expect(emailInput).toHaveAttribute('aria-describedby');
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
    });

    it('updates aria-invalid when field has error', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('associates description with input', () => {
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      const description = screen.getByText(/we'll never share your email/i);

      const describedBy = emailInput.getAttribute('aria-describedby');
      expect(describedBy).toContain(description.id);
    });

    it('includes error message in aria-describedby when present', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        const errorMessage = screen.getByText(/please enter a valid email/i);

        const describedBy = emailInput.getAttribute('aria-describedby');
        expect(describedBy).toContain(errorMessage.id);
      });
    });
  });

  describe('FormControl Component', () => {
    it('applies data-slot attribute', () => {
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('data-slot', 'form-control');
    });

    it('handles keyboard navigation', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      emailInput.focus();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();
    });
  });

  describe('useFormField Hook', () => {
    it('provides form field context', () => {
      render(<FormFieldTestWrapper />);

      expect(screen.getByTestId('field-name')).toHaveTextContent('email');
      expect(screen.getByTestId('field-invalid')).toHaveTextContent('false');
      expect(screen.getByTestId('field-error')).toHaveTextContent('no-error');
    });

    it('throws error when used outside FormField', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<FormFieldTestComponent />);
      }).toThrow();

      console.error = originalError;
    });
  });

  describe('Form Accessibility', () => {
    it('supports screen reader navigation', () => {
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      // Check that all form fields have proper labels
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();

      // Check that submit button is accessible
      expect(
        screen.getByRole('button', { name: /submit/i }),
      ).toBeInTheDocument();
    });

    it('maintains focus management', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.click(emailInput);
      expect(emailInput).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(passwordInput).toHaveFocus();
    });

    it('announces validation errors to screen readers', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(
        () => {
          // Check that error messages are present and associated with inputs
          const emailInput = screen.getByLabelText(/email/i);
          const errorMessage = screen.getByText(/please enter a valid email/i);

          // Verify error is associated with the input via aria-describedby
          expect(emailInput.getAttribute('aria-describedby')).toContain(
            errorMessage.id,
          );
          expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        },
        { timeout: 2000 },
      );
    });
  });

  describe('Form Performance', () => {
    it('handles rapid typing without lag', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);

      const startTime = performance.now();
      await user.type(emailInput, 'test@example.com');
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(emailInput).toHaveValue('test@example.com');
    });

    it('debounces validation appropriately', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<TestForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);

      // Type quickly
      await user.type(emailInput, 'test');

      // Validation should not appear immediately during typing
      expect(
        screen.queryByText(/please enter a valid email/i),
      ).not.toBeInTheDocument();

      // Trigger validation with blur
      await user.tab();

      await waitFor(
        () => {
          expect(
            screen.getByText(/please enter a valid email/i),
          ).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });
  });
});
