import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import ModernNavbar from '@/components/ModernNavbar';
import GlobalSidebar from '@/components/app/nav/GlobalSidebar';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ContrastEnhancer } from '@/components/ContrastEnhancer';
import { Source_Serif_4 } from 'next/font/google';
import { QueryProvider } from '@/components/providers/query-provider';

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-playfair',
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
  const supabase = await createServerSupabaseClient();

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
        className={`min-h-screen bg-background w-full ${sourceSerif.variable}`}
      >
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ContrastEnhancer />
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
              <ModernNavbar initialUser={user} initialProfile={profile} />
            </header>

            {/* Only render GlobalSidebar after successful authentication */}
            {isAuthenticated && <GlobalSidebar />}

            {/* Adjust main content margin based on authentication state */}
            <main className={isAuthenticated ? 'ml-16' : ''}>{children}</main>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
