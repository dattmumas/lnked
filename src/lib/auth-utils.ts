// Rate limiting utility
export class RateLimiter {
  private attempts: number[] = [];
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  canAttempt(): boolean {
    const now = Date.now();
    // Remove attempts outside the window
    this.attempts = this.attempts.filter(time => now - time < this.windowMs);
    return this.attempts.length < this.maxAttempts;
  }

  recordAttempt(): void {
    this.attempts.push(Date.now());
  }

  getTimeUntilReset(): number {
    if (this.attempts.length === 0) return 0;
    const oldestAttempt = Math.min(...this.attempts);
    const timeUntilReset = this.windowMs - (Date.now() - oldestAttempt);
    return Math.max(0, timeUntilReset);
  }
}

// Retry utility with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on rate limit errors - handle them differently
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = String(error.message).toLowerCase();
        if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
          throw error; // Don't retry rate limit errors
        }
      }
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Helper function to check if an error is a rate limit error
export function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'message' in error) {
    const errorMessage = String(error.message).toLowerCase();
    return errorMessage.includes('rate limit') || errorMessage.includes('too many requests');
  }
  return false;
}

// Helper function to format rate limit messages
export function formatRateLimitMessage(timeUntilReset: number, action: 'sign-in' | 'sign-up'): string {
  const minutes = Math.ceil(timeUntilReset / 60000);
  return `Too many ${action} attempts. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`;
}

// Helper function to get user-friendly error messages
export function getAuthErrorMessage(error: unknown, isSignUp: boolean = false): string {
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return 'An unexpected error occurred';
  }

  const errorMessage = String(error.message).toLowerCase();

  if (errorMessage.includes('invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  if (errorMessage.includes('user already registered')) {
    return 'An account with this email already exists. Please try signing in instead.';
  }

  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return 'Authentication service is temporarily busy. Please wait a moment and try again.';
  }

  if (errorMessage.includes('email not confirmed')) {
    return 'Please check your email and click the confirmation link before signing in.';
  }

  if (errorMessage.includes('signup disabled')) {
    return 'Account registration is currently disabled. Please contact support.';
  }

  // Return the original message if we don't have a specific handler
  return String(error.message);
} 