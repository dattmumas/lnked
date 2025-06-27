'use client';

import { type User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { acceptCollectiveInvite } from '@/app/actions/memberActions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Database } from '@/lib/database.types';

type Collective = Database['public']['Tables']['collectives']['Row'];
type CollectiveInvite =
  Database['public']['Tables']['collective_invites']['Row'];

interface InvitePageClientProps {
  inviteDetails: {
    invite: CollectiveInvite;
    collective: Collective;
    inviter: { fullName: string | null; avatarUrl: string | null };
  };
  currentUser?: User;
}

export function InvitePageClient({
  inviteDetails,
  currentUser,
}: InvitePageClientProps): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { invite, collective, inviter } = inviteDetails;

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    const result = await acceptCollectiveInvite({
      inviteCode: invite.invite_code,
    });

    if (result.success && result.data?.slug) {
      router.push(`/collectives/${result.data.slug}`);
    } else {
      setError(result.error ?? 'Failed to accept invite. Please try again.');
      setIsLoading(false);
    }
  };

  const handleDecline = () => {
    // For now, just redirect to dashboard.
    // In future, we could update invite status to 'declined'.
    router.push('/dashboard');
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Join {collective.name}</CardTitle>
            <CardDescription>
              You've been invited to join this collective. Please sign in or
              create an account to accept.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() =>
                router.push(`/sign-in?next=/invite/${invite.invite_code}`)
              }
            >
              Sign In to Accept
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (invite.status !== 'pending') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md mx-auto text-center">
          <CardHeader>
            <CardTitle>Invite {invite.status}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This invitation has already been {invite.status}.</p>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => router.push('/dashboard')}
            >
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={inviter.avatarUrl ?? ''} />
              <AvatarFallback>{inviter.fullName?.[0] ?? 'C'}</AvatarFallback>
            </Avatar>
          </div>
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            <strong>{inviter.fullName ?? 'A collective member'}</strong> has
            invited you to join the collective:
          </CardDescription>
          <p className="text-2xl font-bold pt-2">{collective.name}</p>
        </CardHeader>
        <CardContent>
          {collective.description && (
            <p className="text-muted-foreground text-center mb-4">
              "{collective.description}"
            </p>
          )}
          <p className="text-sm text-center">
            You will be joining as a{' '}
            <strong className="capitalize">{invite.role}</strong>.
          </p>
          {error && (
            <p className="text-destructive text-center mt-4">{error}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            className="w-full"
            onClick={handleAccept}
            disabled={isLoading}
          >
            {isLoading ? 'Accepting...' : 'Accept Invite'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleDecline}
            disabled={isLoading}
          >
            Decline
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
