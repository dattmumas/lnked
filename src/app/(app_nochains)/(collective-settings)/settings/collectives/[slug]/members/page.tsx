import { Suspense } from 'react';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import { ManageMembersClientUI } from './ManageMembersClientUI';

import type { Database } from '@/lib/database.types';

type CollectiveMemberRole =
  Database['public']['Enums']['collective_member_role'];

type Invite = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

function isCollectiveMemberRole(role: string): role is CollectiveMemberRole {
  return ['owner', 'admin', 'editor', 'author'].includes(role);
}

// Placeholder for a loading skeleton
function MembersLoadingSkeleton() {
  return <div>Loading members...</div>;
}

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  return (
    <div>
      <h1>Manage Members</h1>
      <Suspense fallback={<MembersLoadingSkeleton />}>
        <MembersData params={resolvedParams} />
      </Suspense>
    </div>
  );
}

async function MembersData({ params }: { params: { slug: string } }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>You must be logged in to view members.</div>;
  }

  const { data: collective } = await supabase
    .from('collectives')
    .select('id, owner_id')
    .eq('slug', params.slug)
    .single();

  if (!collective) {
    return <div>Collective not found.</div>;
  }

  const { data: currentUserMembership } = await supabase
    .from('collective_members')
    .select('role')
    .eq('collective_id', collective.id)
    .eq('member_id', user.id)
    .single();

  const isOwnerOrAdmin =
    currentUserMembership?.role === 'owner' ||
    currentUserMembership?.role === 'admin';

  const { data: members, error: membersError } = await supabase
    .from('collective_members')
    .select('id, role, member:users(id, full_name, username, avatar_url)')
    .eq('collective_id', collective.id);

  let invites: Invite[] = [];
  let invitesError = null;

  if (isOwnerOrAdmin) {
    try {
      const { data: fetchedInvites, error: fetchedInvitesError } =
        await supabase
          .from('collective_invites')
          .select('id, email, role, created_at')
          .eq('collective_id', collective.id)
          .eq('status', 'pending');

      if (fetchedInvitesError) {
        // Handle RLS permission errors gracefully
        if (fetchedInvitesError.code === '42501') {
          console.warn(
            'RLS permission issue with collective_invites, continuing without invites data',
          );
          invites = [];
        } else {
          throw fetchedInvitesError;
        }
      } else {
        invites = fetchedInvites || [];
      }
    } catch (error) {
      console.error('Error loading invites:', error);
      invitesError = error;
    }
  }

  if (membersError) {
    console.error('Error loading members:', membersError);
    return <div>Error loading members data.</div>;
  }

  // Don't fail the entire page if invites fail to load
  if (invitesError && !invites) {
    console.warn('Invites could not be loaded, continuing with members only');
  }

  // Type guard for invites
  const validInvites = (invites || [])
    .filter((invite) => isCollectiveMemberRole(invite.role))
    .map((invite) => ({
      ...invite,
      role: invite.role as CollectiveMemberRole,
    }));

  const transformedMembers = (members || []).map((memberRecord) => ({
    id: memberRecord.id,
    role: memberRecord.role,
    member: {
      id: memberRecord.member?.id ?? '',
      full_name: memberRecord.member?.full_name ?? null,
      username: memberRecord.member?.username ?? null,
      avatar_url: memberRecord.member?.avatar_url ?? null,
    },
  }));

  return (
    <ManageMembersClientUI
      initialMembers={transformedMembers}
      initialInvites={validInvites}
      collectiveId={collective.id}
      currentUserId={user?.id ?? ''}
      isOwner={user?.id === collective.owner_id}
    />
  );
}
