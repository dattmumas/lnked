import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from 'next-themes';
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
      <body className="min-h-screen bg-background w-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="p-4 flex items-center justify-between border-b border-border/50 w-full">
            <div className="p-1">
              <Link href="/dashboard" className="font-bold text-xl">
                Lnked<span className="text-red-500">.</span>
              </Link>
            </div>
            <ModernNavbar initialUser={user} initialUsername={username} />
          </header>
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
