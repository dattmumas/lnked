import Link from 'next/link';
import { redirect } from 'next/navigation';
import React from 'react';

import { acceptCollectiveInvite } from '@/app/actions/memberActions';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}): Promise<React.ReactElement> {
  const supabase = createServerSupabaseClient();
  const { inviteCode } = await params;
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Redirect to sign-in, then back to this page
    redirect(`/sign-in?next=/invite/${inviteCode}`);
  }

  const result = await acceptCollectiveInvite({
    inviteCode,
  });

  return (
    <div className="container mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Collective Invite</h1>
      {result.success ? (
        <div className="text-success bg-success/10 p-4 rounded mb-4">
          <p>Invite accepted! You are now a member of the collective.</p>
        </div>
      ) : (
        <div className="text-destructive bg-destructive/10 p-4 rounded mb-4">
          <p>
            {(result.error ?? '').length > 0
              ? result.error
              : 'Failed to accept invite.'}
          </p>
        </div>
      )}
      <Link href="/dashboard" className="text-accent underline">
        Go to Dashboard
      </Link>
    </div>
  );
}
