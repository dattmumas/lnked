// Environment validation utility
// Addresses Issue 10: ENV defaults silently override bad input

// Default configuration constants
const DEFAULT_CONFIG = {
  GROUP_MAX_PARTICIPANTS: 50,
  GROUP_MAX_PARTICIPANTS_MIN: 2,
  GROUP_MAX_PARTICIPANTS_MAX: 1000,
  GROUP_MAX_TITLE_LENGTH: 128,
  GROUP_MAX_TITLE_LENGTH_MIN: 1,
  GROUP_MAX_TITLE_LENGTH_MAX: 500,
  GROUP_MIN_PARTICIPANTS: 1,
  RATE_LIMIT_USER_REQUESTS_PER_HOUR: 60,
  RATE_LIMIT_USER_REQUESTS_MIN: 1,
  RATE_LIMIT_USER_REQUESTS_MAX: 10000,
  RATE_LIMIT_IP_REQUESTS_PER_HOUR: 200,
  RATE_LIMIT_IP_REQUESTS_MIN: 1,
  RATE_LIMIT_IP_REQUESTS_MAX: 100000,
  PARTICIPANT_BATCH_SIZE: 500,
  PARTICIPANT_BATCH_SIZE_MIN: 10,
  PARTICIPANT_BATCH_SIZE_MAX: 1000,
} as const;

interface EnvironmentConfig {
  // Group configuration
  GROUP_MAX_PARTICIPANTS: number;
  GROUP_MAX_TITLE_LENGTH: number;
  GROUP_MIN_PARTICIPANTS: number;
  
  // Rate limiting
  RATE_LIMIT_USER_REQUESTS_PER_HOUR: number;
  RATE_LIMIT_IP_REQUESTS_PER_HOUR: number;
  
  // Batch processing
  PARTICIPANT_BATCH_SIZE: number;
  
  // Environment info
  NODE_ENV: string;
  VERCEL_ENV?: string;
}

interface ValidationResult {
  isValid: boolean;
  config: EnvironmentConfig;
  errors: string[];
  warnings: string[];
}

// Validate a numeric environment variable
function validateNumber(
  key: string,
  value: string | undefined,
  defaultValue: number,
  min?: number,
  max?: number,
): { value: number; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (value === undefined || value === '') {
    warnings.push(`Environment variable ${key} not set, using default: ${defaultValue}`);
    return { value: defaultValue, errors, warnings };
  }
  
  const parsed = Number(value);
  
  if (Number.isNaN(parsed)) {
    errors.push(`Environment variable ${key}="${value}" is not a valid number, using default: ${defaultValue}`);
    return { value: defaultValue, errors, warnings };
  }
  
  if (!Number.isInteger(parsed)) {
    errors.push(`Environment variable ${key}="${value}" must be an integer, using default: ${defaultValue}`);
    return { value: defaultValue, errors, warnings };
  }
  
  if (min !== undefined && parsed < min) {
    errors.push(`Environment variable ${key}="${value}" must be >= ${min}, using default: ${defaultValue}`);
    return { value: defaultValue, errors, warnings };
  }
  
  if (max !== undefined && parsed > max) {
    errors.push(`Environment variable ${key}="${value}" must be <= ${max}, using default: ${defaultValue}`);
    return { value: defaultValue, errors, warnings };
  }
  
  return { value: parsed, errors, warnings };
}

// Validate environment configuration
export function validateEnvironmentConfig(): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  
  // Group configuration validation
  const maxParticipants = validateNumber(
    'GROUP_MAX_PARTICIPANTS',
    process.env.GROUP_MAX_PARTICIPANTS,
    DEFAULT_CONFIG.GROUP_MAX_PARTICIPANTS,
    DEFAULT_CONFIG.GROUP_MAX_PARTICIPANTS_MIN, // Minimum 2 (creator + 1 other)
    DEFAULT_CONFIG.GROUP_MAX_PARTICIPANTS_MAX, // Reasonable upper limit
  );
  allErrors.push(...maxParticipants.errors);
  allWarnings.push(...maxParticipants.warnings);
  
  const maxTitleLength = validateNumber(
    'GROUP_MAX_TITLE_LENGTH',
    process.env.GROUP_MAX_TITLE_LENGTH,
    DEFAULT_CONFIG.GROUP_MAX_TITLE_LENGTH,
    DEFAULT_CONFIG.GROUP_MAX_TITLE_LENGTH_MIN,
    DEFAULT_CONFIG.GROUP_MAX_TITLE_LENGTH_MAX,
  );
  allErrors.push(...maxTitleLength.errors);
  allWarnings.push(...maxTitleLength.warnings);
  
  const minParticipants = validateNumber(
    'GROUP_MIN_PARTICIPANTS',
    process.env.GROUP_MIN_PARTICIPANTS,
    DEFAULT_CONFIG.GROUP_MIN_PARTICIPANTS,
    0,
    maxParticipants.value - 1,
  );
  allErrors.push(...minParticipants.errors);
  allWarnings.push(...minParticipants.warnings);
  
  // Rate limiting validation
  const userRateLimit = validateNumber(
    'RATE_LIMIT_USER_REQUESTS_PER_HOUR',
    process.env.RATE_LIMIT_USER_REQUESTS_PER_HOUR,
    DEFAULT_CONFIG.RATE_LIMIT_USER_REQUESTS_PER_HOUR,
    DEFAULT_CONFIG.RATE_LIMIT_USER_REQUESTS_MIN,
    DEFAULT_CONFIG.RATE_LIMIT_USER_REQUESTS_MAX,
  );
  allErrors.push(...userRateLimit.errors);
  allWarnings.push(...userRateLimit.warnings);
  
  const ipRateLimit = validateNumber(
    'RATE_LIMIT_IP_REQUESTS_PER_HOUR',
    process.env.RATE_LIMIT_IP_REQUESTS_PER_HOUR,
    DEFAULT_CONFIG.RATE_LIMIT_IP_REQUESTS_PER_HOUR,
    DEFAULT_CONFIG.RATE_LIMIT_IP_REQUESTS_MIN,
    DEFAULT_CONFIG.RATE_LIMIT_IP_REQUESTS_MAX,
  );
  allErrors.push(...ipRateLimit.errors);
  allWarnings.push(...ipRateLimit.warnings);
  
  // Batch processing validation
  const batchSize = validateNumber(
    'PARTICIPANT_BATCH_SIZE',
    process.env.PARTICIPANT_BATCH_SIZE,
    DEFAULT_CONFIG.PARTICIPANT_BATCH_SIZE,
    DEFAULT_CONFIG.PARTICIPANT_BATCH_SIZE_MIN,
    DEFAULT_CONFIG.PARTICIPANT_BATCH_SIZE_MAX,
  );
  allErrors.push(...batchSize.errors);
  allWarnings.push(...batchSize.warnings);
  
  // Environment validation
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    allWarnings.push(`Unknown NODE_ENV: ${nodeEnv}`);
  }
  
  // Cross-validation
  if (minParticipants.value >= maxParticipants.value) {
    allErrors.push(`GROUP_MIN_PARTICIPANTS (${minParticipants.value}) must be less than GROUP_MAX_PARTICIPANTS (${maxParticipants.value})`);
  }
  
  if (userRateLimit.value > ipRateLimit.value) {
    allWarnings.push(`USER rate limit (${userRateLimit.value}) exceeds IP rate limit (${ipRateLimit.value}), which may cause unexpected behavior`);
  }
  
  const config: EnvironmentConfig = {
    GROUP_MAX_PARTICIPANTS: maxParticipants.value,
    GROUP_MAX_TITLE_LENGTH: maxTitleLength.value,
    GROUP_MIN_PARTICIPANTS: minParticipants.value,
    RATE_LIMIT_USER_REQUESTS_PER_HOUR: userRateLimit.value,
    RATE_LIMIT_IP_REQUESTS_PER_HOUR: ipRateLimit.value,
    PARTICIPANT_BATCH_SIZE: batchSize.value,
    NODE_ENV: nodeEnv,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  
  return {
    isValid: allErrors.length === 0,
    config,
    errors: allErrors,
    warnings: allWarnings,
  };
}

// Log validation results
export function logEnvironmentValidation(validation: ValidationResult): void {
  if (validation.warnings.length > 0) {
    console.warn('Environment configuration warnings:', validation.warnings);
  }
  
  if (validation.errors.length > 0) {
    console.error('Environment configuration errors:', validation.errors);
    
    // In production, we want to fail fast on configuration errors
    if (validation.config.NODE_ENV === 'production') {
      throw new Error(`Invalid environment configuration: ${validation.errors.join(', ')}`);
    }
  }
  
  if (validation.config.NODE_ENV === 'development') {
    console.warn('Environment configuration loaded:', {
      GROUP_MAX_PARTICIPANTS: validation.config.GROUP_MAX_PARTICIPANTS,
      RATE_LIMIT_USER_REQUESTS_PER_HOUR: validation.config.RATE_LIMIT_USER_REQUESTS_PER_HOUR,
      RATE_LIMIT_IP_REQUESTS_PER_HOUR: validation.config.RATE_LIMIT_IP_REQUESTS_PER_HOUR,
    });
  }
}

// Global configuration instance (validated once at startup)
let globalConfig: EnvironmentConfig | undefined;

export function getValidatedEnvironmentConfig(): EnvironmentConfig {
  if (globalConfig === undefined) {
    const validation = validateEnvironmentConfig();
    logEnvironmentValidation(validation);
    globalConfig = validation.config;
  }
  
  return globalConfig;
}
