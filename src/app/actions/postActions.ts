"use server";

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type {
  Database,
  TablesInsert,
  TablesUpdate,
} from "@/lib/database.types"; // Using generated types
import { z } from "zod";
import { revalidatePath } from "next/cache";

const PostFormSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be 200 characters or less"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  is_public: z.boolean().default(true),
  collectiveId: z.string().uuid().optional(), // Optional: For posting to a specific collective
});

type PostFormValues = z.infer<typeof PostFormSchema>;

interface CreatePostResult {
  data?: {
    postId: string;
    postSlug: string;
    collectiveSlug?: string | null; // Slug of the collective if post belongs to one
  };
  error?: string;
  fieldErrors?: Partial<Record<keyof PostFormValues, string[]>>;
}

const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 75);
};

export async function createPost(
  formData: PostFormValues
): Promise<CreatePostResult> {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) =>
          cookieStore.set(name, value, options),
        remove: (name: string, options: CookieOptions) =>
          cookieStore.delete(name, options),
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in to create a post." };
  }

  const validatedFields = PostFormSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      error: "Invalid input. Please check the fields.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title, content, is_public, collectiveId } = validatedFields.data;
  let collectiveSlug: string | null = null;

  // If posting to a collective, verify user is owner or member
  if (collectiveId) {
    const { data: collectiveData, error: collectiveCheckError } = await supabase
      .from("collectives")
      .select("id, owner_id, slug")
      .eq("id", collectiveId)
      .single();

    if (collectiveCheckError || !collectiveData) {
      return {
        error: "Collective not found or error fetching it.",
        fieldErrors: { collectiveId: ["Invalid collective."] },
      };
    }
    collectiveSlug = collectiveData.slug;

    const isOwner = collectiveData.owner_id === user.id;
    let isMember = false;
    if (!isOwner) {
      const { data: membership, error: memberCheckError } = await supabase
        .from("collective_members")
        .select("role")
        .eq("collective_id", collectiveId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (memberCheckError) {
        return { error: "Error checking collective membership." };
      }
      isMember =
        !!membership && ["admin", "editor", "author"].includes(membership.role);
    }

    if (!isOwner && !isMember) {
      return {
        error: "You do not have permission to post to this collective.",
        fieldErrors: { collectiveId: ["Permission denied."] },
      };
    }
  }

  const postSlug = generateSlug(title);

  const postToInsert: TablesInsert<"posts"> = {
    author_id: user.id,
    title,
    content,
    is_public,
    collective_id: collectiveId || null,
    published_at: is_public ? new Date().toISOString() : null,
  };

  const { data: newPost, error: insertError } = await supabase
    .from("posts")
    .insert(postToInsert)
    .select("id")
    .single();

  if (insertError) {
    console.error("Error inserting post:", insertError);
    return { error: `Failed to create post: ${insertError.message}` };
  }

  if (!newPost) {
    return { error: "Failed to create post for an unknown reason." };
  }

  // Revalidate paths
  revalidatePath("/dashboard");
  if (collectiveSlug) {
    revalidatePath(`/collectives/${collectiveSlug}`);
    revalidatePath(`/collectives/${collectiveSlug}/${postSlug}`); // Assuming post slug is part of URL
    if (collectiveId)
      revalidatePath(`/dashboard/[collectiveId]/new-post`, "page"); // if coming from specific collective new post page
  } else {
    // Revalidate user's personal newsletter page (e.g. /newsletters/[userId] or /[username])
    // This path needs to be defined. For now, revalidate a general posts path or dashboard.
    // revalidatePath(`/newsletters/${user.id}`);
  }
  // Revalidate the post page itself via its ID (more robust if slugs change)
  revalidatePath(`/posts/${newPost.id}`);

  return {
    data: {
      postId: newPost.id,
      postSlug: postSlug,
      collectiveSlug: collectiveSlug,
    },
  };
}

const UpdatePostFormSchema = PostFormSchema.partial().extend({
  // postId is not part of form data, but passed directly to action
  // We ensure at least one field is being updated if we want to enforce that,
  // but partial() means all fields from PostFormSchema are optional.
  // For simplicity, we'll allow updating any subset of fields.
});

type UpdatePostFormValues = z.infer<typeof UpdatePostFormSchema>;

interface UpdatePostResult {
  data?: {
    postId: string;
    postSlug: string;
    collectiveSlug?: string | null;
  };
  error?: string;
  fieldErrors?: Partial<Record<keyof UpdatePostFormValues, string[]>>;
}

export async function updatePost(
  postId: string,
  formData: UpdatePostFormValues
): Promise<UpdatePostResult> {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) =>
          cookieStore.set(name, value, options),
        remove: (name: string, options: CookieOptions) =>
          cookieStore.delete(name, options),
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in to update a post." };
  }

  // Fetch the existing post to check ownership and get collective_id if present
  const { data: existingPost, error: fetchError } = await supabase
    .from("posts")
    .select(
      "id, author_id, collective_id, published_at, collective:collectives!collective_id(slug, owner_id)"
    )
    .eq("id", postId)
    .single();

  if (fetchError || !existingPost) {
    return { error: "Post not found or error fetching post data." };
  }

  const isAuthor = existingPost.author_id === user.id;
  let isCollectiveOwnerOrMember = false;
  if (existingPost.collective_id && existingPost.collective) {
    if (existingPost.collective.owner_id === user.id) {
      isCollectiveOwnerOrMember = true;
    } else {
      const { data: membership, error: memberCheckError } = await supabase
        .from("collective_members")
        .select("role")
        .eq("collective_id", existingPost.collective_id)
        .eq("user_id", user.id)
        .in("role", ["admin", "editor"])
        .maybeSingle();
      if (memberCheckError)
        return { error: "Error checking collective membership for edit." };
      if (membership) {
        isCollectiveOwnerOrMember = true;
      }
    }
  }

  if (!isAuthor && !isCollectiveOwnerOrMember) {
    return { error: "You do not have permission to update this post." };
  }

  const validatedFields = UpdatePostFormSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      error: "Invalid input for update. Please check the fields.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title, content, is_public, collectiveId } = validatedFields.data;

  // Prevent changing collectiveId for an existing post for simplicity in MVP
  // If collectiveId is in formData and differs from existingPost.collective_id, it's an issue or complex move operation.
  if (
    collectiveId !== undefined &&
    collectiveId !== existingPost.collective_id
  ) {
    return {
      error: "Changing a post's collective is not supported in this update.",
      fieldErrors: { collectiveId: ["Cannot change collective."] },
    };
  }

  const updateData: Partial<TablesUpdate<"posts">> = {};
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (is_public !== undefined) {
    updateData.is_public = is_public;
    if (is_public && !existingPost.published_at) {
      updateData.published_at = new Date().toISOString();
    } else if (!is_public && existingPost.published_at) {
      updateData.published_at = null;
    }
  }
  // We are not allowing collectiveId to change here, so it's not in updateData.
  // If title changes, postSlug might need to change. Regenerate if so.
  const postSlug = title ? generateSlug(title) : undefined; // generateSlug is from existing createPost

  if (Object.keys(updateData).length === 0) {
    return { error: "No changes to update." }; // Or return success if no-op is fine
  }

  const { data: updatedPost, error: updateError } = await supabase
    .from("posts")
    .update(updateData)
    .eq("id", postId)
    .select("id") // Could select more if needed by return type
    .single();

  if (updateError) {
    console.error("Error updating post:", updateError);
    return { error: `Failed to update post: ${updateError.message}` };
  }

  if (!updatedPost) {
    return { error: "Failed to update post for an unknown reason." };
  }

  // Revalidate paths
  revalidatePath("/dashboard");
  if (existingPost.collective?.slug) {
    revalidatePath(`/collectives/${existingPost.collective.slug}`);
    revalidatePath(
      `/collectives/${existingPost.collective.slug}/${
        postSlug || existingPost.id
      }`
    ); // Use new or old slug/id
  } else if (existingPost.author_id) {
    revalidatePath(`/newsletters/${existingPost.author_id}`);
  }
  revalidatePath(`/posts/${postId}`);

  return {
    data: {
      postId: updatedPost.id,
      postSlug: postSlug || "slug-not-changed", // This needs refinement if slug is part of URL and changes
      collectiveSlug: existingPost.collective?.slug,
    },
  };
}

interface DeletePostResult {
  success: boolean;
  error?: string;
  redirectPath?: string;
}

export async function deletePost(postId: string): Promise<DeletePostResult> {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) =>
          cookieStore.set(name, value, options),
        remove: (name: string, options: CookieOptions) =>
          cookieStore.delete(name, options),
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in to delete a post." };
  }

  // Fetch the existing post to check ownership and get collective_id for revalidation
  const { data: existingPost, error: fetchError } = await supabase
    .from("posts")
    .select(
      "id, author_id, collective_id, collective:collectives!collective_id(slug)"
    )
    .eq("id", postId)
    .single();

  if (fetchError || !existingPost) {
    return {
      success: false,
      error: "Post not found or error fetching post data.",
    };
  }

  const isAuthor = existingPost.author_id === user.id;
  let isCollectiveOwnerOrMember = false;
  if (existingPost.collective_id && existingPost.collective) {
    // For deletion, typically owner of collective or author of post can delete.
    // More granular member roles for deletion can be added if needed.
    const { data: collectiveOwner, error: ownerCheckError } = await supabase
      .from("collectives")
      .select("owner_id")
      .eq("id", existingPost.collective_id)
      .single();
    if (ownerCheckError)
      return { success: false, error: "Error checking collective ownership." };
    if (collectiveOwner?.owner_id === user.id) {
      isCollectiveOwnerOrMember = true;
    }
    // Could also check collective_members for 'admin' role if members can delete
  }

  if (!isAuthor && !isCollectiveOwnerOrMember) {
    return {
      success: false,
      error: "You do not have permission to delete this post.",
    };
  }

  const { error: deleteError } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId);

  if (deleteError) {
    console.error("Error deleting post:", deleteError);
    return {
      success: false,
      error: `Failed to delete post: ${deleteError.message}`,
    };
  }

  // Determine redirect path after successful deletion
  let redirectPath = "/dashboard"; // Default redirect
  if (existingPost.collective?.slug) {
    revalidatePath(`/collectives/${existingPost.collective.slug}`);
    redirectPath = `/collectives/${existingPost.collective.slug}`;
  } else if (existingPost.author_id) {
    revalidatePath(`/newsletters/${existingPost.author_id}`);
    // redirectPath = `/newsletters/${existingPost.author_id}`; // Or back to dashboard
  }
  revalidatePath("/dashboard");
  revalidatePath("/"); // Revalidate feed

  return { success: true, redirectPath };
}
