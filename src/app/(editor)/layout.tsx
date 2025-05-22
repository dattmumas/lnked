import Navbar from '@/components/Navbar';
import React from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <>
      <a
        href="#editor-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-accent text-accent-foreground p-2 rounded"
      >
        Skip to main content
      </a>
      <header className="bg-background border-b border-border py-4 px-4 md:px-6 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <span className="text-2xl md:text-3xl font-serif font-extrabold text-foreground tracking-tight flex items-center">
            Lnked
            <span
              className="ml-1 text-accent text-3xl md:text-4xl leading-none self-center"
              aria-hidden="true"
            >
              .
            </span>
          </span>
          <Navbar initialUser={user} initialUsername={username} />
        </div>
      </header>
      <main
        id="editor-main-content"
        className="flex-1 container mx-auto px-4 md:px-6 py-8"
      >
        {children}
      </main>
    </>
  );
}
