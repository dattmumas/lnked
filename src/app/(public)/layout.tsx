import React from 'react';

import Footer from '@/components/ui/Footer';
import PublicNavBar from '@/components/ui/PublicNavBar';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavBar />

      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        {children}
      </main>

      {/* Footer sticks to the bottom when content is short */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
