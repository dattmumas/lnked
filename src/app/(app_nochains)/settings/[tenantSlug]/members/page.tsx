import { UserPlus } from 'lucide-react';
import { notFound } from 'next/navigation';

import { TenantMembers } from '@/components/app/tenant/TenantMembers';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function TenantMembersPage({
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

  const userRole = tenant.tenant_members[0]?.role || 'member';
  const canManageMembers = userRole === 'owner' || userRole === 'admin';

  if (!canManageMembers) {
    notFound(); // Only admins and owners can access this page
  }

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Team Members</h1>
            <p className="text-muted-foreground">
              Manage members and their roles in {tenant.name}.
            </p>
          </div>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Current Members</CardTitle>
          <CardDescription>
            View and manage team members and their permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TenantMembers tenantId={tenant.id} showInvite />
        </CardContent>
      </Card>
    </>
  );
}
