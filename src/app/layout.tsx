import { Source_Serif_4, Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import React from 'react';

import QueryProvider from '@/components/providers/query-provider';
import { ToastContainer } from '@/components/ui/toast';
import { TenantProvider } from '@/providers/TenantProvider';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`min-h-screen bg-background w-full ${sourceSerif.variable} ${inter.variable}`}
      >
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
            <TenantProvider>
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
