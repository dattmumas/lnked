# Rate Limiting Solution for Supabase Authentication

## Problem

The application was encountering `AuthApiError: Request rate limit reached` errors when making too many authentication requests to Supabase in a short period. This commonly occurs during development when testing authentication flows repeatedly.

## Solution Overview

We've implemented a comprehensive rate limiting and retry system with the following components:

### 1. Client-Side Rate Limiting (`RateLimiter` class)

- **Purpose**: Prevents excessive authentication attempts from the client side
- **Configuration**:
  - Sign-in: 5 attempts per minute
  - Sign-up: 3 attempts per minute (more restrictive)
- **Features**:
  - Sliding window rate limiting
  - Automatic cleanup of old attempts
  - Time-until-reset calculation for user feedback

### 2. Retry Logic with Exponential Backoff (`retryWithBackoff` function)

- **Purpose**: Handles transient network errors and temporary service issues
- **Configuration**:
  - Maximum 2 retries for authentication requests
  - Base delay of 2 seconds with exponential backoff
  - Jitter to prevent thundering herd problems
- **Smart Behavior**:
  - Does NOT retry rate limit errors (fails fast)
  - Only retries on network/temporary errors

### 3. Enhanced Error Handling

- **Rate Limit Detection**: Automatically detects rate limit errors
- **User-Friendly Messages**: Converts technical errors to readable messages
- **Specific Error Handling**:
  - Invalid credentials
  - User already exists
  - Email not confirmed
  - Service temporarily busy

### 4. Shared Utilities (`/lib/auth-utils.ts`)

- Centralized rate limiting and retry logic
- Consistent error handling across sign-in and sign-up
- Easy to maintain and update

## Implementation Details

### Files Modified

1. `src/lib/auth-utils.ts` - New shared utilities
2. `src/app/(auth)/sign-in/SignInPageClient.tsx` - Updated with rate limiting
3. `src/app/(auth)/sign-up/SignUpPageClient.tsx` - Updated with rate limiting

### Key Features

#### Rate Limiting

```typescript
const rateLimiter = new RateLimiter(5, 60000); // 5 attempts per minute

if (!rateLimiter.canAttempt()) {
  // Show user-friendly message with time until reset
  const timeUntilReset = rateLimiter.getTimeUntilReset();
  // Display formatted message
}
```

#### Retry Logic

```typescript
const result = await retryWithBackoff(
  () => supabase.auth.signInWithPassword(credentials),
  2, // max retries
  2000, // base delay in ms
);
```

#### Error Handling

```typescript
if (isRateLimitError(error)) {
  // Handle rate limit specifically
} else {
  // Use smart error message conversion
  setError(getAuthErrorMessage(error));
}
```

## User Experience Improvements

### Before

- Cryptic "Request rate limit reached" errors
- No guidance on when to retry
- Potential for users to keep retrying and making the problem worse

### After

- Clear, actionable error messages
- Countdown timers showing when users can retry
- Automatic prevention of excessive requests
- Graceful handling of temporary service issues

## Error Messages

### Rate Limiting Messages

- "Too many sign-in attempts. Please wait X minute(s) before trying again."
- "Authentication service is temporarily busy. Please wait a moment and try again."

### Enhanced Error Messages

- "Invalid email or password. Please check your credentials and try again."
- "An account with this email already exists. Please try signing in instead."
- "Please check your email and click the confirmation link before signing in."

## Development Benefits

### Debugging

- Detailed console logging in development mode
- Clear error categorization
- Session verification logging

### Maintainability

- Centralized utilities reduce code duplication
- Easy to adjust rate limiting parameters
- Consistent error handling patterns

### Testing

- Rate limiting can be easily disabled for testing
- Configurable retry parameters
- Isolated utility functions for unit testing

## Configuration Options

### Rate Limiting

```typescript
// Adjust these values based on your needs
new RateLimiter(
  5, // maxAttempts
  60000, // windowMs (1 minute)
);
```

### Retry Logic

```typescript
retryWithBackoff(
  fn,
  2, // maxRetries
  2000, // baseDelay (2 seconds)
);
```

## Best Practices

1. **Monitor Rate Limits**: Keep an eye on Supabase dashboard for rate limit metrics
2. **Adjust Limits**: Tune rate limiting parameters based on user behavior
3. **User Education**: Consider adding tooltips or help text about rate limiting
4. **Graceful Degradation**: Always provide fallback options when services are busy

## Future Enhancements

1. **Persistent Rate Limiting**: Store rate limit data in localStorage for cross-session persistence
2. **Adaptive Limits**: Adjust rate limits based on server response times
3. **Queue System**: Implement a request queue for handling bursts of authentication requests
4. **Analytics**: Track rate limiting events for optimization

## Testing the Solution

### Manual Testing

1. Try to sign in with wrong credentials multiple times
2. Verify rate limiting kicks in after configured attempts
3. Wait for the timeout and verify you can try again
4. Test with network issues (throttle connection)

### Automated Testing

```typescript
// Example test for rate limiter
const limiter = new RateLimiter(3, 60000);
expect(limiter.canAttempt()).toBe(true);
limiter.recordAttempt();
limiter.recordAttempt();
limiter.recordAttempt();
expect(limiter.canAttempt()).toBe(false);
```

This solution provides a robust, user-friendly approach to handling Supabase rate limits while maintaining a good user experience and preventing service abuse.
