import { notFound } from 'next/navigation';
import React from 'react';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import { InvitePageClient } from './InvitePageClient';

import type { Database } from '@/lib/database.types';

// Concrete row types
type CollectiveRow = Database['public']['Tables']['collectives']['Row'];
type CollectiveInviteRow =
  Database['public']['Tables']['collective_invites']['Row'];

type CollectiveInvite = CollectiveInviteRow & {
  collective: CollectiveRow;
  inviter:
    | {
        full_name: string | null;
        avatar_url: string | null;
      }
    | { [key: string]: unknown }
    | null;
};

type Collective = CollectiveRow;

interface InvitePageProps {
  params: Promise<{
    inviteCode: string;
  }>;
}

// Fetch invite details with collective and inviter info
async function getInviteDetails(inviteCode: string): Promise<{
  invite: CollectiveInvite;
  collective: Collective;
  inviter: { fullName: string | null; avatarUrl: string | null };
} | null> {
  const supabase = await createServerSupabaseClient();
  const { data: invite, error } = await supabase
    .from('collective_invites')
    .select(
      `
      *,
      collective:collectives(*),
      inviter:users!invited_by_user_id(full_name, avatar_url)
    `,
    )
    .eq('invite_code', inviteCode)
    .maybeSingle();

  if (error || !invite || !invite.collective) {
    if (error) console.error('Error fetching invite:', error);
    return null;
  }

  // Handle cases where inviter might be null
  const inviter =
    invite.inviter && 'full_name' in invite.inviter
      ? {
          fullName: invite.inviter.full_name,
          avatarUrl:
            'avatar_url' in invite.inviter ? invite.inviter.avatar_url : null,
        }
      : { fullName: 'A collective owner', avatarUrl: null };

  return {
    invite,
    collective: invite.collective as Collective,
    inviter,
  };
}

export default async function InvitePage({
  params,
}: InvitePageProps): Promise<React.ReactElement> {
  const { inviteCode } = await params;
  const inviteDetails = await getInviteDetails(inviteCode);

  if (!inviteDetails) {
    return notFound();
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <InvitePageClient
      inviteDetails={inviteDetails}
      {...(user ? { currentUser: user } : {})}
    />
  );
}
