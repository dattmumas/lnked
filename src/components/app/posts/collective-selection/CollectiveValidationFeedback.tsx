'use client';

import { useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  Users,
  Shield,
} from 'lucide-react';
import { useCollectiveMemberships } from '@/hooks/posts/useCollectiveMemberships';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CollectiveValidationFeedbackProps {
  selectedCollectiveIds: string[];
  maxSelections?: number;
  minSelections?: number;
  showPermissionWarnings?: boolean;
  showSelectionLimits?: boolean;
  showCollectiveInfo?: boolean;
  className?: string;
}

type ValidationLevel = 'success' | 'warning' | 'error' | 'info';

interface ValidationMessage {
  level: ValidationLevel;
  message: string;
  action?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function CollectiveValidationFeedback({
  selectedCollectiveIds,
  maxSelections,
  minSelections = 0,
  showPermissionWarnings = true,
  showSelectionLimits = true,
  showCollectiveInfo = true,
  className,
}: CollectiveValidationFeedbackProps) {
  // Fetch collective data
  const { data: allCollectives = [], isLoading } =
    useCollectiveMemberships(false);

  const selectedCollectives = allCollectives.filter((collective) =>
    selectedCollectiveIds.includes(collective.id),
  );

  // Generate validation messages
  const validationMessages = useMemo(() => {
    const messages: ValidationMessage[] = [];
    const selectedCount = selectedCollectiveIds.length;

    // Check minimum selections - only show if minSelections > 0
    if (minSelections > 0 && selectedCount < minSelections) {
      messages.push({
        level: 'error',
        message: `You must select at least ${minSelections} collective${minSelections !== 1 ? 's' : ''} to publish this post.`,
        action: 'Add more collectives',
        icon: AlertCircle,
      });
    }

    // Check maximum selections
    if (maxSelections && selectedCount > maxSelections) {
      messages.push({
        level: 'error',
        message: `You can select a maximum of ${maxSelections} collective${maxSelections !== 1 ? 's' : ''}. Please remove ${selectedCount - maxSelections}.`,
        action: 'Remove collectives',
        icon: AlertCircle,
      });
    }

    // Check approaching limit
    if (
      showSelectionLimits &&
      maxSelections &&
      selectedCount === maxSelections
    ) {
      messages.push({
        level: 'warning',
        message: `You've reached the maximum of ${maxSelections} collective${maxSelections !== 1 ? 's' : ''}.`,
        icon: AlertTriangle,
      });
    }

    // Check permission warnings
    if (showPermissionWarnings && selectedCollectives.length > 0) {
      const collectivesWithoutPermission = selectedCollectives.filter(
        (c) => !c.can_post,
      );

      if (collectivesWithoutPermission.length > 0) {
        messages.push({
          level: 'error',
          message: `You don't have posting permissions in ${collectivesWithoutPermission.length} selected collective${collectivesWithoutPermission.length !== 1 ? 's' : ''}: ${collectivesWithoutPermission.map((c) => c.name).join(', ')}.`,
          action: 'Remove these collectives',
          icon: Shield,
        });
      }
    }

    // Success message - updated logic
    if (
      selectedCount >= minSelections &&
      (!maxSelections || selectedCount <= maxSelections) &&
      (selectedCollectives.length === 0 ||
        selectedCollectives.every((c) => c.can_post))
    ) {
      if (selectedCount > 0) {
        messages.push({
          level: 'success',
          message: `Ready to share with ${selectedCount} collective${selectedCount !== 1 ? 's' : ''}.`,
          icon: CheckCircle2,
        });
      } else if (minSelections === 0) {
        messages.push({
          level: 'info',
          message: 'Post will be published to your personal newsletter only.',
          icon: CheckCircle2,
        });
      }
    }

    // Info about collective reach
    if (showCollectiveInfo && selectedCollectives.length > 0) {
      const totalMembers = selectedCollectives.reduce(
        (sum, c) => sum + (c.member_count || 0),
        0,
      );
      if (totalMembers > 0) {
        messages.push({
          level: 'info',
          message: `Your post will reach approximately ${totalMembers} member${totalMembers !== 1 ? 's' : ''} across selected collectives.`,
          icon: Users,
        });
      }
    }

    return messages;
  }, [
    selectedCollectiveIds,
    selectedCollectives,
    maxSelections,
    minSelections,
    showPermissionWarnings,
    showSelectionLimits,
    showCollectiveInfo,
  ]);

  // Group messages by level
  const errorMessages = validationMessages.filter((m) => m.level === 'error');
  const warningMessages = validationMessages.filter(
    (m) => m.level === 'warning',
  );
  const successMessages = validationMessages.filter(
    (m) => m.level === 'success',
  );
  const infoMessages = validationMessages.filter((m) => m.level === 'info');

  // Don't render anything if loading or no messages
  if (isLoading || validationMessages.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Error Messages */}
      {errorMessages.map((message, index) => (
        <ValidationAlert key={`error-${index}`} message={message} />
      ))}

      {/* Warning Messages */}
      {warningMessages.map((message, index) => (
        <ValidationAlert key={`warning-${index}`} message={message} />
      ))}

      {/* Success Messages */}
      {successMessages.map((message, index) => (
        <ValidationAlert key={`success-${index}`} message={message} />
      ))}

      {/* Info Messages */}
      {infoMessages.map((message, index) => (
        <ValidationAlert key={`info-${index}`} message={message} />
      ))}

      {/* Selection Summary */}
      {selectedCollectives.length > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {selectedCollectives.length} collective
                  {selectedCollectives.length !== 1 ? 's' : ''} selected
                </span>
              </div>

              {maxSelections && (
                <Badge variant="secondary" className="text-xs">
                  {selectedCollectives.length} / {maxSelections}
                </Badge>
              )}
            </div>

            {/* Show collective names */}
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedCollectives.slice(0, 3).map((collective) => (
                <Badge
                  key={collective.id}
                  variant="outline"
                  className="text-xs"
                >
                  {collective.name}
                </Badge>
              ))}
              {selectedCollectives.length > 3 && (
                <Badge variant="outline" className="text-xs text-gray-500">
                  +{selectedCollectives.length - 3} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Individual validation alert component
interface ValidationAlertProps {
  message: ValidationMessage;
}

function ValidationAlert({ message }: ValidationAlertProps) {
  const { level, message: text, action, icon: Icon } = message;

  const alertStyles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };

  const iconStyles = {
    error: 'text-red-500',
    warning: 'text-amber-500',
    success: 'text-green-500',
    info: 'text-blue-500',
  };

  return (
    <Alert className={cn('border', alertStyles[level])}>
      <Icon className={cn('h-4 w-4', iconStyles[level])} />
      <AlertDescription className="flex items-center justify-between">
        <span>{text}</span>
        {action && (
          <Badge variant="outline" className="ml-2 text-xs">
            {action}
          </Badge>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Compact version for inline validation
export function CompactCollectiveValidationFeedback(
  props: CollectiveValidationFeedbackProps,
) {
  const { selectedCollectiveIds, maxSelections, minSelections = 0 } = props;
  const selectedCount = selectedCollectiveIds.length;

  let status: 'valid' | 'invalid' | 'warning' = 'valid';
  let message = '';
  let icon = CheckCircle2;

  if (minSelections > 0 && selectedCount < minSelections) {
    status = 'invalid';
    message = `Select ${minSelections - selectedCount} more`;
    icon = AlertCircle;
  } else if (maxSelections && selectedCount > maxSelections) {
    status = 'invalid';
    message = `Remove ${selectedCount - maxSelections}`;
    icon = AlertCircle;
  } else if (maxSelections && selectedCount === maxSelections) {
    status = 'warning';
    message = 'At maximum';
    icon = AlertTriangle;
  } else {
    status = 'valid';
    if (selectedCount > 0) {
      message = `${selectedCount} selected`;
    } else {
      message = 'Personal only';
    }
    icon = CheckCircle2;
  }

  const iconColors = {
    valid: 'text-green-500',
    invalid: 'text-red-500',
    warning: 'text-amber-500',
  };

  const Icon = icon;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className={cn('w-4 h-4', iconColors[status])} />
      <span
        className={cn(
          status === 'valid'
            ? 'text-green-700'
            : status === 'invalid'
              ? 'text-red-700'
              : 'text-amber-700',
        )}
      >
        {message}
      </span>
    </div>
  );
}
