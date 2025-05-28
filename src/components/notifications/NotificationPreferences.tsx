'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, Smartphone, Monitor, Save, Loader2 } from 'lucide-react';
import { clientNotificationService } from '@/lib/notifications/client-service';
import { updateNotificationPreferences } from '@/app/actions/notificationActions';
import type {
  NotificationPreferences,
  NotificationType,
  NotificationPreferencesUpdate,
} from '@/types/notifications';
import { NOTIFICATION_CONFIGS } from '@/types/notifications';

interface NotificationPreferencesProps {
  className?: string;
}

interface PreferenceState {
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
}

export function NotificationPreferences({
  className,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<
    Record<NotificationType, PreferenceState>
  >({} as Record<NotificationType, PreferenceState>);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await clientNotificationService.getPreferences();
        const prefsMap: Record<NotificationType, PreferenceState> =
          {} as Record<NotificationType, PreferenceState>;

        // Initialize all notification types with defaults
        Object.keys(NOTIFICATION_CONFIGS).forEach((type) => {
          const notificationType = type as NotificationType;
          const existingPref = prefs.find(
            (p) => p.notification_type === notificationType,
          );

          prefsMap[notificationType] = {
            email_enabled: existingPref?.email_enabled ?? true,
            push_enabled: existingPref?.push_enabled ?? true,
            in_app_enabled: existingPref?.in_app_enabled ?? true,
          };
        });

        setPreferences(prefsMap);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load preferences',
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const handlePreferenceChange = (
    type: NotificationType,
    channel: keyof PreferenceState,
    enabled: boolean,
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: enabled,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const updates: NotificationPreferencesUpdate[] = Object.entries(
        preferences,
      ).map(([type, prefs]) => ({
        notification_type: type as NotificationType,
        email_enabled: prefs.email_enabled,
        push_enabled: prefs.push_enabled,
        in_app_enabled: prefs.in_app_enabled,
      }));

      const result = await updateNotificationPreferences(updates);
      if (result.success) {
        setHasChanges(false);
      } else {
        setError(result.error || 'Failed to save preferences');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save preferences',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getNotificationTypeLabel = (type: NotificationType): string => {
    const labels: Record<NotificationType, string> = {
      follow: 'New Followers',
      unfollow: 'Unfollows',
      post_like: 'Post Likes',
      post_comment: 'Post Comments',
      comment_reply: 'Comment Replies',
      comment_like: 'Comment Likes',
      post_published: 'Post Published',
      collective_invite: 'Collective Invites',
      collective_join: 'Collective Joins',
      collective_leave: 'Collective Leaves',
      subscription_created: 'New Subscriptions',
      subscription_cancelled: 'Cancelled Subscriptions',
      mention: 'Mentions',
      post_bookmark: 'Post Bookmarks',
      featured_post: 'Featured Posts',
    };
    return labels[type] || type;
  };

  const getNotificationTypeDescription = (type: NotificationType): string => {
    const descriptions: Record<NotificationType, string> = {
      follow: 'When someone starts following you',
      unfollow: 'When someone unfollows you',
      post_like: 'When someone likes your posts',
      post_comment: 'When someone comments on your posts',
      comment_reply: 'When someone replies to your comments',
      comment_like: 'When someone likes your comments',
      post_published: 'When you publish a new post',
      collective_invite: 'When you receive collective invitations',
      collective_join: 'When someone joins your collective',
      collective_leave: 'When someone leaves your collective',
      subscription_created: 'When someone subscribes to you',
      subscription_cancelled: 'When someone cancels their subscription',
      mention: 'When someone mentions you',
      post_bookmark: 'When someone bookmarks your posts',
      featured_post: 'When your post is featured',
    };
    return descriptions[type] || '';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose what notifications you want to receive and how.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border rounded-lg animate-pulse"
              >
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-48" />
                </div>
                <div className="flex gap-4">
                  <div className="h-6 w-12 bg-muted rounded" />
                  <div className="h-6 w-12 bg-muted rounded" />
                  <div className="h-6 w-12 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose what notifications you want to receive and how.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        {/* Channel Headers */}
        <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground">
          <div>Notification Type</div>
          <div className="flex items-center gap-1 justify-center">
            <Monitor className="h-4 w-4" />
            In-App
          </div>
          <div className="flex items-center gap-1 justify-center">
            <Mail className="h-4 w-4" />
            Email
          </div>
          <div className="flex items-center gap-1 justify-center">
            <Smartphone className="h-4 w-4" />
            Push
          </div>
        </div>

        <Separator />

        {/* Notification Preferences */}
        <div className="space-y-4">
          {Object.entries(NOTIFICATION_CONFIGS).map(([type, config]) => {
            const notificationType = type as NotificationType;
            const prefs = preferences[notificationType];

            if (!prefs) return null;

            return (
              <div
                key={type}
                className="grid grid-cols-4 gap-4 items-center p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <Label className="font-medium">
                      {getNotificationTypeLabel(notificationType)}
                    </Label>
                    {config.priority === 'high' && (
                      <Badge variant="destructive" className="text-xs">
                        Important
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getNotificationTypeDescription(notificationType)}
                  </p>
                </div>

                <div className="flex justify-center">
                  <Switch
                    checked={prefs.in_app_enabled}
                    onCheckedChange={(checked: boolean) =>
                      handlePreferenceChange(
                        notificationType,
                        'in_app_enabled',
                        checked,
                      )
                    }
                  />
                </div>

                <div className="flex justify-center">
                  <Switch
                    checked={prefs.email_enabled}
                    onCheckedChange={(checked: boolean) =>
                      handlePreferenceChange(
                        notificationType,
                        'email_enabled',
                        checked,
                      )
                    }
                  />
                </div>

                <div className="flex justify-center">
                  <Switch
                    checked={prefs.push_enabled}
                    onCheckedChange={(checked: boolean) =>
                      handlePreferenceChange(
                        notificationType,
                        'push_enabled',
                        checked,
                      )
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
