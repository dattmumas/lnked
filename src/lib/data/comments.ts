import { createServerSupabaseClient } from "@/lib/supabase/server";

interface AddCommentArgs {
  postId: string;
  userId: string;
  content: string;
  parentId?: string;
}

export async function getCommentsByPostId(postId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      *,
      user:users(*),
      reactions:comment_reactions(*)
    `
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addComment({
  postId,
  userId,
  content,
  parentId,
}: AddCommentArgs) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("comments")
    .insert([
      {
        post_id: postId,
        user_id: userId,
        content,
        parent_id: parentId || null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Video-Post Mapping Functions for Comment Integration

export async function getOrCreatePostForVideo(videoId: string) {
  const supabase = await createServerSupabaseClient();
  
  // Get video data first to check if it exists
  const { data: video, error: videoError } = await supabase
    .from("video_assets")
    .select("id, title, description, created_by")
    .eq("id", videoId)
    .single();
    
  if (videoError || !video) {
    throw new Error("Video not found");
  }
  
  // Handle case where video has no creator (use a system fallback or throw error)
  if (!video.created_by) {
    throw new Error("Video has no creator assigned");
  }
  
  // For now, look for existing posts by title matching pattern until slug column is added
  const videoPostTitle = `Video: ${video.title || videoId}`;
  
  // First, try to find existing post for this video
  const { data: existingPost } = await supabase
    .from("posts")
    .select("id, title")
    .eq("title", videoPostTitle)
    .eq("author_id", video.created_by)
    .maybeSingle();
    
  if (existingPost) {
    return existingPost;
  }
  
  // Create post entry for the video
  const { data: newPost, error: postError } = await supabase
    .from("posts")
    .insert({
      title: videoPostTitle,
      content: video.description || `This post contains comments for video: ${video.title || videoId}`,
      author_id: video.created_by,
      status: "active" as const,
      is_public: true,
      published_at: new Date().toISOString()
    })
    .select("id, title")
    .single();
    
  if (postError || !newPost) {
    throw new Error("Failed to create post for video");
  }
  
  return newPost;
}

export async function getCommentsByVideoId(videoId: string) {
  const post = await getOrCreatePostForVideo(videoId);
  return getCommentsByPostId(post.id);
}

export async function addCommentToVideo({
  videoId,
  userId,
  content,
  parentId,
}: {
  videoId: string;
  userId: string;
  content: string;
  parentId?: string;
}) {
  const post = await getOrCreatePostForVideo(videoId);
  return addComment({
    postId: post.id,
    userId,
    content,
    parentId,
  });
}
