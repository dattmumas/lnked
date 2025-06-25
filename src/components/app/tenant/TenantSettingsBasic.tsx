'use client';

import { Save, Settings, Bell, Users } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useToast } from '@/hooks/useToast';
import { useTenant } from '@/providers/TenantProvider';

import { TenantPermissions, PermissionGate } from './TenantPermissions';

interface TenantSettingsProps {
  tenantId?: string;
  className?: string;
}

export function TenantSettings({
  tenantId,
  className,
}: TenantSettingsProps): React.JSX.Element {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');

  const {
    settings,
    notificationSettings,
    isLoading,
    error,
    updateSettings,
    updateNotificationSettings,
  } = useTenantSettings(tenantId);

  // Local state for form data
  const [generalForm, setGeneralForm] = useState({
    name: settings?.name || '',
    description: settings?.description || '',
    is_public: settings?.is_public || false,
  });

  const [notificationForm, setNotificationForm] = useState({
    email_notifications: notificationSettings?.email_notifications ?? true,
    push_notifications: notificationSettings?.push_notifications ?? true,
    mention_notifications: notificationSettings?.mention_notifications ?? true,
    digest_frequency: notificationSettings?.digest_frequency || 'daily',
  });

  // Update form when data loads
  if (settings && generalForm.name !== settings.name) {
    setGeneralForm({
      name: settings.name,
      description: settings.description || '',
      is_public: settings.is_public,
    });
  }

  if (
    notificationSettings &&
    notificationForm.email_notifications !==
      notificationSettings.email_notifications
  ) {
    setNotificationForm({
      email_notifications: notificationSettings.email_notifications ?? true,
      push_notifications: notificationSettings.push_notifications ?? true,
      mention_notifications: notificationSettings.mention_notifications ?? true,
      digest_frequency: notificationSettings.digest_frequency,
    });
  }

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings(generalForm);
      toast('Settings updated successfully', { type: 'success' });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Failed to update settings',
        { type: 'error' },
      );
    }
  };

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateNotificationSettings(notificationForm);
      toast('Notification settings updated successfully', { type: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to update notification settings',
        { type: 'error' },
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load tenant settings</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No tenant selected</p>
      </div>
    );
  }

  const isPersonalTenant = settings.type === 'personal';

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tenant Settings</h1>
            <p className="text-muted-foreground">
              Manage settings for {settings.name}
              {isPersonalTenant && ' (Personal)'}
            </p>
          </div>
          <TenantPermissions tenantId={settings.id} showActions={false} />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              General
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Basic information and configuration for your{' '}
                  {isPersonalTenant ? 'personal space' : 'collective'}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PermissionGate
                  tenantId={settings.id}
                  requiredPermission="canManageSettings"
                >
                  <form onSubmit={handleGeneralSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={generalForm.name}
                          onChange={(e) =>
                            setGeneralForm({
                              ...generalForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="Enter tenant name"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          The display name for your{' '}
                          {isPersonalTenant ? 'personal space' : 'collective'}.
                        </p>
                      </div>

                      {!isPersonalTenant && (
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={generalForm.description}
                            onChange={(e) =>
                              setGeneralForm({
                                ...generalForm,
                                description: e.target.value,
                              })
                            }
                            placeholder="Describe your collective"
                            rows={3}
                          />
                          <p className="text-sm text-muted-foreground mt-1">
                            A brief description of what your collective is
                            about.
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <Label className="text-base">
                            Public {isPersonalTenant ? 'Profile' : 'Collective'}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Make your{' '}
                            {isPersonalTenant ? 'profile' : 'collective'}{' '}
                            visible to everyone.
                          </p>
                        </div>
                        <Switch
                          checked={generalForm.is_public}
                          onCheckedChange={(checked) =>
                            setGeneralForm({
                              ...generalForm,
                              is_public: checked,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit">
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </PermissionGate>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Control how and when you receive notifications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNotificationSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email.
                        </p>
                      </div>
                      <Switch
                        checked={notificationForm.email_notifications}
                        onCheckedChange={(checked) =>
                          setNotificationForm({
                            ...notificationForm,
                            email_notifications: checked === true,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive push notifications in your browser.
                        </p>
                      </div>
                      <Switch
                        checked={notificationForm.push_notifications}
                        onCheckedChange={(checked) =>
                          setNotificationForm({
                            ...notificationForm,
                            push_notifications: checked === true,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">
                          Mention Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when someone mentions you.
                        </p>
                      </div>
                      <Switch
                        checked={notificationForm.mention_notifications}
                        onCheckedChange={(checked) =>
                          setNotificationForm({
                            ...notificationForm,
                            mention_notifications: checked === true,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Member Management</CardTitle>
                <CardDescription>
                  Manage members and their permissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Member management interface would be integrated here.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
