import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import SmoothScroll from '@/components/app/SmoothScroll';
import RouteProgress from '@/components/app/nav/RouteProgress';
import ModernNavbar from '@/components/ModernNavbar';
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
          <header className="header-gradient paper-texture backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/50 sticky top-0 z-50 shadow-sm">
            <div className="container mx-auto h-16 px-4 md:px-6">
              <div className="flex items-center justify-between h-full">
                {/* Brand logo - Newspaper masthead style */}
                <Link
                  href="/dashboard"
                  className="group flex items-center gap-1 hover:opacity-80 transition-all duration-200 modern-button relative"
                >
                  <div className="relative">
                    {/* Top decorative line */}
                    <div className="absolute -top-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

                    {/* Main logo text */}
                    <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground tracking-tight relative">
                      <span className="relative">
                        Lnked
                        <span className="text-red-600 dark:text-red-500 text-3xl md:text-4xl leading-none">
                          .
                        </span>
                      </span>
                    </h1>

                    {/* Bottom decorative line */}
                    <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
                  </div>
                </Link>

                {/* Navigation */}
                <ModernNavbar initialUser={user} initialUsername={username} />
              </div>
            </div>
          </header>

          {/* Main page area with proper spacing for fixed header */}
          <main id="main-content" className="flex-1 pt-0">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
