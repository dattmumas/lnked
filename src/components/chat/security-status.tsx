'use client';

import { Shield, Check, AlertTriangle, Info } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { chatSecurity } from '@/lib/chat/security';

interface SecurityStatusProps {
  conversationId?: string;
  className?: string;
}

export function SecurityStatus({
  conversationId,
  className,
}: SecurityStatusProps) {
  const [securityStatus, setSecurityStatus] = useState({
    isAuthenticated: false,
    canViewConversation: false,
    canSendMessages: false,
    isLoading: true,
  });

  useEffect((): void => {
    async function checkSecurity() {
      try {
        setSecurityStatus((prev) => ({ ...prev, isLoading: true }));

        // Check basic authentication
        const user = await chatSecurity['getCurrentUserId']?.();
        const isAuthenticated = Boolean(user);

        let canViewConversation = false;
        let canSendMessages = false;

        if (conversationId && isAuthenticated) {
          // Check conversation-specific permissions
          canViewConversation =
            await chatSecurity.canViewConversation(conversationId);
          canSendMessages = await chatSecurity.canSendMessage(conversationId);
        }

        setSecurityStatus({
          isAuthenticated,
          canViewConversation,
          canSendMessages,
          isLoading: false,
        });
      } catch (error: unknown) {
        console.error('Security check failed:', error);
        setSecurityStatus({
          isAuthenticated: false,
          canViewConversation: false,
          canSendMessages: false,
          isLoading: false,
        });
      }
    }

    checkSecurity();
  }, [conversationId]);

  if (securityStatus.isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">
              Checking security...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSecurityLevel = () => {
    if (!securityStatus.isAuthenticated) return 'danger';
    if (conversationId && !securityStatus.canViewConversation) return 'warning';
    return 'success';
  };

  const securityLevel = getSecurityLevel();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Security Status
          <Badge
            variant={
              securityLevel === 'success'
                ? 'default'
                : securityLevel === 'warning'
                  ? 'secondary'
                  : 'destructive'
            }
            className="text-xs"
          >
            {securityLevel === 'success'
              ? 'Secure'
              : securityLevel === 'warning'
                ? 'Limited'
                : 'Insecure'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Authentication Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Authentication</span>
          <div className="flex items-center gap-2">
            {securityStatus.isAuthenticated ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-xs text-green-700">Authenticated</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-red-700">Not Authenticated</span>
              </>
            )}
          </div>
        </div>

        {/* Conversation Access */}
        {conversationId && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm">View Messages</span>
              <div className="flex items-center gap-2">
                {securityStatus.canViewConversation ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-green-700">Allowed</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-red-700">Denied</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Send Messages</span>
              <div className="flex items-center gap-2">
                {securityStatus.canSendMessages ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-green-700">Allowed</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-red-700">Denied</span>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Security Information */}
        <Alert className="mt-4">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {securityLevel === 'success' &&
              'Your access is secure. All operations are protected by Row Level Security policies.'}
            {securityLevel === 'warning' &&
              'Limited access. You may not have permissions for all operations.'}
            {securityLevel === 'danger' &&
              'Authentication required. Please sign in to access chat features.'}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default SecurityStatus;
