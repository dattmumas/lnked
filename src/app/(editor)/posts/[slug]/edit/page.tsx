import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import EditPostForm, { type PostDataType } from './EditPostForm'; // Import the client form component

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: postData, error: postFetchError } = await supabase
    .from('posts')
    .select('*')
    .eq('id', slug)
    .single();

  if (postFetchError || !postData) {
    console.error(
      `Error fetching post ${slug} for edit:`,
      postFetchError?.message,
    );
    notFound();
  }

  // Fetch collective data separately if post belongs to a collective
  let collectiveData = null;
  if (postData.collective_id) {
    const { data: collective } = await supabase
      .from('collectives')
      .select('id, name, slug, owner_id')
      .eq('id', postData.collective_id)
      .single();
    collectiveData = collective;
  }

  if ('id' in postData) {
    // safe to access postData.id, postData.author_id, etc.
  }

  // Permission check: User must be author or owner of the collective (if it's a collective post)
  const isAuthor = postData.author_id === user.id;
  let canEditCollectivePost = false;
  if (postData.collective_id && collectiveData) {
    if (collectiveData.owner_id === user.id) {
      canEditCollectivePost = true;
    } else {
      // Check if user is an admin/editor member of the collective
      const { data: member, error: memberError } = await supabase
        .from('collective_members')
        .select('role')
        .eq('collective_id', postData.collective_id)
        .eq('user_id', user.id)
        .in('role', ['admin', 'editor'])
        .maybeSingle();
      if (memberError) {
        console.error(
          'Error checking collective membership for edit permission:',
          memberError.message,
        );
        // Decide if this error should prevent editing or just be logged.
        // For now, if memberError occurs, canEditCollectivePost remains false unless they are the direct owner.
      }
      if (member) canEditCollectivePost = true;
    }
  }

  if (!isAuthor && !canEditCollectivePost) {
    console.warn(
      `User ${user.id} does not have permission to edit post ${slug}.`,
    );
    notFound(); // Or redirect to an unauthorized page
  }

  const initialPostData: PostDataType = {
    ...postData,
    collective_name: collectiveData?.name,
  };

  const pageTitle = collectiveData?.name
    ? `Edit Post in ${collectiveData.name}`
    : 'Edit Personal Post';

  return (
    <EditPostForm
      postId={postData.id}
      initialData={initialPostData}
      pageTitle={pageTitle}
    />
  );
}
