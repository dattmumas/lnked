import { ThemeProvider } from 'next-themes';
import React from 'react';

import QueryProvider from '@/components/providers/query-provider';
import { ToastContainer } from '@/components/ui/toast';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { TenantProvider } from '@/providers/TenantProvider';

import type { Database } from '@/lib/database.types';
import type { Metadata } from 'next';

import './globals.css';

// Helper transforms RPC get_user_tenants row into TenantType (duplicated from provider)
type TenantType = Database['public']['Tables']['tenants']['Row'];
type TenantRpcRow =
  Database['public']['Functions']['get_user_tenants']['Returns'][number];

export const metadata: Metadata = {
  title: 'Newpaper',
  description: 'Open Source News',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();

  // Try to identify authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialTenants: TenantType[] | undefined;
  let initialTenantId: string | undefined;

  if (user) {
    // Fetch user tenants via RPC
    const { data: tenants } = await supabase.rpc('get_user_tenants');

    if (Array.isArray(tenants) && tenants.length > 0) {
      initialTenants = tenants.map((t) => {
        const extras = t as Record<string, unknown>;

        return {
          id: t.tenant_id,
          name: t.tenant_name,
          slug: t.tenant_slug,
          type: t.tenant_type,
          description: (extras['description'] as string | null) ?? null,
          is_public: t.is_public,
          member_count: t.member_count ?? 0,
          created_at: (extras['created_at'] as string | null) ?? null,
          updated_at: (extras['updated_at'] as string | null) ?? null,
        } satisfies TenantType;
      });

      const personal = initialTenants.find((tt) => tt.type === 'personal');
      if (personal) initialTenantId = personal.id;
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/* Adobe Fonts Kit */}
        <link rel="stylesheet" href="https://use.typekit.net/znz3akr.css" />
      </head>
      <body className="min-h-screen bg-background font-sans">
        <a
          href="#main-content"
          className="absolute z-[9999] block -translate-y-full rounded-b-lg border border-t-0 border-border bg-background p-3 text-sm font-medium transition-transform focus:translate-y-0"
        >
          Skip to main content
        </a>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TenantProvider
              {...(initialTenantId ? { initialTenantId } : {})}
              {...(initialTenants ? { initialTenants } : {})}
            >
              {/* Main application content (route-group layouts add chrome) */}
              <main id="main-content" className="min-h-screen">
                {children}
              </main>

              {/* Global toast notifications */}
              <ToastContainer />
            </TenantProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
