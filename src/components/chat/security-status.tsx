'use client';

import { Shield, Check, AlertTriangle, Info } from 'lucide-react';
import { useMemo, memo } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConversationSecurity } from '@/hooks/useConversationSecurity';
import {
  SECURITY_STATUS_MAP,
  SECURITY_CHECK_LABELS,
  SECURITY_STATUS_LABELS,
  type SecurityLevel,
} from '@/lib/constants/security';

interface SecurityStatusProps {
  conversationId?: string;
  className?: string;
  onStateChange?: (state: {
    isAuthenticated: boolean;
    canViewConversation: boolean;
    canSendMessages: boolean;
    isLoading: boolean;
    error: string | null;
  }) => void;
}

interface SecurityCheckRowProps {
  label: string;
  isAllowed: boolean;
  testId?: string;
}

const SecurityCheckRow = memo(function SecurityCheckRow({
  label,
  isAllowed,
  testId,
}: SecurityCheckRowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between" data-testid={testId}>
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        {isAllowed ? (
          <>
            <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
            <span className="text-xs text-green-700">
              {SECURITY_STATUS_LABELS.allowed}
            </span>
          </>
        ) : (
          <>
            <AlertTriangle
              className="h-4 w-4 text-red-500"
              aria-hidden="true"
            />
            <span className="text-xs text-red-700">
              {SECURITY_STATUS_LABELS.denied}
            </span>
          </>
        )}
      </div>
    </div>
  );
});

function LoadingSpinner(): React.JSX.Element {
  return (
    <div
      className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"
      role="status"
      aria-label="Loading"
    />
  );
}

export interface SecurityStatusViewProps {
  className?: string;
  checks: {
    isAuthenticated: boolean;
    canViewConversation: boolean;
    canSendMessages: boolean;
  };
  level: SecurityLevel;
  meta: {
    isLoading: boolean;
    error: string | null;
    hasConversationId: boolean;
  };
}

/**
 * Pure presentational component for security status display
 * Useful for Storybook and unit testing without mocking hooks
 */
export function SecurityStatusView({
  className,
  checks,
  level,
  meta,
}: SecurityStatusViewProps): React.JSX.Element {
  const { isAuthenticated, canViewConversation, canSendMessages } = checks;
  const { isLoading, error, hasConversationId } = meta;
  const securityConfig = SECURITY_STATUS_MAP[level];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" aria-hidden="true" />
          {SECURITY_STATUS_LABELS.securityStatus}
          <Badge
            variant={securityConfig.variant}
            className="text-xs"
            data-testid="security-badge"
          >
            {securityConfig.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <LoadingSpinner />
            <span className="text-sm text-muted-foreground">
              {SECURITY_STATUS_LABELS.checkingSecurity}
            </span>
          </div>
        ) : (
          <>
            {/* Authentication Status */}
            <SecurityCheckRow
              label={SECURITY_CHECK_LABELS.authentication}
              isAllowed={isAuthenticated}
              testId="auth-check"
            />

            {/* Conversation-specific permissions */}
            {hasConversationId && (
              <>
                <SecurityCheckRow
                  label={SECURITY_CHECK_LABELS.viewMessages}
                  isAllowed={canViewConversation}
                  testId="view-messages-check"
                />
                <SecurityCheckRow
                  label={SECURITY_CHECK_LABELS.sendMessages}
                  isAllowed={canSendMessages}
                  testId="send-messages-check"
                />
              </>
            )}

            {/* Error state */}
            {error !== null && error !== undefined && error !== '' && (
              <Alert className="mt-4" role="alert">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription className="text-xs">
                  Security check failed: {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Security Information - Hide sensitive details on danger level */}
            {level !== 'danger' && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" aria-hidden="true" />
                <AlertDescription className="text-xs" aria-live="polite">
                  {securityConfig.description}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function SecurityStatus({
  conversationId,
  className,
  onStateChange,
}: SecurityStatusProps): React.JSX.Element {
  const {
    isAuthenticated,
    canViewConversation,
    canSendMessages,
    isLoading,
    error,
  } = useConversationSecurity(conversationId, { onStateChange });

  const hasConversationId = Boolean(conversationId?.trim());

  const securityLevel: SecurityLevel = useMemo(() => {
    if (!isAuthenticated) return 'danger';
    if (hasConversationId && !canViewConversation) {
      return 'warning';
    }
    return 'success';
  }, [isAuthenticated, hasConversationId, canViewConversation]);

  return (
    <SecurityStatusView
      className={className}
      checks={{
        isAuthenticated,
        canViewConversation,
        canSendMessages,
      }}
      level={securityLevel}
      meta={{
        isLoading,
        error,
        hasConversationId,
      }}
    />
  );
}

export default SecurityStatus;
