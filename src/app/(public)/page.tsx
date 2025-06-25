import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import LandingPageContent from '@/components/landing/LandingPageContent';
import LandingPageInteractive from '@/components/landing/LandingPageInteractive';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Enable ISR with 5-minute revalidation for static content
export const revalidate = 300;

export default async function LandingPage(): Promise<React.JSX.Element> {
  const supabase = await createServerSupabaseClient();

  // Check if user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // If authenticated, redirect to dashboard
  if (authError === null && user !== null) {
    redirect('/dashboard');
  }

  // If not authenticated, show landing page
  return (
    <>
      {/* Server-rendered static content for SEO */}
      <LandingPageContent />

      {/* Client-side interactive animations */}
      <Suspense fallback={<div />}>
        <LandingPageInteractive />
      </Suspense>
    </>
  );
}
