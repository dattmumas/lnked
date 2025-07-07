import {
  Zap,
  MessageSquare,
  Mail,
  Calendar,
  Video,
  FileText,
  Globe,
  Share2,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function TenantIntegrationsPage({
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
  const canManageIntegrations = userRole === 'owner' || userRole === 'admin';

  if (!canManageIntegrations) {
    notFound();
  }

  const integrations = [
    {
      id: 'slack',
      name: 'Slack',
      description: 'Post updates to Slack channels',
      icon: MessageSquare,
      status: 'connected',
      category: 'Communication',
    },
    {
      id: 'discord',
      name: 'Discord',
      description: 'Share content with Discord communities',
      icon: MessageSquare,
      status: 'available',
      category: 'Communication',
    },
    {
      id: 'mailchimp',
      name: 'Mailchimp',
      description: 'Sync subscribers with email lists',
      icon: Mail,
      status: 'available',
      category: 'Email Marketing',
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Schedule and manage events',
      icon: Calendar,
      status: 'available',
      category: 'Productivity',
    },
    {
      id: 'zoom',
      name: 'Zoom',
      description: 'Host live video sessions',
      icon: Video,
      status: 'connected',
      category: 'Video',
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Export content to Notion workspace',
      icon: FileText,
      status: 'available',
      category: 'Productivity',
    },
    {
      id: 'wordpress',
      name: 'WordPress',
      description: 'Cross-post to WordPress sites',
      icon: Globe,
      status: 'available',
      category: 'Publishing',
    },
    {
      id: 'twitter',
      name: 'Twitter/X',
      description: 'Auto-share posts to Twitter',
      icon: Share2,
      status: 'connected',
      category: 'Social Media',
    },
  ];

  const groupedIntegrations = integrations.reduce(
    (acc, integration) => {
      if (!acc[integration.category]) {
        acc[integration.category] = [];
      }
      acc[integration.category]?.push(integration);
      return acc;
    },
    {} as Record<string, typeof integrations>,
  );

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Integrations</h1>
        <p className="text-muted-foreground">
          Connect {tenant.name} with your favorite tools and services.
        </p>
      </header>

      <div className="space-y-8">
        {/* Connected Integrations */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Connected</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {integrations
              .filter((i) => i.status === 'connected')
              .map((integration) => (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <integration.icon className="h-8 w-8" />
                        <div>
                          <CardTitle className="text-base">
                            {integration.name}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {integration.description}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="default">Connected</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch defaultChecked />
                        <span className="text-sm">Enabled</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* Available Integrations by Category */}
        {Object.entries(groupedIntegrations).map(([category, items]) => {
          const availableItems = items.filter((i) => i.status === 'available');
          if (availableItems.length === 0) return null;

          return (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-4">{category}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {availableItems.map((integration) => (
                  <Card key={integration.id}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <integration.icon className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-base">
                            {integration.name}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {integration.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full">
                        <Zap className="h-4 w-4 mr-2" />
                        Connect
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {/* Webhooks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>
                  Send real-time updates to your applications
                </CardDescription>
              </div>
              <Button>Add Webhook</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">Production API</p>
                  <p className="text-sm text-muted-foreground">
                    https://api.example.com/webhooks/lnked
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Active</Badge>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Access */}
        <Card>
          <CardHeader>
            <CardTitle>API Access</CardTitle>
            <CardDescription>
              Programmatic access to your collective's data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">API Key</p>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded text-sm">
                    sk_live_••••••••••••••••••••••••
                  </code>
                  <Button variant="outline" size="sm">
                    Copy
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="font-medium">Rate Limit</p>
                  <p className="text-sm text-muted-foreground">
                    1,000 requests per hour
                  </p>
                </div>
                <Button variant="outline">View Docs</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
