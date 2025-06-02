import { useEffect, useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { usePostEditorStore, PostFormData } from '@/lib/stores/post-editor-store';

// Simple client-side user hook
const useUser = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
};

// Auto-save mutation hook
export const useAutoSavePost = () => {
  const queryClient = useQueryClient();
  const store = usePostEditorStore();
  const { markSaving, markSaved, markError, updateFormData } = store;

  return useMutation({
    mutationFn: async (data: PostFormData & { author_id: string }): Promise<PostFormData> => {
      const supabase = createSupabaseBrowserClient();

      // Validate required fields
      if (!data.author_id) {
        throw new Error('Missing author_id - user not authenticated');
      }

      if (!data.title || data.title.trim() === '') {
        throw new Error('Title is required for saving');
      }

      // Check authentication status
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error(`Authentication error: ${authError.message}`);
      }

      if (!session?.user) {
        throw new Error('User not authenticated');
      }

      // Use the post ID from the data (which comes from the store)
      // This ensures we update the same post after the first save
      const postData = {
        id: data.id, // This will be undefined for new posts, set after first save
        title: data.title,
        content: data.content,
        subtitle: data.subtitle || null,
        author: data.author || null,
        author_id: data.author_id,
        seo_title: data.seo_title || null,
        meta_description: data.meta_description || null,
        thumbnail_url: data.thumbnail_url || null,
        post_type: data.post_type,
        metadata: data.metadata || {},
        is_public: data.is_public,
        status: data.status,
        collective_id: data.collective_id || null,
        published_at: data.published_at || null,
      };

      const { data: post, error } = await supabase
        .from('posts')
        .upsert(postData)
        .select()
        .single();

      if (error) {
        console.error('❌ Auto-save failed:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }

      if (!post) {
        throw new Error('Post was not returned from database after save');
      }

      return {
        ...data,
        id: post.id,
      };
    },
    onMutate: () => {
      markSaving();
    },
    onSuccess: (savedPost) => {
      console.log('✅ Auto-save successful');
      markSaved();
      
      // Update the store with the post ID only if it's a new post (current form data has no ID)
      if (savedPost.id && !store.formData.id) {
        updateFormData({ id: savedPost.id });
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
export const usePostData = (postId?: string) => {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: async (): Promise<PostFormData | null> => {
      if (!postId) return null;

      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) {
        console.error('Failed to load post:', error);
        throw error;
      }

      // Transform database data to form data
      return {
        id: data.id,
        title: data.title,
        content: data.content || '',
        subtitle: data.subtitle || '',
        author: data.author || '',
        seo_title: data.seo_title || '',
        meta_description: data.meta_description || '',
        thumbnail_url: data.thumbnail_url || '',
        post_type: data.post_type,
        metadata: (data.metadata as Record<string, any>) || {},
        is_public: data.is_public ?? false,
        status: (data.status as 'draft' | 'active' | 'removed') || 'draft',
        collective_id: data.collective_id || undefined,
        published_at: data.published_at || undefined,
      };
    },
    enabled: !!postId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Main post editor hook that integrates everything
export const usePostEditor = (postId?: string) => {
  const store = usePostEditorStore();
  const autoSave = useAutoSavePost();
  const { data: postData, isLoading: isLoadingPost } = usePostData(postId);
  const { user } = useUser();

  // Initialize form data from server when post loads
  useEffect(() => {
    if (postData && !store.originalData) {
      store.initializeForm(postData);
    }
  }, [postData, store.originalData, store]);

  // Auto-save when dirty with 500ms debounce
  useEffect(() => {
    // Don't auto-save while loading initial data
    if (isLoadingPost) {
      return;
    }

    // Check all conditions for auto-save
    if (store.isDirty && store.formData && store.formData.title?.trim() && user?.id) {
      const timer = setTimeout(() => {
        console.log('🚀 Auto-saving post...');
        // The store.formData already contains the post ID (if it exists)
        const dataToSave = {
          ...store.formData,
          author_id: user.id,
        };
        autoSave.mutate(dataToSave);
      }, 500);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [store.formData, store.isDirty, autoSave, user?.id, isLoadingPost]);

  // Manual save function
  const savePost = useCallback(async () => {
    if (store.formData && user?.id) {
      const dataToSave = {
        ...store.formData,
        author_id: user.id,
      };
      return autoSave.mutateAsync(dataToSave);
    }
  }, [store.formData, autoSave, user?.id]);

  // Publish post function
  const publishPost = useCallback(async () => {
    if (store.formData && user?.id) {
      const dataToSave = {
        ...store.formData,
        author_id: user.id,
        status: 'active' as const,
        is_public: true,
        published_at: new Date().toISOString(),
      };
      
      store.updateFormData({
        status: 'active',
        is_public: true,
        published_at: dataToSave.published_at,
      });
      
      return autoSave.mutateAsync(dataToSave);
    }
  }, [store.formData, autoSave, user?.id, store]);

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