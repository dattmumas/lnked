import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import React from 'react';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import ManageMembersClientUI from './ManageMembersClientUI'; // New client component

import type { Database } from '@/lib/database.types';

// Row type for collective_members table
type CollectiveMemberRow =
  Database['public']['Tables']['collective_members']['Row'];

// Row type for users table (only the fields we need)
type UserPartial = Pick<
  Database['public']['Tables']['users']['Row'],
  'id' | 'full_name'
>;

export type MemberWithDetails = CollectiveMemberRow & {
  user: UserPartial | null;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  invite_code: string;
};

async function getPendingInvites(collectiveId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    'get_collective_invites_with_user_details',
    { p_collective_id: collectiveId },
  );

  if (error) {
    console.error(
      `Error fetching pending invites for collective ${collectiveId}:`,
      error.message,
    );
    return [];
  }
  return data ?? [];
}

export default async function ManageCollectiveMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || currentUser === null) {
    redirect('/sign-in');
  }

  const { data: collective, error: collectiveError } = await supabase
    .from('collectives')
    .select('id, name, slug, owner_id')
    .eq('slug', slug)
    .single();

  if (collectiveError !== null || collective === null) {
    console.error(
      `Error fetching collective ${slug} for member management:`,
      collectiveError?.message,
    );
    notFound();
  }

  // Permission check: Only owner can manage members (for now, can be expanded to admin role members)
  if (collective.owner_id !== currentUser.id) {
    console.warn(
      `User ${currentUser.id} attempted to manage members for collective ${collective.id} without ownership.`,
    );
    // redirect('/dashboard'); // Or a more specific unauthorized page
    notFound();
  }

  const { data: members, error: membersError } = await supabase
    .from('collective_members')
    .select(
      `
      id,
      role,
      created_at,
      user:users!member_id(id, full_name)
    `,
    )
    .eq('collective_id', collective.id)
    .order('created_at', { ascending: true });

  if (membersError !== null) {
    console.error(
      `Error fetching members for collective ${collective.id}:`,
      membersError.message,
    );
    // Handle error, maybe show empty list with an error message
  }

  const pendingInvites = await getPendingInvites(collective.id);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">
          Manage Members for: {collective.name}
        </h1>
        <Link href="/dashboard" className="text-sm text-accent hover:underline">
          &larr; Back to Dashboard
        </Link>
      </header>
      <ManageMembersClientUI
        collectiveId={collective.id}
        initialMembers={
          (members as unknown as MemberWithDetails[]) !== null &&
          (members as unknown as MemberWithDetails[]) !== undefined
            ? (members as unknown as MemberWithDetails[])
            : []
        }
        pendingInvites={pendingInvites as PendingInvite[]}
        isOwner={currentUser.id === collective.owner_id}
      />
    </div>
  );
}
