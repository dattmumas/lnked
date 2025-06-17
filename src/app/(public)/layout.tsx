import React from 'react';

import Footer from '@/components/ui/Footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        {children}
      </main>
      <Footer />
    </>
  );
}
