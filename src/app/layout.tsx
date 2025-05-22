import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import SmoothScroll from '@/components/app/SmoothScroll';
import RouteProgress from '@/components/app/nav/RouteProgress';
import Navbar from '@/components/Navbar';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Lnked - Collaborative Newsletters',
  description: 'Create, share, and subscribe to newsletters together.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch current user & profile on the server so we can pass it to the Navbar
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();
    username = profile?.username ?? null;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground font-sans antialiased min-h-screen flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SmoothScroll />
          <RouteProgress />

          {/* Accessible skip link */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-accent text-accent-foreground p-2 rounded z-50"
          >
            Skip to main content
          </a>

          {/* Global site header */}
          <header className="bg-background border-b border-border py-4 px-4 md:px-6 sticky top-0 z-50">
            <div className="container mx-auto flex items-center justify-between">
              <Link
                href="/dashboard"
                className="text-2xl md:text-3xl font-serif font-extrabold text-foreground tracking-tight flex items-center"
              >
                Lnked
                <span
                  className="ml-1 text-accent text-3xl md:text-4xl leading-none self-center"
                  aria-hidden="true"
                >
                  .
                </span>
              </Link>
              <Navbar initialUser={user} initialUsername={username} />
            </div>
          </header>

          {/* Main page area */}
          <main id="main-content" className="flex-1">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
