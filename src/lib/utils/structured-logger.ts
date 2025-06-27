/**
 * Structured logging utility for API endpoints
 * Provides consistent, production-ready logging with PII protection
 */

// Constants for PII redaction
const USER_ID_REDACTION_LENGTH = 8;

interface LogContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: Error | string;
  metadata?: Record<string, unknown>;
}

interface SanitizedContext {
  [key: string]: unknown;
}

const LOG_LEVEL = process.env['LOG_LEVEL'] || 'info';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Redacts PII from log context while preserving debugging info
 */
function sanitizeContext(context: LogContext): SanitizedContext {
  const sanitized: SanitizedContext = {};
  
  for (const [key, value] of Object.entries(context)) {
    switch (key) {
      // Keep these for debugging/tracing
      case 'requestId':
      case 'endpoint':
      case 'method':
      case 'statusCode':
      case 'duration':
        sanitized[key] = value;
        break;
        
      // Redact but keep prefix for debugging
      case 'userId':
        if (typeof value === 'string' && value.length > USER_ID_REDACTION_LENGTH) {
          sanitized[key] = `${value.slice(0, USER_ID_REDACTION_LENGTH)}...`;
        } else {
          sanitized[key] = value;
        }
        break;
        
      // Handle errors safely
      case 'error':
        if (value instanceof Error) {
          sanitized[key] = {
            name: value.name,
            message: value.message,
            ...(IS_PRODUCTION ? {} : { stack: value.stack }),
          };
        } else if (typeof value === 'string') {
          sanitized[key] = value;
        }
        break;
        
      // Sanitize metadata recursively
      case 'metadata':
        if (value !== null && value !== undefined && typeof value === 'object') {
          sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
        }
        break;
        
      default:
        sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitize metadata object recursively
 */
function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    // Redact sensitive fields
    if (['email', 'password', 'token', 'secret', 'key'].some(sensitive => 
      key.toLowerCase().includes(sensitive)
    )) {
      sanitized[key] = '[REDACTED]';
    } else if (Array.isArray(value)) {
      sanitized[key] = `[Array(${value.length})]`;
    } else if (value !== null && value !== undefined && typeof value === 'object') {
      sanitized[key] = '[Object]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Check if log level should be emitted
 */
function shouldLog(level: string): boolean {
  const levels = ['debug', 'info', 'warn', 'error'];
  const currentLevelIndex = levels.indexOf(LOG_LEVEL);
  const messageLevel = levels.indexOf(level);
  
  return messageLevel >= currentLevelIndex;
}

/**
 * API Logger class with structured logging
 */
export class APILogger {
  private baseContext: Partial<LogContext>;
  
  constructor(baseContext: Partial<LogContext> = {}) {
    this.baseContext = baseContext;
  }
  
  /**
   * Log successful API operations
   */
  info(message: string, context: Partial<LogContext> = {}): void {
    if (!shouldLog('info')) return;
    
    const fullContext = { ...this.baseContext, ...context };
    const sanitized = sanitizeContext(fullContext);
    
    console.warn(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...sanitized,
    }));
  }
  
  /**
   * Log warnings (recoverable issues)
   */
  warn(message: string, context: Partial<LogContext> = {}): void {
    if (!shouldLog('warn')) return;
    
    const fullContext = { ...this.baseContext, ...context };
    const sanitized = sanitizeContext(fullContext);
    
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...sanitized,
    }));
  }
  
  /**
   * Log errors (failures requiring attention)
   */
  error(message: string, context: Partial<LogContext> = {}): void {
    if (!shouldLog('error')) return;
    
    const fullContext = { ...this.baseContext, ...context };
    const sanitized = sanitizeContext(fullContext);
    
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...sanitized,
    }));
  }
  
  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Partial<LogContext>): APILogger {
    return new APILogger({ ...this.baseContext, ...additionalContext });
  }
  
  /**
   * Create a timer for measuring operation duration
   */
  timer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }
}

/**
 * Create a logger instance for an API request
 */
export function createAPILogger(request: Request, endpoint: string): APILogger {
  const requestId = crypto.randomUUID();
  
  return new APILogger({
    requestId,
    endpoint,
    method: request.method,
  });
}

/**
 * Default logger instance
 */
export const logger = new APILogger(); 