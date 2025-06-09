import { Suspense } from 'react';
import CommentsServer from './CommentsServer';
import CommentsClient from './CommentsClient';
import { CommentsSkeleton } from '@/components/ui/CommentsSkeleton';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface CommentsHybridProps {
  postId: string;
  postSlug?: string;
}

export default async function CommentsHybrid({
  postId,
  postSlug,
}: CommentsHybridProps) {
  // Get current user on server for initial render
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="w-full max-w-4xl mt-8">
      {/* Server-rendered comments for SEO and initial display */}
      <Suspense fallback={<CommentsSkeleton />}>
        <CommentsServer postId={postId} />
      </Suspense>

      {/* Client-side interactivity for forms and interactions */}
      <CommentsClient
        postId={postId}
        currentUserId={user?.id || null}
        postSlug={postSlug}
      />
    </div>
  );
}
