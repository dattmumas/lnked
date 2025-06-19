import { Info, Plus, Share2, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createServerSupabaseClient } from '@/lib/supabase/server';



export default async function CollectiveDashboardPage({
  params,
}: {
  params: Promise<{ collectiveId: string }>;
}) {
  const { collectiveId } = await params;
  const supabase = createServerSupabaseClient();
  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !currentUser) {
    redirect('/sign-in');
  }
  const { data: collective, error: collectiveError } = await supabase
    .from('collectives')
    .select('id, name, owner_id, description')
    .eq('id', collectiveId)
    .single();
  if (collectiveError || !collective) {
    redirect('/dashboard/collectives');
  }
  const isOwner = currentUser.id === collective.owner_id;

  // Check user's role in this collective
  const { data: membership } = await supabase
    .from('collective_members')
    .select('role')
    .eq('collective_id', collectiveId)
    .eq('member_id', currentUser.id)
    .single();

  const userRole = membership?.role;
  const canPost =
    userRole && ['owner', 'admin', 'editor', 'author'].includes(userRole);

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{collective.name}</h1>
        {collective.description && (
          <p className="text-muted-foreground text-lg">
            {collective.description}
          </p>
        )}
      </div>
      {/* Post Creation Guidance - New Individual-Centric Approach */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Content with {collective.name}
          </CardTitle>
          <CardDescription>
            Create individual posts and share them with this collective during
            the publishing process.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canPost ? (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>New Post Creation Flow</AlertTitle>
                <AlertDescription>
                  Posts are now created individually and can be shared with
                  multiple collectives. You can select {collective.name} as one
                  of your sharing destinations when publishing.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button asChild className="flex items-center gap-2">
                  <Link href="/posts/new">
                    <Plus className="h-4 w-4" />
                    Create New Post
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/posts">View My Posts</Link>
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                💡 <strong>Tip:</strong> When creating your post, you'll be able
                to share it with {collective.name}
                {userRole === 'owner' || userRole === 'admin'
                  ? ' and any other collectives you have access to'
                  : ''}
                .
              </div>
            </>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Posting Permissions</AlertTitle>
              <AlertDescription>
                You need author, editor, admin, or owner permissions to share
                posts with this collective. Contact the collective
                administrators if you'd like to contribute content.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      {/* Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collective Management
          </CardTitle>
          <CardDescription>
            Manage members, settings, and other collective features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link
                href={`/dashboard/collectives/${collectiveId}/manage/members`}
              >
                <Users className="h-4 w-4 mr-2" />
                Members
              </Link>
            </Button>

            {isOwner && (
              <>
                <Button variant="outline" asChild>
                  <Link
                    href={`/dashboard/collectives/${collectiveId}/settings`}
                  >
                    Settings
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link
                    href={`/dashboard/collectives/${collectiveId}/subscribers`}
                  >
                    Subscribers
                  </Link>
                </Button>
              </>
            )}

            <Button variant="outline" asChild>
              <Link
                href={`/collectives/${collective.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                View Public Page
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Role Information */}
      {userRole && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Your Role</AlertTitle>
          <AlertDescription>
            You are a <strong>{userRole}</strong> in this collective.
            {canPost &&
              ' You can create posts and share them with this collective.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
