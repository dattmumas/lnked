import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import LandingPageContent from '@/components/landing/LandingPageContent';
import LandingPageInteractive from '@/components/landing/LandingPageInteractive';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Enable ISR with 5-minute revalidation for static content
export const revalidate = 300;

export default async function LandingPage() {
  // Check if user is already logged in for smart redirect
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If user is logged in, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

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
