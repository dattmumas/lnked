'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, Save, Settings, Bell, Shield, Users } from 'lucide-react';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useToast } from '@/hooks/useToast';
import { useTenantActions } from '@/providers/TenantProvider';

import {
  TenantPermissionsDisplay as TenantPermissions,
  PermissionGate,
} from './TenantPermissions';

import type { TenantSettingsFormData } from '@/types/tenant.types';

// Constants for magic numbers
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

// Form schemas
const generalSettingsSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(MAX_NAME_LENGTH, 'Name must be less than 100 characters'),
  description: z
    .string()
    .max(MAX_DESCRIPTION_LENGTH, 'Description must be less than 500 characters')
    .optional(),
  is_public: z.boolean(),
});

const notificationSettingsSchema = z.object({
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
  mention_notifications: z.boolean(),
  new_member_notifications: z.boolean(),
  channel_activity_notifications: z.boolean(),
  digest_frequency: z.enum(['never', 'daily', 'weekly']),
});

const privacySettingsSchema = z.object({
  is_public: z.boolean(),
  allow_discovery: z.boolean(),
  require_approval: z.boolean(),
  member_visibility: z.enum(['public', 'members_only', 'admins_only']),
  content_visibility: z.enum(['public', 'members_only']),
});

type GeneralSettingsForm = z.infer<typeof generalSettingsSchema>;
type NotificationSettingsForm = z.infer<typeof notificationSettingsSchema>;
type PrivacySettingsForm = z.infer<typeof privacySettingsSchema>;

interface TenantSettingsProps {
  tenantId?: string;
  className?: string;
}

export function TenantSettings({
  tenantId,
  className,
}: TenantSettingsProps): React.JSX.Element {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');

  const {
    settings,
    notificationSettings,
    privacySettings,
    isLoading,
    error,
    updateSettings,
    updateNotificationSettings,
    updatePrivacySettings,
    deleteTenant,
  } = useTenantSettings(tenantId);

  const isPersonalTenant = settings?.type === 'personal';

  // General settings form
  const generalForm = useForm<GeneralSettingsForm>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      name: settings?.name || '',
      description: settings?.description || '',
      is_public: settings?.is_public || false,
    },
  });

  // Notification settings form
  const notificationForm = useForm<NotificationSettingsForm>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      email_notifications: notificationSettings?.email_notifications || true,
      push_notifications: notificationSettings?.push_notifications || true,
      mention_notifications:
        notificationSettings?.mention_notifications || true,
      new_member_notifications:
        notificationSettings?.new_member_notifications || true,
      channel_activity_notifications:
        notificationSettings?.channel_activity_notifications || false,
      digest_frequency: notificationSettings?.digest_frequency || 'daily',
    },
  });

  // Privacy settings form
  const privacyForm = useForm<PrivacySettingsForm>({
    resolver: zodResolver(privacySettingsSchema),
    defaultValues: {
      is_public: privacySettings?.is_public || true,
      allow_discovery: privacySettings?.allow_discovery || true,
      require_approval: privacySettings?.require_approval || false,
      member_visibility: privacySettings?.member_visibility || 'public',
      content_visibility: privacySettings?.content_visibility || 'public',
    },
  });

  // Update form values when data loads
  if (
    settings !== null &&
    settings !== undefined &&
    !generalForm.formState.isDirty
  ) {
    generalForm.reset({
      name:
        settings.name !== null && settings.name !== undefined
          ? settings.name
          : '',
      description:
        settings.description !== null && settings.description !== undefined
          ? settings.description
          : '',
      is_public:
        settings.is_public !== null && settings.is_public !== undefined
          ? settings.is_public
          : false,
    });
  }

  if (
    notificationSettings !== null &&
    notificationSettings !== undefined &&
    !notificationForm.formState.isDirty
  ) {
    notificationForm.reset(notificationSettings);
  }

  if (
    privacySettings !== null &&
    privacySettings !== undefined &&
    !privacyForm.formState.isDirty
  ) {
    privacyForm.reset(privacySettings);
  }

  const handleGeneralSubmit = async (data: GeneralSettingsForm) => {
    try {
      const updateData: Partial<TenantSettingsFormData> = {
        name: data.name,
        is_public: data.is_public,
      };

      // Only include description if it has a value
      if (data.description && data.description.trim().length > 0) {
        updateData.description = data.description;
      }

      await updateSettings(updateData);
      toast('Settings updated successfully', { type: 'success' });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Failed to update settings',
        { type: 'error' },
      );
    }
  };

  const handleNotificationSubmit = async (data: NotificationSettingsForm) => {
    try {
      await updateNotificationSettings(data);
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

  const handlePrivacySubmit = async (data: PrivacySettingsForm) => {
    try {
      await updatePrivacySettings(data);
      toast('Privacy settings updated successfully', { type: 'success' });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to update privacy settings',
        { type: 'error' },
      );
    }
  };

  const handleDeleteTenant = async () => {
    try {
      await deleteTenant();
      toast('Tenant deleted successfully', { type: 'success' });
      // Navigate away or close modal
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Failed to delete tenant',
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
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Privacy
            </TabsTrigger>
            {!isPersonalTenant && (
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members
              </TabsTrigger>
            )}
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
                  <Form {...generalForm}>
                    <form
                      onSubmit={generalForm.handleSubmit(handleGeneralSubmit)}
                      className="space-y-6"
                    >
                      <FormField
                        control={generalForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter tenant name"
                              />
                            </FormControl>
                            <FormDescription>
                              The display name for your{' '}
                              {isPersonalTenant
                                ? 'personal space'
                                : 'collective'}
                              .
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {!isPersonalTenant && (
                        <FormField
                          control={generalForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Describe your collective"
                                  rows={3}
                                />
                              </FormControl>
                              <FormDescription>
                                A brief description of what your collective is
                                about.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={generalForm.control}
                        name="is_public"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Public{' '}
                                {isPersonalTenant ? 'Profile' : 'Collective'}
                              </FormLabel>
                              <FormDescription>
                                Make your{' '}
                                {isPersonalTenant ? 'profile' : 'collective'}{' '}
                                visible to everyone.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={!generalForm.formState.isDirty}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </Form>
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
                <PermissionGate
                  tenantId={settings.id}
                  requiredPermission="canManageSettings"
                >
                  <Form {...notificationForm}>
                    <form
                      onSubmit={notificationForm.handleSubmit(
                        handleNotificationSubmit,
                      )}
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <FormField
                          control={notificationForm.control}
                          name="email_notifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Email Notifications
                                </FormLabel>
                                <FormDescription>
                                  Receive notifications via email.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="push_notifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Push Notifications
                                </FormLabel>
                                <FormDescription>
                                  Receive push notifications in your browser.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationForm.control}
                          name="mention_notifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Mention Notifications
                                </FormLabel>
                                <FormDescription>
                                  Get notified when someone mentions you.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {!isPersonalTenant && (
                          <>
                            <FormField
                              control={notificationForm.control}
                              name="new_member_notifications"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                      New Member Notifications
                                    </FormLabel>
                                    <FormDescription>
                                      Get notified when new members join.
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={notificationForm.control}
                              name="channel_activity_notifications"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                      Channel Activity
                                    </FormLabel>
                                    <FormDescription>
                                      Get notified about activity in channels.
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        <FormField
                          control={notificationForm.control}
                          name="digest_frequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Digest Frequency</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select frequency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="never">Never</SelectItem>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                How often you want to receive email digests.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={!notificationForm.formState.isDirty}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </Form>
                </PermissionGate>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Control who can see and access your{' '}
                  {isPersonalTenant ? 'profile' : 'collective'}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PermissionGate
                  tenantId={settings.id}
                  requiredPermission="canManageSettings"
                >
                  <Form {...privacyForm}>
                    <form
                      onSubmit={privacyForm.handleSubmit(handlePrivacySubmit)}
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <FormField
                          control={privacyForm.control}
                          name="is_public"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Public{' '}
                                  {isPersonalTenant ? 'Profile' : 'Collective'}
                                </FormLabel>
                                <FormDescription>
                                  Anyone can view your{' '}
                                  {isPersonalTenant ? 'profile' : 'collective'}.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {!isPersonalTenant && (
                          <>
                            <FormField
                              control={privacyForm.control}
                              name="allow_discovery"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                      Allow Discovery
                                    </FormLabel>
                                    <FormDescription>
                                      Show this collective in search results and
                                      recommendations.
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={privacyForm.control}
                              name="require_approval"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                      Require Approval
                                    </FormLabel>
                                    <FormDescription>
                                      New members must be approved before
                                      joining.
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={privacyForm.control}
                              name="member_visibility"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Member List Visibility</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select visibility" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="public">
                                        Public - Anyone can see members
                                      </SelectItem>
                                      <SelectItem value="members_only">
                                        Members Only - Only members can see the
                                        list
                                      </SelectItem>
                                      <SelectItem value="admins_only">
                                        Admins Only - Only admins can see
                                        members
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Who can view the member list.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={privacyForm.control}
                              name="content_visibility"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Content Visibility</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select visibility" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="public">
                                        Public - Anyone can view content
                                      </SelectItem>
                                      <SelectItem value="members_only">
                                        Members Only - Only members can view
                                        content
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Who can view posts and discussions.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={!privacyForm.formState.isDirty}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </Form>
                </PermissionGate>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          {!isPersonalTenant && (
            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle>Member Management</CardTitle>
                  <CardDescription>
                    Manage members and their permissions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* This would integrate with the existing TenantMembers component */}
                  <div className="text-center py-8 text-muted-foreground">
                    Member management interface would be integrated here.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Danger Zone */}
        {!isPersonalTenant && (
          <>
            <Separator />
            <PermissionGate
              tenantId={settings.id}
              requiredPermission="canDelete"
            >
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible actions that will permanently affect your
                    collective.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Collective
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. This will permanently
                          delete the collective "{settings.name}" and remove all
                          associated data including posts, conversations, and
                          member information.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                          onClick={() => void handleDeleteTenant()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Collective
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </PermissionGate>
          </>
        )}
      </div>
    </div>
  );
}
