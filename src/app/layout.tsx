import type { Metadata } from 'next';
import './globals.css';
import './contrast-overrides.css';
import { ThemeProvider } from 'next-themes';
import ModernNavbar from '@/components/ModernNavbar';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ContrastEnhancer } from '@/components/ContrastEnhancer';
import { Source_Serif_4 } from 'next/font/google';

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
      <body
        className={`min-h-screen bg-background w-full ${sourceSerif.variable}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ContrastEnhancer />
          <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
            <ModernNavbar initialUser={user} initialUsername={username} />
          </header>
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
