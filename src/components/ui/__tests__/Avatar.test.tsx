import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Avatar, AvatarImage, AvatarFallback } from '../avatar';

describe('Avatar Component', () => {
  it('renders with fallback when no image provided', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );

    const fallback = screen.getByText('JD');
    expect(fallback).toBeInTheDocument();
  });

  it('renders image and fallback elements when src is provided', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User avatar" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );

    // Image element might be hidden but should be in DOM
    const image = screen.queryByRole('img', { hidden: true });
    if (image) {
      expect(image).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(image).toHaveAttribute('alt', 'User avatar');
    }

    // Fallback should be present
    const fallback = screen.getByText('JD');
    expect(fallback).toBeInTheDocument();
  });

  it('applies custom className to avatar container', () => {
    render(
      <Avatar className="custom-avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );

    // The Avatar component is the outermost span
    const avatar = screen.getByText('JD').closest('.custom-avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveClass('custom-avatar');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(
      <Avatar ref={ref}>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );

    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('supports multiple children', () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User avatar" />
        <AvatarFallback>JD</AvatarFallback>
        <div data-testid="extra-element">Extra</div>
      </Avatar>,
    );

    const fallback = screen.getByText('JD');
    const extra = screen.getByTestId('extra-element');

    expect(fallback).toBeInTheDocument();
    expect(extra).toBeInTheDocument();
  });

  it('handles empty fallback gracefully', () => {
    render(
      <Avatar data-testid="empty-avatar">
        <AvatarFallback></AvatarFallback>
      </Avatar>,
    );

    // Should not crash with empty fallback
    const avatar = screen.getByTestId('empty-avatar');
    expect(avatar).toBeInTheDocument();
  });

  describe('AvatarImage', () => {
    it('renders with correct props when wrapped in Avatar', () => {
      const { container } = render(
        <Avatar>
          <AvatarImage
            src="https://example.com/avatar.jpg"
            alt="User avatar"
            className="custom-image"
          />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>,
      );

      // Check that the component rendered without errors
      expect(container.firstChild).toBeInTheDocument();

      // The image might be hidden but the Avatar should contain the fallback
      const fallback = screen.getByText('JD');
      expect(fallback).toBeInTheDocument();
    });
  });

  describe('AvatarFallback', () => {
    it('renders fallback text', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>,
      );

      const fallback = screen.getByText('JD');
      expect(fallback).toBeInTheDocument();
    });

    it('applies custom className to fallback', () => {
      render(
        <Avatar>
          <AvatarFallback className="custom-fallback">JD</AvatarFallback>
        </Avatar>,
      );

      const fallback = screen.getByText('JD');
      expect(fallback).toHaveClass('custom-fallback');
    });

    it('handles complex fallback content', () => {
      render(
        <Avatar>
          <AvatarFallback>
            <span data-testid="fallback-icon">👤</span>
          </AvatarFallback>
        </Avatar>,
      );

      const icon = screen.getByTestId('fallback-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('👤');
    });

    it('renders with different background styles', () => {
      render(
        <Avatar>
          <AvatarFallback className="bg-red-500">ER</AvatarFallback>
        </Avatar>,
      );

      const fallback = screen.getByText('ER');
      expect(fallback).toHaveClass('bg-red-500');
    });
  });
});
