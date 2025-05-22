import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import EditUserSettingsForm from '@/components/app/settings/EditUserSettingsForm';
import DeleteAccountSection from '@/components/app/settings/DeleteAccountSection';
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Users2,
  Mail,
  Palette,
  Globe,
} from 'lucide-react';

export default async function UserSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/error');
  }

  // Fetch user profile data
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, full_name, username, bio, tags, avatar_url')
    .eq('id', authUser.id)
    .single();

  if (profileError || !userProfile) {
    console.error(
      `Error fetching user profile for settings:`,
      profileError?.message,
    );
    redirect('/error');
  }

  // Get subscription and follower counts for display
  const [{ count: subscriberCount }, { count: followerCount }] =
    await Promise.all([
      supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('target_entity_type', 'user')
        .eq('target_entity_id', authUser.id)
        .eq('status', 'active'),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', authUser.id)
        .eq('following_type', 'user'),
    ]);

  const defaultValues = {
    full_name: userProfile.full_name || '',
    username: userProfile.username || '',
    bio: userProfile.bio || '',
    tags_string: Array.isArray(userProfile.tags)
      ? userProfile.tags.join(', ')
      : '',
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, profile, and application preferences.
        </p>
      </header>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto p-1">
          <TabsTrigger value="profile" className="flex items-center gap-2 h-10">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2 h-10"
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2 h-10">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2 h-10">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger
            value="audience"
            className="flex items-center gap-2 h-10"
          >
            <Users2 className="h-4 w-4" />
            <span className="hidden sm:inline">Audience</span>
          </TabsTrigger>
          <TabsTrigger
            value="newsletter"
            className="flex items-center gap-2 h-10"
          >
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Newsletter</span>
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="flex items-center gap-2 h-10"
          >
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="flex items-center gap-2 h-10"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Advanced</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile details that are visible to other users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditUserSettingsForm defaultValues={defaultValues} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive and how.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates for important events
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Coming soon
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Push Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Get notified about new followers and interactions
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Coming soon
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Visibility</CardTitle>
              <CardDescription>
                Control who can see your content and how you appear to others.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Profile Visibility</h4>
                    <p className="text-sm text-muted-foreground">
                      Make your profile public or private
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Coming soon
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Search Engine Indexing</h4>
                    <p className="text-sm text-muted-foreground">
                      Allow search engines to index your profile
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Coming soon
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Payments</CardTitle>
              <CardDescription>
                Manage your subscription, payment methods, and billing history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Payment Methods</h4>
                    <p className="text-sm text-muted-foreground">
                      Add or update your payment information
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Coming soon
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Billing History</h4>
                    <p className="text-sm text-muted-foreground">
                      View your past invoices and payments
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Coming soon
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audience Overview</CardTitle>
              <CardDescription>
                View and manage your followers and subscribers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-4 rounded-lg border">
                  <div className="text-2xl font-bold">{followerCount || 0}</div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </div>
                <div className="text-center p-4 rounded-lg border">
                  <div className="text-2xl font-bold">
                    {subscriberCount || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Subscribers
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Manage Subscribers</h4>
                    <p className="text-sm text-muted-foreground">
                      View and manage your paid subscribers
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Coming soon
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="newsletter" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Newsletter Settings</CardTitle>
              <CardDescription>
                Configure your newsletter delivery and formatting preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Newsletter Format</h4>
                    <p className="text-sm text-muted-foreground">
                      Choose how your newsletter appears
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Coming soon
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Delivery Schedule</h4>
                    <p className="text-sm text-muted-foreground">
                      Set when newsletters are sent to subscribers
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Coming soon
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance & Theme</CardTitle>
              <CardDescription>
                Customize how the application looks and feels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Theme Preference</h4>
                    <p className="text-sm text-muted-foreground">
                      Choose between light, dark, or system theme
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Check navbar toggle
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Profile Theme</h4>
                    <p className="text-sm text-muted-foreground">
                      Customize your profile appearance
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Coming soon
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Dangerous actions and advanced configuration options.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-red-600">Data Export</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Download all your data
                  </p>
                  <div className="text-sm text-muted-foreground">
                    Coming soon
                  </div>
                </div>

                <div className="border-t pt-6">
                  <DeleteAccountSection userEmail={authUser.email ?? ''} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
