import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Alert, AlertDescription } from './alert';
import { Button } from './button';

interface LoadingWithRetryProps {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  canRetry?: boolean;
  loadingText?: string;
  children?: React.ReactNode;
  className?: string;
}

export function LoadingWithRetry({
  isLoading,
  error,
  onRetry,
  canRetry = true,
  loadingText = 'Loading...',
  children,
  className = '',
}: LoadingWithRetryProps): React.JSX.Element {
  if (error !== null && error !== undefined && error !== '') {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="space-y-3">
            <div>
              <p className="font-medium">Unable to load</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            {canRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Try Again
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <div
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            role="status"
            aria-live="polite"
          />
          <span className="text-sm">{loadingText}</span>
        </div>
      </div>
    );
  }

  return children as React.JSX.Element;
}

// Inline variant for smaller spaces
export function InlineLoadingWithRetry({
  isLoading,
  error,
  onRetry,
  canRetry = true,
  loadingText = 'Loading...',
  children,
}: LoadingWithRetryProps): React.JSX.Element {
  if (error !== null && error !== undefined && error !== '') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <AlertTriangle className="h-3 w-3 text-destructive" />
        <span>{error}</span>
        {canRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            variant="ghost"
            className="h-auto p-1 text-xs"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <div
          className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
          role="status"
          aria-live="polite"
        />
        <span>{loadingText}</span>
      </div>
    );
  }

  return children as React.JSX.Element;
}
