import { Users, Newspaper, Heart, Eye } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import FollowCollectiveButton from '@/components/FollowCollectiveButton';
import { Button } from '@/components/ui/button';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { CollectiveData } from '@/lib/data-loaders/collective-loader';

interface CollectiveHeroProps {
  collectiveSlug: string;
  initialData: CollectiveData | null;
}

export async function CollectiveHero({
  initialData,
}: CollectiveHeroProps): Promise<React.ReactElement> {
  if (!initialData) {
    return <div>Collective not found</div>;
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole: string | null = null;
  if (user) {
    const { data: member } = await supabase
      .from('collective_members')
      .select('role')
      .eq('collective_id', initialData.id)
      .eq('member_id', user.id)
      .single();
    userRole = member?.role || null;
  }

  const canManage = userRole === 'owner' || userRole === 'admin';

  const stats = [
    {
      icon: Users,
      label: 'Members',
      value: initialData.member_count || 0,
    },
    {
      icon: Newspaper,
      label: 'Posts',
      value: initialData.post_count || 0,
    },
    { icon: Heart, label: 'Likes', value: 'N/A' }, // Placeholder
    { icon: Eye, label: 'Views', value: 'N/A' }, // Placeholder
  ];

  return (
    <div className="collective-hero bg-card p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {initialData.logo_url && (
            <Image
              src={initialData.logo_url}
              alt={`${initialData.name} logo`}
              width={80}
              height={80}
              className="rounded-full"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{initialData.name}</h1>
            <p className="text-sm text-muted-foreground">@{initialData.slug}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {canManage ? (
            <Link href={`/settings/collectives/${initialData.slug}`}>
              <Button>Manage</Button>
            </Link>
          ) : (
            user && (
              <FollowCollectiveButton
                targetCollectiveId={initialData.id}
                targetCollectiveName={initialData.name}
                initialIsFollowing={false} // This should be fetched ideally
                currentUserId={user.id}
              />
            )
          )}
        </div>
      </div>
      <p className="text-muted-foreground mb-4">{initialData.description}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <stat.icon className="mx-auto h-6 w-6 mb-1" />
            <p className="font-semibold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
