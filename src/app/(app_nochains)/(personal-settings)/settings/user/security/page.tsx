import { Shield, Key, Smartphone, History } from 'lucide-react';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function SecuritySettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Security Settings</h1>
        <p className="text-muted-foreground">
          Manage your account security and authentication methods.
        </p>
      </header>

      <div className="space-y-6">
        {/* Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <CardTitle>Password</CardTitle>
            </div>
            <CardDescription>
              Change your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">Change Password</Button>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              <CardTitle>Two-Factor Authentication</CardTitle>
            </div>
            <CardDescription>
              Add an extra layer of security to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Two-factor authentication is not enabled
              </p>
              <Button variant="outline">Enable 2FA</Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <CardTitle>Active Sessions</CardTitle>
            </div>
            <CardDescription>
              Manage your active sessions and sign out from other devices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Current Session</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <span className="text-sm text-green-600">Active</span>
              </div>
              <Button variant="outline" className="w-full">
                Sign Out All Other Sessions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Log */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Security Log</CardTitle>
            </div>
            <CardDescription>
              View recent security-related activities on your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon - View login attempts, password changes, and other
              security events.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
