import React from 'react';

// This layout will serve as the root for the new collective profile design.
// It ensures that the styles and structure we define here do not leak into
// other parts of the application.

export default function CollectiveProfileLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="bg-background text-foreground">
      {/* The new design will be built within this container */}
      {children}
    </div>
  );
}
