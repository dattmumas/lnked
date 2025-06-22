import clsx from 'clsx';
import { Source_Serif_4, Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import React from 'react';

import GlobalSidebar from '@/components/app/nav/GlobalSidebar';
import ModernNavbar from '@/components/ModernNavbar';
import { QueryProvider } from '@/components/providers/query-provider';
import { ToastContainer } from '@/components/ui/toast';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

import './globals.css';

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Lnked - Collaborative Newsletters',
  description: 'Create, share, and subscribe to newsletters together.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.ReactElement> {
  const supabase = createServerSupabaseClient();

  // Get authentication state
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Only proceed with profile fetch if user exists and no auth error
  let profile:
    | {
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
      }
    | undefined = undefined;

  if (user && !authError) {
    const { data: profileData } = await supabase
      .from('users')
      .select('username, full_name, avatar_url')
      .eq('id', user.id)
      .single();
    profile = profileData ?? undefined;
  }

  // Determine if we should show authenticated layout
  const isAuthenticated = Boolean(user && !authError);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`min-h-screen bg-background w-full ${sourceSerif.variable} ${inter.variable}`}
      >
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex h-screen flex-col">
              <header className="shrink-0 sticky top-0 z-50 bg-background backdrop-blur-md border-b border-border/50">
                <ModernNavbar
                  initialUser={user ?? undefined}
                  initialProfile={
                    profile
                      ? {
                          username: profile.username ?? undefined,
                          full_name: profile.full_name ?? undefined,
                          avatar_url: profile.avatar_url ?? undefined,
                        }
                      : undefined
                  }
                />
              </header>

              {/* Layout body */}
              <div className="flex flex-1 overflow-hidden">
                {isAuthenticated && <GlobalSidebar />}

                {/* Main content fills remaining space and no vertical scroll */}
                <main
                  className={clsx(
                    'flex-1 overflow-y-auto overflow-x-hidden',
                    isAuthenticated && 'ml-16 md:ml-16',
                  )}
                >
                  {children}
                </main>
              </div>
            </div>

            {/* Global toast notifications */}
            <ToastContainer />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
