import { notFound } from 'next/navigation';

import { TenantSettings } from '@/components/app/tenant/TenantSettingsBasic';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function TenantSettingsPage({
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

  const userRole = tenant.tenant_members[0]?.role;

  // Only owners and admins can access tenant settings
  if (userRole !== 'owner' && userRole !== 'admin') {
    notFound();
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{tenant.name} Settings</h1>
        <p className="text-muted-foreground">
          Manage your tenant settings and preferences.
        </p>
      </header>

      <TenantSettings tenantId={tenant.id} />
    </div>
  );
}
