"use server";

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type {
  Database,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "@/lib/database.types"; // Using generated types
import { z } from "zod";
import { revalidatePath } from "next/cache";

// Base schema for common post fields (title, content, collectiveId)
const BasePostSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be 200 characters or less"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  collectiveId: z.string().uuid().optional(),
});

// Schema for creating a post - includes is_public for initial state
const CreatePostSchema = BasePostSchema.extend({
  is_public: z.boolean().default(true),
  published_at: z.string().datetime({ offset: true }).optional().nullable(),
});

type CreatePostFormValues = z.infer<typeof CreatePostSchema>;

// Schema for updating a post - receives is_public and published_at from client logic
// All fields are optional for an update.
const UpdatePostServerSchema = BasePostSchema.partial().extend({
  is_public: z.boolean().optional(),
  published_at: z.string().datetime({ offset: true }).optional().nullable(), // Expect ISO string or null
});

// This type is what updatePost action will receive from the client (EditPostForm)
export type UpdatePostClientValues = z.infer<typeof UpdatePostServerSchema>;

interface CreatePostResult {
  data?: {
    postId: string;
    postSlug: string;
    collectiveSlug?: string | null;
  };
  error?: string;
  fieldErrors?: Partial<Record<keyof CreatePostFormValues, string[]>>;
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

// Helper function to create Supabase client with correct cookie handling for Server Actions
async function createSupabaseServerClientInternal() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            // In Server Actions, direct cookie setting might be restricted.
            // Supabase client might try to set cookies during session refresh.
            // This error handling prevents the action from crashing.
            // console.warn("Supabase client: Failed to set cookie from Server Action", error);
          },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch (error) {
            // console.warn("Supabase client: Failed to remove cookie from Server Action", error);
          },
      },
    }
  );
}

export async function createPost(
  formData: CreatePostFormValues
): Promise<CreatePostResult> {
  const supabase = await createSupabaseServerClientInternal();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in to create a post." };
  }

  const validatedFields = CreatePostSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      error: "Invalid input. Please check the fields.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title, content, is_public, collectiveId, published_at } =
    validatedFields.data;
  let collectiveSlug: string | null = null;

  type CollectiveData = { id: string; owner_id: string; slug: string };
  type MembershipData = { role: Enums<"collective_member_role"> };

  if (collectiveId) {
    const { data: collectiveData, error: collectiveCheckError } = await supabase
      .from("collectives")
      .select("id, owner_id, slug")
      .eq("id", collectiveId as string) // Cast if needed, though UUID should be fine
      .single<CollectiveData>();

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
        .eq("collective_id", collectiveId as string)
        .eq("user_id", user.id as string) // Cast if needed
        .maybeSingle<MembershipData>();
      if (memberCheckError) {
        return { error: "Error checking collective membership." };
      }
      isMember =
        !!membership &&
        ["admin", "editor", "author"].includes(membership.role as string);
    }

    if (!isOwner && !isMember) {
      return {
        error: "You do not have permission to post to this collective.",
        fieldErrors: { collectiveId: ["Permission denied."] },
      };
    }
  }

  const postSlug = generateSlug(title);

  let final_published_at: string | null = null;
  if (published_at) {
    final_published_at = new Date(published_at).toISOString();
  } else if (is_public) {
    final_published_at = new Date().toISOString();
  }

  const postToInsert: TablesInsert<"posts"> = {
    author_id: user.id,
    title,
    content,
    is_public,
    collective_id: collectiveId || null,
    published_at: final_published_at,
  };

  type NewPostId = { id: string };
  const { data: newPost, error: insertError } = await supabase
    .from("posts")
    .insert(postToInsert) // Type for postToInsert should be TablesInsert<"posts">
    .select("id")
    .single<NewPostId>();

  if (insertError) {
    console.error("Error inserting post:", insertError);
    return { error: `Failed to create post: ${insertError.message}` };
  }

  if (!newPost) {
    return { error: "Failed to create post for an unknown reason." };
  }

  revalidatePath("/dashboard");
  if (collectiveSlug) {
    revalidatePath(`/collectives/${collectiveSlug}`);
    revalidatePath(`/collectives/${collectiveSlug}/${postSlug}`);
    if (collectiveId)
      revalidatePath(`/dashboard/[collectiveId]/new-post`, "page");
  } else {
    revalidatePath(`/newsletters/${user.id}`);
  }
  revalidatePath(`/posts/${newPost.id}`);

  return {
    data: {
      postId: newPost.id,
      postSlug: postSlug,
      collectiveSlug: collectiveSlug,
    },
  };
}

interface UpdatePostResult {
  data?: {
    postId: string;
    postSlug: string;
    collectiveSlug?: string | null;
  };
  error?: string;
  fieldErrors?: Partial<Record<keyof UpdatePostClientValues, string[]>>;
}

export async function updatePost(
  postId: string,
  formData: UpdatePostClientValues
): Promise<UpdatePostResult> {
  const supabase = await createSupabaseServerClientInternal();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be logged in to update a post." };
  }

  type ExistingPostData = {
    id: string;
    author_id: string;
    collective_id: string | null;
    published_at: string | null;
    collective: { slug: string; owner_id: string } | null;
  };
  const { data: existingPost, error: fetchError } = await supabase
    .from("posts")
    .select(
      "id, author_id, collective_id, published_at, collective:collectives!collective_id(slug, owner_id)"
    )
    .eq("id", postId)
    .single<ExistingPostData>();

  if (fetchError || !existingPost) {
    return { error: "Post not found or error fetching post data." };
  }

  const isAuthor = existingPost.author_id === user.id;
  let isCollectiveOwnerOrMember = false;
  if (existingPost.collective_id && existingPost.collective) {
    if (existingPost.collective.owner_id === user.id) {
      isCollectiveOwnerOrMember = true;
    } else {
      type MembershipRole = { role: Enums<"collective_member_role"> };
      const { data: membership, error: memberCheckError } = await supabase
        .from("collective_members")
        .select("role")
        .eq("collective_id", existingPost.collective_id as string)
        .eq("user_id", user.id as string)
        .in("role", ["admin", "editor"])
        .maybeSingle<MembershipRole>();
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

  const validatedFields = UpdatePostServerSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      error: "Invalid input for update. Please check the fields.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title, content, is_public, published_at, collectiveId } =
    validatedFields.data;

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
  }
  if (published_at !== undefined) {
    updateData.published_at = published_at;
  }

  const postSlug = title ? generateSlug(title) : undefined;

  if (
    Object.keys(updateData).length === 0 &&
    title === undefined &&
    content === undefined &&
    is_public === undefined &&
    published_at === undefined
  ) {
    return { error: "No changes to update." };
  }

  type UpdatedPostId = { id: string };
  const { data: updatedPost, error: updateError } = await supabase
    .from("posts")
    .update(updateData) // Type for updateData should be Partial<TablesUpdate<"posts">>
    .eq("id", postId)
    .select("id")
    .single<UpdatedPostId>();

  if (updateError) {
    console.error("Error updating post:", updateError);
    return { error: `Failed to update post: ${updateError.message}` };
  }

  if (!updatedPost) {
    return { error: "Failed to update post for an unknown reason." };
  }

  revalidatePath("/dashboard");
  if (existingPost.collective?.slug) {
    revalidatePath(`/collectives/${existingPost.collective.slug}`);
    revalidatePath(
      `/collectives/${existingPost.collective.slug}/${
        postSlug || existingPost.id
      }`
    );
  } else if (existingPost.author_id) {
    revalidatePath(`/newsletters/${existingPost.author_id}`);
  }
  revalidatePath(`/posts/${postId}`);

  return {
    data: {
      postId: updatedPost.id,
      postSlug: postSlug || "slug-not-changed",
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
  const supabase = await createSupabaseServerClientInternal();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in to delete a post." };
  }

  type ExistingPostForDelete = {
    id: string;
    author_id: string;
    collective_id: string | null;
    collective: { slug: string } | null;
  };
  const { data: existingPost, error: fetchError } = await supabase
    .from("posts")
    .select(
      "id, author_id, collective_id, collective:collectives!collective_id(slug)"
    )
    .eq("id", postId)
    .single<ExistingPostForDelete>();

  if (fetchError || !existingPost) {
    return {
      success: false,
      error: "Post not found or error fetching post data.",
    };
  }

  const isAuthor = existingPost.author_id === user.id;
  let isCollectiveOwnerOrMember = false;
  if (existingPost.collective_id && existingPost.collective) {
    type CollectiveOwnerData = { owner_id: string };
    const { data: collectiveOwner, error: ownerCheckError } = await supabase
      .from("collectives")
      .select("owner_id")
      .eq("id", existingPost.collective_id as string)
      .single<CollectiveOwnerData>();
    if (ownerCheckError)
      return { success: false, error: "Error checking collective ownership." };
    if (collectiveOwner?.owner_id === user.id) {
      isCollectiveOwnerOrMember = true;
    }
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

  let redirectPath = "/dashboard";
  if (existingPost.collective?.slug) {
    revalidatePath(`/collectives/${existingPost.collective.slug}`);
    redirectPath = `/collectives/${existingPost.collective.slug}`;
  } else if (existingPost.author_id) {
    revalidatePath(`/newsletters/${existingPost.author_id}`);
  }
  revalidatePath("/dashboard");
  revalidatePath("/");

  return { success: true, redirectPath };
}
