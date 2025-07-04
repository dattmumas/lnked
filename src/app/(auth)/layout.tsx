import React from 'react';


export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container mx-auto flex items-center justify-center px-4 md:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
