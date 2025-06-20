/**
 * Structured webhook logging utility with PII protection
 * Provides consistent logging format for webhook operations
 */

// Constants for PII redaction
const PII_REDACTION_PREFIX_LENGTH = 8;
const ACCOUNT_ID_REDACTION_PREFIX_LENGTH = 6;

interface WebhookLogContext {
  eventId?: string;
  eventType?: string;
  customerId?: string;
  subscriptionId?: string;
  accountId?: string;
  userId?: string;
  processingTimeMs?: number;
  [key: string]: unknown;
}

interface SanitizedContext {
  [key: string]: unknown;
}

/**
 * Redacts PII from webhook context while preserving debugging info
 */
function sanitizeContext(context: WebhookLogContext): SanitizedContext {
  const sanitized: SanitizedContext = {};
  
  for (const [key, value] of Object.entries(context)) {
    switch (key) {
      // Keep these for debugging/tracing
      case 'eventId':
      case 'eventType':
      case 'subscriptionId':
      case 'processingTimeMs':
        sanitized[key] = value;
        break;
      
      // Redact user identifiers but keep prefixes for debugging
      case 'customerId':
      case 'userId':
        if (typeof value === 'string' && value.length > PII_REDACTION_PREFIX_LENGTH) {
          sanitized[key] = `${value.substring(0, PII_REDACTION_PREFIX_LENGTH)}***`;
        } else {
          sanitized[key] = '***';
        }
        break;
      
      // Redact account IDs 
      case 'accountId':
        if (typeof value === 'string' && value.length > ACCOUNT_ID_REDACTION_PREFIX_LENGTH) {
          sanitized[key] = `${value.substring(0, ACCOUNT_ID_REDACTION_PREFIX_LENGTH)}***`;
        } else {
          sanitized[key] = '***';
        }
        break;
      
      // Include non-sensitive data
      default:
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          sanitized[key] = value;
        }
        break;
    }
  }
  
  return sanitized;
}

/**
 * Webhook-specific structured logger
 */
export const webhookLogger = {
  info: (message: string, context?: WebhookLogContext): void => {
    const sanitized = context ? sanitizeContext(context) : {};
    // Use warn for info-level messages to comply with console restrictions
    console.warn(`[INFO] ${message}`, sanitized);
  },
  
  warn: (message: string, context?: WebhookLogContext): void => {
    const sanitized = context ? sanitizeContext(context) : {};
    console.warn(`[WARN] ${message}`, sanitized);
  },
  
  error: (message: string, error?: unknown, context?: WebhookLogContext): void => {
    const sanitized = context ? sanitizeContext(context) : {};
    
    // Extract safe error info without exposing raw objects
    const errorInfo = error instanceof Error 
      ? { 
          name: error.name, 
          message: error.message,
          // Only include stack in development
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        }
      : { error: 'Unknown error' };
    
    console.error(`[ERROR] ${message}`, { ...sanitized, error: errorInfo });
  },
  
  // Development-only detailed logging
  debug: (message: string, context?: WebhookLogContext): void => {
    if (process.env.NODE_ENV === 'development') {
      const sanitized = context ? sanitizeContext(context) : {};
      // Use warn for debug messages to comply with console restrictions
      console.warn(`[DEBUG] ${message}`, sanitized);
    }
  }
};

/**
 * Performance timing helper for webhook operations
 */
export function createWebhookTimer(): {
  end: () => number;
  endAndLog: (message: string, context?: Omit<WebhookLogContext, 'processingTimeMs'>) => void;
} {
  const startTime = Date.now();
  
  return {
    end: (): number => Date.now() - startTime,
    endAndLog: (message: string, context?: Omit<WebhookLogContext, 'processingTimeMs'>): void => {
      const processingTimeMs = Date.now() - startTime;
      webhookLogger.info(message, { ...context, processingTimeMs });
    }
  };
} 