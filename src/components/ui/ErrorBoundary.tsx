import { AlertTriangle, RefreshCw } from 'lucide-react';
import React, { Component, ErrorInfo, ReactNode } from 'react';

import { Alert, AlertDescription } from './alert';
import { Button } from './button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | undefined;
  errorInfo: ErrorInfo | undefined;
  retryCount: number;
}

const MAX_RETRIES = 3;

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = MAX_RETRIES;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    // Log the error
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call onError prop if provided
    this.props.onError?.(error, errorInfo);

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = (): void => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: this.state.retryCount + 1,
      });
    }
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-[200px] p-4">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-4">
              <div>
                <h3 className="font-semibold">Something went wrong</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {this.state.error?.message !== undefined &&
                  this.state.error.message !== null &&
                  this.state.error.message !== ''
                    ? this.state.error.message
                    : 'An unexpected error occurred'}
                </p>
              </div>

              <div className="flex gap-2">
                {this.state.retryCount < this.maxRetries ? (
                  <Button
                    onClick={this.handleRetry}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Try Again ({this.maxRetries - this.state.retryCount} left)
                  </Button>
                ) : (
                  <Button
                    onClick={this.handleReload}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reload Page
                  </Button>
                )}
              </div>

              {process.env.NODE_ENV === 'development' &&
                this.state.errorInfo && (
                  <details className="mt-4">
                    <summary className="text-xs cursor-pointer">
                      Error Details (Development)
                    </summary>
                    <pre className="text-xs mt-2 overflow-auto max-h-32 bg-muted p-2 rounded">
                      {this.state.error?.stack}
                      {'\n\nComponent Stack:'}
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorBoundary(): (error: Error) => void {
  const [error, setError] = React.useState<Error | undefined>(undefined);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return captureError;
}
