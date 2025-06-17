import {
  PostCollectiveError,
  PostCollectiveValidationResult,
} from '@/types/enhanced-database.types';

import { postCollectiveAuditService } from './PostCollectiveAuditService';

// ---------------------------------------------------------------------------
// Constants (defined to avoid "magic numbers" in logic and string building)
// ---------------------------------------------------------------------------

const RANDOM_ID_START = 2;
const RANDOM_ID_LENGTH = 9;

const MAX_NETWORK_RETRIES = 3;
const MAX_DATABASE_RETRIES = 2;
const MAX_GENERAL_RETRIES = 1;

const RETRY_LOG_OFFSET = 2;

const BACKOFF_BASE_MS = 1_000;
const BACKOFF_EXPONENT = 2;
const BACKOFF_CAP_MS = 10_000;

const DATABASE_INITIAL_DELAY_MS = 2_000;
const DATABASE_DELAY_INCREMENT_MS = 1_000;


const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1_000;

const ONE_DAY_MS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

const TOP_COMMON_ERRORS = 10;
const MAX_ERROR_HISTORY = 500;

const DEFAULT_ERROR_LIMIT = 50;

const NETWORK_RETRY_DELAY_SEC = 5;
const DATABASE_RETRY_DELAY_SEC = 10;

const ISO_HOUR_LENGTH = 13;

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Enhanced error with context
export interface EnhancedPostCollectiveError extends PostCollectiveError {
  id: string;
  severity: ErrorSeverity;
  timestamp: Date;
  context: {
    operation: string;
    user_id?: string;
    post_id?: string;
    collective_ids?: string[];
    retry_count?: number;
    user_agent?: string;
    session_id?: string;
  };
  user_message: string;
  technical_message: string;
  suggested_actions: string[];
  retry_after?: number; // seconds
}

// Error recovery strategies
export interface ErrorRecoveryStrategy {
  should_retry: boolean;
  max_retries: number;
  retry_delay_ms: number;
  fallback_action?: () => Promise<void>;
  user_action_required: boolean;
}

/**
 * Enhanced error handling service for post-collective operations
 * Provides context-aware error processing, user-friendly messaging, and recovery strategies
 */
export class PostCollectiveErrorHandler {
  private errorHistory: EnhancedPostCollectiveError[] = [];
  private retryAttempts: Map<string, number> = new Map();

  /**
   * Process and enhance an error with context and user-friendly messaging
   */
  processError(
    error: PostCollectiveError,
    operation: string,
    context: {
      user_id?: string;
      post_id?: string;
      collective_ids?: string[];
      session_id?: string;
    } = {}
  ): EnhancedPostCollectiveError {
    const enhancedError: EnhancedPostCollectiveError = {
      ...error,
      id: `error_${Date.now()}_${crypto
        .randomUUID()
        .replace(/-/g, '')
        .slice(RANDOM_ID_START, RANDOM_ID_START + RANDOM_ID_LENGTH)}`,
      severity: this.determineSeverity(error),
      timestamp: new Date(),
      context: {
        operation,
        ...context,
        user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
        retry_count: this.getRetryCount(operation, context.user_id),
      },
      user_message: this.generateUserMessage(error, operation),
      technical_message: this.generateTechnicalMessage(error, operation),
      suggested_actions: this.generateSuggestedActions(error, operation),
      retry_after: this.calculateRetryDelay(error)
    };

    // Store error in history
    this.errorHistory.unshift(enhancedError);
    this.cleanupErrorHistory();

    // Log to audit service
    postCollectiveAuditService.logOperation(
      operation,
      context.post_id ?? '',
      context.collective_ids ?? [],
      context.user_id ?? '',
      false,
      error,
      { enhanced_error_id: enhancedError.id }
    );

    return enhancedError;
  }

  /**
   * Determine if an operation should be retried based on error type and history
   */
  getRecoveryStrategy(error: EnhancedPostCollectiveError): ErrorRecoveryStrategy {
    const retryKey = `${error.context.operation}_${error.context.user_id}`;
    const currentRetries = this.retryAttempts.get(retryKey) ?? 0;

    switch (error.type) {
      case 'network':
        return {
          should_retry: currentRetries < MAX_NETWORK_RETRIES,
          max_retries: MAX_NETWORK_RETRIES,
          retry_delay_ms: Math.min(
            BACKOFF_BASE_MS * Math.pow(BACKOFF_EXPONENT, currentRetries),
            BACKOFF_CAP_MS
          ),
          user_action_required: false,
        };

      case 'database':
        return {
          should_retry: currentRetries < MAX_DATABASE_RETRIES,
          max_retries: MAX_DATABASE_RETRIES,
          retry_delay_ms:
            DATABASE_INITIAL_DELAY_MS +
            currentRetries * DATABASE_DELAY_INCREMENT_MS,
          user_action_required: false,
        };

      case 'permission':
      case 'validation':
        return {
          should_retry: false,
          max_retries: 0,
          retry_delay_ms: 0,
          user_action_required: true,
        };

      default:
        return {
          should_retry: currentRetries < MAX_GENERAL_RETRIES,
          max_retries: MAX_GENERAL_RETRIES,
          retry_delay_ms: BACKOFF_BASE_MS,
          user_action_required: false,
        };
    }
  }

  /**
   * Execute an operation with automatic retry logic
   */
  async executeWithRetry<T>(
    operation: string,
    operationFn: () => Promise<T>,
    context: {
      user_id?: string;
      post_id?: string;
      collective_ids?: string[];
    } = {}
  ): Promise<T> {
    const retryKey = `${operation}_${context.user_id ?? 'anonymous'}`;
    let lastError: EnhancedPostCollectiveError | undefined;

    for (let attempt = 0; attempt <= MAX_NETWORK_RETRIES; attempt++) {
      try {
        // Reset retry count on success
        if (attempt > 0) {
          this.retryAttempts.delete(retryKey);
        }

        return await operationFn();
      } catch (error) {
        const postCollectiveError: PostCollectiveError = {
          type: this.classifyErrorType(error),
          message: error instanceof Error ? error.message : String(error),
          collective_id: context.collective_ids?.[0],
          details: { attempt, max_attempts: MAX_NETWORK_RETRIES }
        };

        lastError = this.processError(postCollectiveError, operation, {
          ...context,
          session_id: this.generateSessionId()
        });

        // Update retry count
        this.retryAttempts.set(retryKey, attempt + 1);

        const strategy = this.getRecoveryStrategy(lastError);
        
        // Don't retry if strategy says not to or if we've exceeded max attempts
        if (!strategy.should_retry || attempt >= strategy.max_retries) {
          break;
        }

        // Wait before retrying
        await this.delay(strategy.retry_delay_ms);
        
        console.warn(
          `[PostCollectiveErrorHandler] Retrying ${operation} (attempt ${attempt + RETRY_LOG_OFFSET})`
        );
      }
    }

    // If we get here, all retries failed
    if (lastError !== undefined) {
      throw new Error(lastError.technical_message ?? lastError.message, {
        cause: lastError,
      });
    }

    throw new Error(`Operation ${operation} failed after retries`);
  }

  /**
   * Validate multiple operations and collect all errors
   */
  async validateOperations(
    operations: Array<{
      name: string;
      validator: () => Promise<PostCollectiveValidationResult>;
      context?: Record<string, unknown>;
    }>
  ): Promise<{
    valid: boolean;
    errors: EnhancedPostCollectiveError[];
    warnings: string[];
  }> {
    const allErrors: EnhancedPostCollectiveError[] = [];
    const allWarnings: string[] = [];

    for (const operation of operations) {
      try {
        const result = await operation.validator();
        
        if (!result.valid) {
          for (const error of result.errors) {
            const enhancedError = this.processError(error, operation.name, {
              session_id: this.generateSessionId()
            });
            allErrors.push(enhancedError);
          }
        }

        allWarnings.push(...result.warnings.map(w => w.message));
      } catch (error) {
        const postCollectiveError: PostCollectiveError = {
          type: 'validation',
          message: `Validation failed for ${operation.name}: ${error instanceof Error ? error.message : String(error)}`
        };

        const enhancedError = this.processError(postCollectiveError, operation.name);
        allErrors.push(enhancedError);
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(): {
    total_errors: number;
    errors_by_type: Record<string, number>;
    errors_by_severity: Record<ErrorSeverity, number>;
    most_common_errors: Array<{
      message: string;
      count: number;
      severity: ErrorSeverity;
    }>;
    error_trends: Array<{
      hour: string;
      count: number;
    }>;
  } {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - ONE_DAY_MS);
    const recentErrors = this.errorHistory.filter(e => e.timestamp >= last24Hours);

    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    const errorMessages: Record<string, { count: number; severity: ErrorSeverity }> = {};

    recentErrors.forEach(error => {
      // Count by type
      errorsByType[error.type] = (errorsByType[error.type] ?? 0) + 1;

      // Count by severity
      errorsBySeverity[error.severity]++;

      // Count by message
      const key = error.user_message;
      const existing = errorMessages[key];
      if (existing !== undefined) {
        existing.count += 1;
      } else {
        errorMessages[key] = { count: 1, severity: error.severity };
      }
    });

    const mostCommonErrors = Object.entries(errorMessages)
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_COMMON_ERRORS);

    // Generate hourly trends
    const hourlyTrends: Record<string, number> = {};
    recentErrors.forEach(error => {
      const hour = error.timestamp.toISOString().slice(0, ISO_HOUR_LENGTH); // YYYY-MM-DDTHH
      hourlyTrends[hour] = (hourlyTrends[hour] ?? 0) + 1;
    });

    const errorTrends = Object.entries(hourlyTrends)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    return {
      total_errors: recentErrors.length,
      errors_by_type: errorsByType,
      errors_by_severity: errorsBySeverity,
      most_common_errors: mostCommonErrors,
      error_trends: errorTrends
    };
  }

  /**
   * Clear error history and retry counts
   */
  clearHistory(): void {
    this.errorHistory = [];
    this.retryAttempts.clear();
  }

  /**
   * Get recent errors for a specific user or operation
   */
  getRecentErrors(filter?: {
    user_id?: string;
    operation?: string;
    severity?: ErrorSeverity;
    limit?: number;
  }): EnhancedPostCollectiveError[] {
    let filteredErrors = this.errorHistory;

    if (filter?.user_id !== undefined && filter.user_id !== '') {
      filteredErrors = filteredErrors.filter(
        (e) => e.context.user_id === filter.user_id
      );
    }

    if (filter?.operation !== undefined && filter.operation !== '') {
      filteredErrors = filteredErrors.filter(
        (e) => e.context.operation === filter.operation
      );
    }

    if (filter?.severity !== undefined) {
      filteredErrors = filteredErrors.filter(
        (e) => e.severity === filter.severity
      );
    }

    return filteredErrors.slice(0, filter?.limit ?? DEFAULT_ERROR_LIMIT);
  }

  /**
   * Determine error severity based on type and context
   */
  private determineSeverity(error: PostCollectiveError): ErrorSeverity {
    switch (error.type) {
      case 'permission':
        return 'high';
      case 'validation':
        return 'medium';
      case 'database':
        return 'high';
      case 'network':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Generate user-friendly error message
   */
  private generateUserMessage(
    error: PostCollectiveError,
    _operation: string
  ): string {
    const baseMessages = {
      permission: 'You don\'t have permission to perform this action.',
      validation: 'Please check your input and try again.',
      database: 'A temporary issue occurred. Please try again.',
      network: 'Connection issue. Please check your internet connection.'
    };

    let message = baseMessages[error.type] || 'An unexpected error occurred.';

    if (error.collective_name !== undefined && error.collective_name !== '') {
      message += ` (Collective: ${error.collective_name})`;
    }

    return message;
  }

  /**
   * Generate technical error message for developers
   */
  private generateTechnicalMessage(
    error: PostCollectiveError,
    _operation: string
  ): string {
    return `${_operation} failed: ${error.message} (Type: ${error.type}${
      error.collective_id !== undefined && error.collective_id !== ''
        ? `, Collective: ${error.collective_id}`
        : ''
    })`;
  }

  /**
   * Generate suggested actions for the user
   */
  private generateSuggestedActions(
    error: PostCollectiveError,
    _operation: string
  ): string[] {
    const actions: Record<string, string[]> = {
      permission: [
        'Check if you have the required role in the collective',
        'Contact the collective administrator for access',
        'Try selecting a different collective where you have posting rights'
      ],
      validation: [
        'Verify all required fields are filled out correctly',
        'Check that your post content meets the requirements',
        'Ensure you\'ve selected at least one collective'
      ],
      database: [
        'Wait a moment and try again',
        'Refresh the page and retry',
        'Contact support if the issue persists'
      ],
      network: [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a moment and try again'
      ]
    };

    return actions[error.type] ?? ['Try again or contact support if the issue persists'];
  }

  /**
   * Calculate retry delay based on error type
   */
  private calculateRetryDelay(error: PostCollectiveError): number | undefined {
    switch (error.type) {
      case 'network':
        return NETWORK_RETRY_DELAY_SEC;
      case 'database':
        return DATABASE_RETRY_DELAY_SEC;
      default:
        return undefined; // No automatic retry
    }
  }

  /**
   * Classify error type from exception
   */
  private classifyErrorType(error: unknown): PostCollectiveError['type'] {
    if (error instanceof Error && error.message !== undefined && error.message !== '') {
      const message = error.message.toLowerCase();

      if (message.includes('network') || message.includes('fetch')) {
        return 'network';
      }

      if (message.includes('permission') || message.includes('unauthorized')) {
        return 'permission';
      }

      if (message.includes('validation') || message.includes('invalid')) {
        return 'validation';
      }

      if (message.includes('database') || message.includes('query') || message.includes('constraint')) {
        return 'database';
      }
    }

    return 'database'; // Default fallback
  }

  /**
   * Get current retry count for an operation
   */
  private getRetryCount(operation: string, userId?: string): number {
    const retryKey = `${operation}_${userId}`;
    return this.retryAttempts.get(retryKey) ?? 0;
  }

  /**
   * Generate a session ID for tracking related operations
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${crypto
      .randomUUID()
      .replace(/-/g, '')
      .slice(RANDOM_ID_START, RANDOM_ID_START + RANDOM_ID_LENGTH)}`;
  }

  /**
   * Clean up old error history to prevent memory leaks
   */
  private cleanupErrorHistory(): void {
    if (this.errorHistory.length > MAX_ERROR_HISTORY) {
      this.errorHistory = this.errorHistory.slice(0, MAX_ERROR_HISTORY);
    }
  }

  /**
   * Simple delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

// Export singleton instance
export const postCollectiveErrorHandler = new PostCollectiveErrorHandler(); 