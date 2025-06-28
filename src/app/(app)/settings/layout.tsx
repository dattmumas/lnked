import { redirect } from 'next/navigation';
import React from 'react';

import SettingsSidebar from '@/app/(app)/settings/SettingsSidebar';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Fetch user's tenants for the sidebar
  const { data: userTenants } = await supabase
    .from('tenant_members')
    .select(
      `
      tenant:tenants(
        id,
        name,
        slug
      ),
      role
    `,
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const tenants =
    userTenants
      ?.map((tm) => {
        if (!tm.tenant) return null;
        return {
          id: tm.tenant.id,
          name: tm.tenant.name,
          slug: tm.tenant.slug,
          avatar_url: null,
          role: tm.role,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null) ?? [];

  return (
    <div className="flex min-h-screen">
      {/* Settings Sidebar */}
      <SettingsSidebar tenants={tenants} userId={user.id} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-4 md:p-6 max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
