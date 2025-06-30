import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useState } from 'react';
import { z } from 'zod';

import {
  AUTO_SAVE_DEBOUNCE_MS,
  POST_STALE_TIME_MS,
} from '@/lib/constants/post-editor';
import {
  usePostEditorStore,
  PostFormData,
} from '@/lib/stores/post-editor-store';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { Json } from '@/lib/database.types';
import type { User } from '@supabase/supabase-js';
import type { UseMutationResult } from '@tanstack/react-query';

const PostFormSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, 'Title is required'),
  content: z.string().default(''),
  subtitle: z.string().optional(),
  author: z.string().optional(),
  author_id: z.string().uuid(),
  seo_title: z.string().optional(),
  meta_description: z.string().optional(),
  thumbnail_url: z.string().url().optional(),
  post_type: z.enum(['text', 'video']),
  metadata: z.record(z.unknown()).default({}),
  is_public: z.boolean(),
  status: z.enum(['draft', 'active', 'removed']),
  collective_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  published_at: z.string().datetime().optional(),
});

// Simple client-side user hook
const useUser = (): { user: User | undefined; loading: boolean } => {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Get initial user
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? undefined);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
};

// Auto-save mutation hook
export const useAutoSavePost = (): UseMutationResult<
  PostFormData,
  Error,
  PostFormData & { author_id: string }
> => {
  const queryClient = useQueryClient();
  const store = usePostEditorStore();
  const { markSaving, markSaved, markError } = store;

  return useMutation({
    mutationFn: async (
      data: PostFormData & { author_id: string },
    ): Promise<PostFormData> => {
      const supabase = createSupabaseBrowserClient();

      // Check authentication status
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();
      if (authError !== null && authError !== undefined) {
        console.error('Auth error:', authError);
        throw new Error(`Authentication error: ${authError.message}`);
      }

      if (
        session === null ||
        session === undefined ||
        session.user === null ||
        session.user === undefined
      ) {
        throw new Error('User not authenticated');
      }

      // Get user's personal tenant if tenant_id is not provided
      let tenantId = data.tenant_id;
      if (!tenantId) {
        const { data: tenantData, error: tenantError } = await supabase.rpc(
          'get_user_personal_tenant',
          {
            target_user_id: session.user.id,
          },
        );

        if (tenantError || !tenantData) {
          console.error('Failed to get user personal tenant:', tenantError);
          throw new Error('Failed to get user tenant information');
        }

        tenantId = tenantData;
      }

      // Ensure tenantId is defined
      if (!tenantId) {
        throw new Error('Tenant ID is required but not available');
      }

      // 🔐 Validate the payload with tenant_id included
      const validated = PostFormSchema.parse({
        ...data,
        tenant_id: tenantId,
      });

      // Transform data to match database schema
      const upsertData = {
        // Required fields
        title: validated.title,
        content: validated.content,
        author_id: validated.author_id,
        tenant_id: tenantId, // Use the guaranteed string value
        slug: validated.id
          ? `${validated.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
          : `${validated.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        post_type: validated.post_type,
        status: validated.status,
        is_public: validated.is_public,
        metadata: validated.metadata as Json,
        // Optional fields
        ...(validated.id && { id: validated.id }),
        ...(validated.subtitle && { subtitle: validated.subtitle }),
        ...(validated.author && { author: validated.author }),
        ...(validated.seo_title && { seo_title: validated.seo_title }),
        ...(validated.meta_description && {
          meta_description: validated.meta_description,
        }),
        ...(validated.thumbnail_url && {
          thumbnail_url: validated.thumbnail_url,
        }),
        ...(validated.collective_id && {
          collective_id: validated.collective_id,
        }),
        ...(validated.published_at && { published_at: validated.published_at }),
      };

      const { data: post, error } = await supabase
        .from('posts')
        .upsert(upsertData)
        .select()
        .single();

      if (error !== null && error !== undefined) {
        console.error('❌ Auto-save failed:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(
          `Database error: ${error.message} (Code: ${error.code})`,
        );
      }

      if (post === null || post === undefined) {
        throw new Error('Post was not returned from database after save');
      }

      const validatedPost = PostFormSchema.parse({
        ...post,
        metadata: post.metadata || {},
      });

      // Build result object with proper handling of optional properties
      const result: PostFormData = {
        title: validatedPost.title,
        content: validatedPost.content,
        post_type: validatedPost.post_type,
        status: validatedPost.status,
        metadata: validatedPost.metadata,
        is_public: validatedPost.is_public,
      };

      // Add optional properties
      if (validatedPost.id) result.id = validatedPost.id;
      if (validatedPost.subtitle) result.subtitle = validatedPost.subtitle;
      if (validatedPost.author) result.author = validatedPost.author;
      if (validatedPost.seo_title) result.seo_title = validatedPost.seo_title;
      if (validatedPost.meta_description)
        result.meta_description = validatedPost.meta_description;
      if (validatedPost.thumbnail_url)
        result.thumbnail_url = validatedPost.thumbnail_url;
      if (validatedPost.collective_id)
        result.collective_id = validatedPost.collective_id;
      if (validatedPost.tenant_id) result.tenant_id = validatedPost.tenant_id;
      if (validatedPost.published_at)
        result.published_at = validatedPost.published_at;

      return result;
    },
    onMutate: () => {
      markSaving();
    },
    onSuccess: (savedPost) => {
      console.warn('✅ Auto-save successful');
      markSaved();

      // Update the store with the post ID only if it's a new post (current form data has no ID)
      if (
        savedPost.id !== null &&
        savedPost.id !== undefined &&
        savedPost.id !== '' &&
        (store.formData.id === null ||
          store.formData.id === undefined ||
          store.formData.id === '')
      ) {
        store.updateFormData({ id: savedPost.id });
      }

      // Update the query cache
      queryClient.setQueryData(['post', savedPost.id], savedPost);
    },
    onError: (error) => {
      console.error('❌ Auto-save error:', error.message);
      markError();
    },
  });
};

// Load existing post data query
export const usePostData = (
  postId?: string,
): ReturnType<typeof useQuery<PostFormData | undefined>> => {
  return useQuery<PostFormData | undefined>({
    queryKey: ['post', postId],
    queryFn: async (): Promise<PostFormData | undefined> => {
      if (postId === null || postId === undefined || postId === '') {
        return undefined;
      }

      const supabase = createSupabaseBrowserClient();

      // Check if postId is a UUID or a slug
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          postId,
        );

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq(isUuid ? 'id' : 'slug', postId)
        .single();

      if (error !== null && error !== undefined) throw error;
      if (data === null || data === undefined) return undefined;

      // Cast through Zod to normalise defaults
      const parsed = PostFormSchema.partial({ author_id: true }).parse({
        ...data,
        subtitle: data.subtitle ?? undefined,
        author: data.author ?? undefined,
        seo_title: data.seo_title ?? undefined,
        meta_description: data.meta_description ?? undefined,
        thumbnail_url: data.thumbnail_url ?? undefined,
        collective_id: data.collective_id ?? undefined,
        tenant_id: data.tenant_id ?? undefined, // Preserve tenant_id from database
        published_at: data.published_at ?? undefined,
      });

      // Build result with proper handling of optional properties
      const result: PostFormData = {
        title: parsed.title,
        content: parsed.content,
        post_type: parsed.post_type,
        status: parsed.status,
        metadata: parsed.metadata,
        is_public: parsed.is_public,
      };

      // Add optional properties
      if (parsed.id) result.id = parsed.id;
      if (parsed.subtitle) result.subtitle = parsed.subtitle;
      if (parsed.author) result.author = parsed.author;
      if (parsed.seo_title) result.seo_title = parsed.seo_title;
      if (parsed.meta_description)
        result.meta_description = parsed.meta_description;
      if (parsed.thumbnail_url) result.thumbnail_url = parsed.thumbnail_url;
      if (parsed.collective_id) result.collective_id = parsed.collective_id;
      if (parsed.tenant_id) result.tenant_id = parsed.tenant_id; // Preserve tenant_id
      if (parsed.published_at) result.published_at = parsed.published_at;

      return result;
    },
    enabled: Boolean(postId),
    staleTime: POST_STALE_TIME_MS,
  });
};

// Returned shape of the `usePostEditor` hook – kept explicit to satisfy
// `@typescript-eslint/explicit-function-return-type`.
interface UsePostEditorResult {
  formData: PostFormData | undefined;
  originalData: PostFormData | undefined;
  isDirty: boolean;
  isLoading: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  currentPage: 'editor' | 'details';
  updateFormData: (updates: Partial<PostFormData>) => void;
  setCurrentPage: (page: 'editor' | 'details') => void;
  resetForm: () => void;
  savePost: () => Promise<PostFormData | undefined> | undefined;
  publishPost: () => Promise<PostFormData | undefined> | undefined;
  isSaving: boolean;
  saveError: unknown;
}

// Main post editor hook that integrates everything
export const usePostEditor = (postId?: string): UsePostEditorResult => {
  const store = usePostEditorStore();
  const autoSave = useAutoSavePost();
  const { data: postData, isLoading: isLoadingPost } = usePostData(postId);
  const { user } = useUser();

  // Initialize form data from server when post loads
  useEffect(() => {
    if (
      postData !== null &&
      postData !== undefined &&
      (store.originalData === null || store.originalData === undefined)
    ) {
      store.initializeForm(postData);
    }
  }, [postData, store.originalData, store]);

  // Auto-save when dirty with 500ms debounce
  useEffect(() => {
    // Don't auto-save while loading initial data
    if (isLoadingPost) {
      return undefined;
    }

    // Check all conditions for auto-save
    if (
      store.isDirty &&
      typeof store.formData?.title === 'string' &&
      store.formData.title.trim().length > 0 &&
      typeof user?.id === 'string'
    ) {
      const timer = setTimeout(() => {
        console.warn('🚀 Auto-saving post...');
        // The store.formData already contains the post ID (if it exists)
        const dataToSave = {
          ...store.formData,
          author_id: user.id,
        };
        autoSave.mutate(dataToSave);
      }, AUTO_SAVE_DEBOUNCE_MS);

      return (): void => {
        clearTimeout(timer);
      };
    }

    return undefined;
  }, [store.formData, store.isDirty, autoSave, user, isLoadingPost]);

  // Manual save function
  const savePost = useCallback(():
    | Promise<PostFormData | undefined>
    | undefined => {
    if (
      store.formData !== null &&
      store.formData !== undefined &&
      typeof user?.id === 'string'
    ) {
      const dataToSave = {
        ...store.formData,
        author_id: user.id,
      };
      return autoSave.mutateAsync(dataToSave);
    }

    return undefined;
  }, [store.formData, autoSave, user]);

  // Publish post function
  const publishPost = useCallback(():
    | Promise<PostFormData | undefined>
    | undefined => {
    if (
      store.formData !== null &&
      store.formData !== undefined &&
      typeof user?.id === 'string'
    ) {
      const dataToSave = {
        ...store.formData,
        author_id: user.id,
        status: 'active' as const,
        is_public: true,
        published_at: new Date().toISOString(),
      };

      store.updateFormData({
        status: 'active' as const,
        is_public: true,
        published_at: dataToSave.published_at,
      });

      return autoSave.mutateAsync(dataToSave);
    }

    return undefined;
  }, [store, autoSave, user]);

  return {
    // Form data and state
    formData: store.formData,
    originalData: store.originalData,
    isDirty: store.isDirty,
    isLoading: isLoadingPost || store.isLoading,

    // Auto-save status
    autoSaveStatus: store.autoSaveStatus,

    // Current page
    currentPage: store.currentPage,

    // Actions
    updateFormData: store.updateFormData,
    setCurrentPage: store.setCurrentPage,
    resetForm: store.resetForm,
    savePost,
    publishPost,

    // React Query states
    isSaving: autoSave.isPending,
    saveError: autoSave.error,
  };
};
