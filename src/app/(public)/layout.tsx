import Navbar from '@/components/Navbar';
import Footer from '@/components/ui/Footer';
import React from 'react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="bg-background border-b border-border py-4 px-4 md:px-6 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <span className="text-2xl md:text-3xl font-serif font-extrabold text-foreground tracking-tight flex items-center">
            Lnked
            <span className="ml-1 text-accent text-3xl md:text-4xl leading-none self-center" aria-hidden="true">
              .
            </span>
          </span>
          <Navbar />
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">{children}</main>
      <Footer />
    </>
  );
}
