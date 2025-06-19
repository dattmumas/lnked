import type { Metadata } from 'next';

import './globals.css';
import { ThemeProvider } from 'next-themes';

import ModernNavbar from '@/components/ModernNavbar';
import GlobalSidebar from '@/components/app/nav/GlobalSidebar';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ContrastEnhancer } from '@/components/ContrastEnhancer';

import { Source_Serif_4, Inter } from 'next/font/google';

import { QueryProvider } from '@/components/providers/query-provider';
import { ToastContainer } from '@/components/ui/toast';

import clsx from 'clsx';

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
}>) {
  const supabase = createServerSupabaseClient();

  // Get authentication state
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Only proceed with profile fetch if user exists and no auth error
  let profile: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null = null;

  if (user && !authError) {
    const { data: profileData } = await supabase
      .from('users')
      .select('username, full_name, avatar_url')
      .eq('id', user.id)
      .single();
    profile = profileData;
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
            <ContrastEnhancer />
            <div className="flex h-screen flex-col">
              <header className="shrink-0 sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
                <ModernNavbar initialUser={user} initialProfile={profile} />
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
