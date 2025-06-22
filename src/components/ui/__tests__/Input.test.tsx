import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { Input } from '../input';

describe('Input Component', () => {
  describe('Basic Rendering', () => {
    it('renders as an input element', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
    });

    it('applies default classes', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(
        'flex',
        'h-9',
        'w-full',
        'rounded-md',
        'border',
        'border-input',
        'bg-background',
        'px-3',
        'py-1.5',
        'text-sm',
        'text-foreground',
      );
    });

    it('merges custom className with default classes', () => {
      render(<Input className="custom-class" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
      expect(input).toHaveClass('flex'); // Should still have default classes
    });
  });

  describe('Input Types', () => {
    it('renders text input by default', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('renders email input', () => {
      render(<Input type="email" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('renders password input', () => {
      render(<Input type="password" />);

      const input = screen.getByLabelText('', {
        selector: 'input[type="password"]',
      });
      expect(input).toBeInTheDocument();
    });

    it('renders number input', () => {
      render(<Input type="number" />);

      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('renders date input', () => {
      render(<Input type="date" />);

      const input = screen.getByLabelText('', {
        selector: 'input[type="date"]',
      });
      expect(input).toBeInTheDocument();
    });

    it('renders file input', () => {
      render(<Input type="file" />);

      const input = screen.getByLabelText('', {
        selector: 'input[type="file"]',
      });
      expect(input).toBeInTheDocument();
    });
  });

  describe('Input Attributes', () => {
    it('applies placeholder attribute', () => {
      render(<Input placeholder="Enter your email" />);

      const input = screen.getByPlaceholderText('Enter your email');
      expect(input).toBeInTheDocument();
    });

    it('applies value attribute', () => {
      render(<Input value="test value" readOnly />);

      const input = screen.getByDisplayValue('test value');
      expect(input).toBeInTheDocument();
    });

    it('applies disabled attribute', () => {
      render(<Input disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass(
        'disabled:cursor-not-allowed',
        'disabled:opacity-50',
      );
    });

    it('applies readOnly attribute', () => {
      render(<Input readOnly />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readOnly');
    });

    it('applies required attribute', () => {
      render(<Input required />);

      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });

    it('applies minLength and maxLength attributes', () => {
      render(<Input minLength={3} maxLength={20} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('minLength', '3');
      expect(input).toHaveAttribute('maxLength', '20');
    });

    it('applies pattern attribute', () => {
      render(<Input pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('pattern', '[0-9]{3}-[0-9]{3}-[0-9]{4}');
    });
  });

  describe('User Interactions', () => {
    it('handles text input', async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello World');

      expect(input).toHaveValue('Hello World');
    });

    it('handles onChange events', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');

      expect(handleChange).toHaveBeenCalledTimes(4); // One for each character
    });

    it('handles onFocus events', async () => {
      const user = userEvent.setup();
      const handleFocus = jest.fn();
      render(<Input onFocus={handleFocus} />);

      const input = screen.getByRole('textbox');
      await user.click(input);

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('handles onBlur events', async () => {
      const user = userEvent.setup();
      const handleBlur = jest.fn();
      render(<Input onBlur={handleBlur} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab(); // Move focus away

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('prevents input when disabled', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(<Input disabled onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');

      expect(input).toHaveValue('');
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('handles keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Input data-testid="first" />
          <Input data-testid="second" />
        </div>,
      );

      const firstInput = screen.getByTestId('first');
      const secondInput = screen.getByTestId('second');

      await user.click(firstInput);
      expect(firstInput).toHaveFocus();

      await user.tab();
      expect(secondInput).toHaveFocus();
    });
  });

  describe('Validation States', () => {
    it('applies invalid styling with aria-invalid', () => {
      render(<Input aria-invalid />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid');
      expect(input).toHaveClass('aria-invalid:border-destructive');
    });

    it('shows focus styles on keyboard focus', async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole('textbox');
      await user.tab(); // Keyboard focus

      expect(input).toHaveFocus();
      expect(input).toHaveClass('focus-visible:ring-2');
    });

    it('handles form validation states', () => {
      render(
        <form>
          <Input required name="test" />
        </form>,
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });
  });

  describe('Accessibility', () => {
    it('supports aria-label', () => {
      render(<Input aria-label="Search" />);

      const input = screen.getByLabelText('Search');
      expect(input).toBeInTheDocument();
    });

    it('supports aria-describedby', () => {
      render(
        <div>
          <Input aria-describedby="help-text" />
          <div id="help-text">Help text</div>
        </div>,
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('supports aria-labelledby', () => {
      render(
        <div>
          <label id="email-label">Email</label>
          <Input aria-labelledby="email-label" />
        </div>,
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-labelledby', 'email-label');
    });

    it('maintains proper focus indicators', async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole('textbox');

      // Should not have focus initially
      expect(input).not.toHaveFocus();

      // Should focus when clicked
      await user.click(input);
      expect(input).toHaveFocus();

      // Should blur when clicking elsewhere
      await user.click(document.body);
      expect(input).not.toHaveFocus();
    });

    it('supports screen reader announcements', () => {
      render(<Input aria-live="polite" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Form Integration', () => {
    it('works with form submission', async () => {
      const user = userEvent.setup();
      const handleSubmit = jest.fn((e) => e.preventDefault());

      render(
        <form onSubmit={handleSubmit}>
          <Input name="username" />
          <button type="submit">Submit</button>
        </form>,
      );

      const input = screen.getByRole('textbox');
      const button = screen.getByRole('button');

      await user.type(input, 'testuser');
      await user.click(button);

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('supports controlled input pattern', async () => {
      const user = userEvent.setup();
      const ControlledInput = () => {
        const [value, setValue] = React.useState('');
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            data-testid="controlled"
          />
        );
      };

      render(<ControlledInput />);

      const input = screen.getByTestId('controlled');
      await user.type(input, 'controlled text');

      expect(input).toHaveValue('controlled text');
    });

    it('supports uncontrolled input pattern', async () => {
      const user = userEvent.setup();
      render(<Input defaultValue="default text" />);

      const input = screen.getByDisplayValue('default text');
      await user.clear(input);
      await user.type(input, 'new text');

      expect(input).toHaveValue('new text');
    });
  });

  describe('Edge Cases', () => {
    it('handles null value gracefully', () => {
      render(<Input value={null as any} readOnly />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('');
    });

    it('handles undefined value gracefully', () => {
      render(<Input value={undefined} readOnly />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('');
    });

    it('handles very long text input', async () => {
      const user = userEvent.setup();
      const longText = 'a'.repeat(1000);
      render(<Input />);

      const input = screen.getByRole('textbox');
      await user.type(input, longText);

      expect(input).toHaveValue(longText);
    });

    it('handles special characters', async () => {
      const user = userEvent.setup();
      const specialText = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      render(<Input />);

      const input = screen.getByRole('textbox');
      await user.type(input, specialText);

      expect(input).toHaveValue(specialText);
    });

    it('handles rapid typing', async () => {
      const user = userEvent.setup();
      render(<Input />);

      const input = screen.getByRole('textbox');

      // Simulate rapid typing
      const startTime = performance.now();
      await user.type(input, 'rapid typing test');
      const endTime = performance.now();

      expect(input).toHaveValue('rapid typing test');
      expect(endTime - startTime).toBeLessThan(2000); // Should handle quickly
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.tagName).toBe('INPUT');
    });

    it('allows imperative operations via ref', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input ref={ref} />);

      // Test focus via ref
      ref.current?.focus();
      expect(ref.current).toHaveFocus();

      // Test value setting via ref
      if (ref.current) {
        ref.current.value = 'ref value';
      }
      expect(ref.current).toHaveValue('ref value');
    });
  });
});
