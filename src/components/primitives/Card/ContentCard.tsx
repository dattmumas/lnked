import * as React from 'react';

import { cn } from '@/lib/utils';

import {
  Card,
  CardProps,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';

export interface ContentCardProps
  extends Omit<CardProps, 'children' | 'content'> {
  /**
   * Card title/heading
   */
  title: string;
  /**
   * Optional description or excerpt
   */
  description?: string;
  /**
   * Main content area - can be text, components, or complex content
   */
  content?: React.ReactNode;
  /**
   * Optional image or media content
   */
  media?: React.ReactNode;
  /**
   * Footer actions or metadata
   */
  footer?: React.ReactNode;
  /**
   * Optional badge or status indicator
   */
  badge?: React.ReactNode;
  /**
   * Click handler for the entire card
   */
  onCardClick?: () => void;
  /**
   * Loading state for async content
   * @default false
   */
  loading?: boolean;
  /**
   * Variant for different content types
   * @default 'default'
   */
  variant?: 'default' | 'article' | 'product' | 'media';
}

/**
 * ContentCard component for displaying articles, posts, videos, and other content.
 * Implements the semantic card system with flexible content layout.
 */
export const ContentCard = React.forwardRef<HTMLDivElement, ContentCardProps>(
  (
    {
      title,
      description,
      content,
      media,
      footer,
      badge,
      onCardClick,
      loading = false,
      variant = 'default',
      className,
      ...props
    },
    ref,
  ) => {
    const isClickable = Boolean(onCardClick);

    if (loading) {
      return (
        <Card
          ref={ref}
          className={cn('animate-pulse', className)}
          size="md"
          {...props}
        >
          {/* Media skeleton */}
          <div className="w-full h-48 bg-muted rounded-md mb-4" />

          {/* Header skeleton */}
          <div className="space-y-2 mb-4">
            <div className="w-3/4 h-6 bg-muted rounded" />
            <div className="w-1/2 h-4 bg-muted rounded" />
          </div>

          {/* Content skeleton */}
          <div className="space-y-2 mb-4">
            <div className="w-full h-4 bg-muted rounded" />
            <div className="w-5/6 h-4 bg-muted rounded" />
            <div className="w-4/6 h-4 bg-muted rounded" />
          </div>

          {/* Footer skeleton */}
          <div className="w-1/3 h-8 bg-muted rounded" />
        </Card>
      );
    }

    const cardContent = (
      <>
        {Boolean(badge) && (
          <div className="absolute top-4 right-4 z-10">{badge}</div>
        )}

        {Boolean(media) && (
          <div
            className={cn(
              'overflow-hidden',
              variant === 'media' ? 'mb-4' : 'mb-6',
              // Remove padding for media to go edge-to-edge
              '-mx-6 -mt-6 mb-6',
            )}
          >
            {media}
          </div>
        )}

        <CardHeader>
          <CardTitle
            className={cn(
              // Variant-specific title styling
              variant === 'article' && 'text-xl leading-snug',
              variant === 'media' && 'text-lg',
              'line-clamp-2',
            )}
          >
            {title}
          </CardTitle>

          {Boolean(description) && (
            <CardDescription
              className={cn(
                'line-clamp-3',
                variant === 'article' && 'text-base leading-relaxed',
              )}
            >
              {description}
            </CardDescription>
          )}
        </CardHeader>

        {Boolean(content) && (
          <CardContent
            className={cn(
              variant === 'article' && 'text-content-primary leading-relaxed',
            )}
          >
            {content}
          </CardContent>
        )}

        {Boolean(footer) && <CardFooter>{footer}</CardFooter>}
      </>
    );

    return (
      <Card
        ref={ref}
        className={cn(
          'relative overflow-hidden',
          // Variant-specific styling
          variant === 'article' && 'max-w-prose',
          variant === 'media' && 'aspect-auto',
          // Clickable styling
          isClickable && 'cursor-pointer group',
          className,
        )}
        size="md"
        interactive={isClickable}
        elevated={variant === 'product'}
        onClick={onCardClick}
        {...props}
      >
        {cardContent}

        {/* Hover overlay for clickable cards */}
        {isClickable && (
          <div className="absolute inset-0 bg-interaction-focus opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
        )}
      </Card>
    );
  },
);

ContentCard.displayName = 'ContentCard';
