import {
  Shield,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Archive,
  RefreshCw,
  Lock,
  Database,
} from 'lucide-react';
import { notFound } from 'next/navigation';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function TenantAdvancedPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}): Promise<React.ReactElement> {
  const { tenantSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Fetch tenant and check user's access
  const { data: tenant } = await supabase
    .from('tenants')
    .select(
      `
      *,
      tenant_members!inner(
        user_id,
        role
      )
    `,
    )
    .eq('slug', tenantSlug)
    .eq('tenant_members.user_id', user.id)
    .single();

  if (!tenant) {
    notFound();
  }

  const userRole = tenant.tenant_members?.[0]?.role;
  const isOwner = userRole === 'owner';

  if (!isOwner) {
    notFound();
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Advanced Settings</h1>
        <p className="text-muted-foreground">
          Manage advanced options and data for {tenant.name}.
        </p>
      </header>

      <div className="space-y-6">
        {/* Data Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              <CardTitle>Export Data</CardTitle>
            </div>
            <CardDescription>
              Download all your collective's data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Content Export</h4>
                <p className="text-sm text-muted-foreground">
                  Export all posts, comments, and media files
                </p>
                <Button variant="outline" className="w-full">
                  <Archive className="h-4 w-4 mr-2" />
                  Export Content
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Member Data</h4>
                <p className="text-sm text-muted-foreground">
                  Export member list and subscription data
                </p>
                <Button variant="outline" className="w-full">
                  <Database className="h-4 w-4 mr-2" />
                  Export Members
                </Button>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                Exports may take several minutes to prepare. You'll receive an
                email when your download is ready.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Data Import */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              <CardTitle>Import Data</CardTitle>
            </div>
            <CardDescription>
              Import content from other platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium mb-2">
                  Drop files here or click to upload
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports CSV, JSON, and ZIP archives
                </p>
                <Button className="mt-4">Select Files</Button>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Badge variant="secondary">Substack</Badge>
                <Badge variant="secondary">Medium</Badge>
                <Badge variant="secondary">Ghost</Badge>
                <Badge variant="secondary">WordPress</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>
              Advanced security and access controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Require 2FA for all admin actions
                  </p>
                </div>
              </div>
              <Button variant="outline">Configure</Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Session Management</p>
                  <p className="text-sm text-muted-foreground">
                    View and revoke active sessions
                  </p>
                </div>
              </div>
              <Button variant="outline">Manage</Button>
            </div>
          </CardContent>
        </Card>

        {/* Transfer Ownership */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <CardTitle>Transfer Ownership</CardTitle>
            </div>
            <CardDescription>
              Transfer this collective to another member
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This action cannot be undone. The new owner will have full
                control over the collective.
              </AlertDescription>
            </Alert>

            <Button variant="outline" className="w-full">
              Transfer Ownership
            </Button>
          </CardContent>
        </Card>

        {/* Delete Collective */}
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
            </div>
            <CardDescription>
              Permanently delete this collective
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <strong>Warning:</strong> Deleting your collective will
                permanently remove all content, members, and subscription data.
                This action cannot be undone.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <p className="text-sm">To confirm deletion, you'll need to:</p>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>Cancel all active subscriptions</li>
                <li>Export any data you want to keep</li>
                <li>Type the collective name to confirm</li>
              </ul>

              <Button variant="destructive" className="w-full">
                Delete Collective
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
