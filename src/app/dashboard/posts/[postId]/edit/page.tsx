import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import EditPostForm, { type PostDataType } from "./EditPostForm"; // Import the client form component

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in");
  }

  const { data: postData, error: postFetchError } = await supabase
    .from("posts")
    .select("*, collective:collectives!collective_id(name, owner_id)") // Fetch needed fields
    .eq("id", postId)
    .single();

  if (postFetchError || !postData) {
    console.error(
      `Error fetching post ${postId} for edit:`,
      postFetchError?.message
    );
    notFound();
  }

  if ("id" in postData) {
    // safe to access postData.id, postData.author_id, etc.
  }

  // Permission check: User must be author or owner of the collective (if it's a collective post)
  const isAuthor = postData.author_id === user.id;
  let canEditCollectivePost = false;
  if (postData.collective_id && postData.collective) {
    if (postData.collective.owner_id === user.id) {
      canEditCollectivePost = true;
    } else {
      // Check if user is an admin/editor member of the collective
      const { data: member, error: memberError } = await supabase
        .from("collective_members")
        .select("role")
        .eq("collective_id", postData.collective_id)
        .eq("user_id", user.id)
        .in("role", ["admin", "editor"])
        .maybeSingle();
      if (memberError) {
        console.error(
          "Error checking collective membership for edit permission:",
          memberError.message
        );
        // Decide if this error should prevent editing or just be logged.
        // For now, if memberError occurs, canEditCollectivePost remains false unless they are the direct owner.
      }
      if (member) canEditCollectivePost = true;
    }
  }

  if (!isAuthor && !canEditCollectivePost) {
    console.warn(
      `User ${user.id} does not have permission to edit post ${postId}.`
    );
    notFound(); // Or redirect to an unauthorized page
  }

  const initialPostData: PostDataType = {
    ...postData,
    collective_name: postData.collective?.name,
  };

  const pageTitleInfo = postData.collective?.name
    ? `Edit Post in ${postData.collective.name}`
    : "Edit Personal Post";

  return (
    <EditPostForm
      postId={postId}
      initialData={initialPostData}
      pageTitleInfo={pageTitleInfo}
    />
  );
}
