import { Download, Database, AlertTriangle } from 'lucide-react';
import { redirect } from 'next/navigation';

import DeleteAccountSection from '@/components/app/settings/DeleteAccountSection';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function AdvancedSettingsPage() {
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
        <h1 className="text-3xl font-bold mb-2">Advanced Settings</h1>
        <p className="text-muted-foreground">
          Manage data exports and other advanced account options.
        </p>
      </header>

      <div className="space-y-6">
        {/* Data Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              <CardTitle>Export Your Data</CardTitle>
            </div>
            <CardDescription>
              Download a copy of all your data including posts, and profile
              information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You can request a complete export of your data. This includes:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Profile information</li>
                <li>Posts and drafts</li>
                <li>Reactions</li>
                <li>Followers and following lists</li>
                <li>Settings and preferences</li>
              </ul>
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Request Data Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Data Management</CardTitle>
            </div>
            <CardDescription>
              Manage how your data is stored and processed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Clear Cache</h4>
                  <p className="text-sm text-muted-foreground">
                    Clear locally cached data
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Clear
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Reset Preferences</h4>
                  <p className="text-sm text-muted-foreground">
                    Reset all settings to defaults
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </div>
            <CardDescription>
              Irreversible actions that permanently affect your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountSection userEmail={user.email ?? ''} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
