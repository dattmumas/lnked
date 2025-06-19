import type { Badge } from '@/components/ui/badge';

// Simple internationalization helper - can be replaced with a proper i18n library
const t = (key: string): string => {
  const translations: Record<string, string> = {
    'security.status.secure': 'Secure',
    'security.status.limited': 'Limited', 
    'security.status.insecure': 'Insecure',
    'security.description.secure': 'Your access is secure. All operations are protected by Row Level Security policies.',
    'security.description.limited': 'Limited access. You may not have permissions for all operations.',
    'security.description.insecure': 'Authentication required. Please sign in to access chat features.',
    'security.check.authentication': 'Authentication',
    'security.check.viewMessages': 'View Messages',
    'security.check.sendMessages': 'Send Messages',
    'security.status.authenticated': 'Authenticated',
    'security.status.notAuthenticated': 'Not Authenticated',
    'security.status.allowed': 'Allowed',
    'security.status.denied': 'Denied',
    'security.status.checkingSecurity': 'Checking security...',
    'security.status.title': 'Security Status',
  };
  
  return translations[key] ?? key;
};

export type SecurityLevel = 'success' | 'warning' | 'danger';

export interface SecurityStatusConfig {
  label: string;
  variant: React.ComponentProps<typeof Badge>['variant'];
  description: string;
}

export const SECURITY_STATUS_MAP: Record<SecurityLevel, SecurityStatusConfig> = {
  success: {
    label: t('security.status.secure'),
    variant: 'default',
    description: t('security.description.secure'),
  },
  warning: {
    label: t('security.status.limited'),
    variant: 'secondary',
    description: t('security.description.limited'),
  },
  danger: {
    label: t('security.status.insecure'),
    variant: 'destructive',
    description: t('security.description.insecure'),
  },
} as const;

export const SECURITY_CHECK_LABELS = {
  authentication: t('security.check.authentication'),
  viewMessages: t('security.check.viewMessages'),
  sendMessages: t('security.check.sendMessages'),
} as const;

export const SECURITY_STATUS_LABELS = {
  authenticated: t('security.status.authenticated'),
  notAuthenticated: t('security.status.notAuthenticated'),
  allowed: t('security.status.allowed'),
  denied: t('security.status.denied'),
  checkingSecurity: t('security.status.checkingSecurity'),
  securityStatus: t('security.status.title'),
} as const;

// Export the t function for use in components
export { t }; 