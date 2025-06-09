import { useEffect, useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { 
  useEnhancedPostEditorStore, 
  EnhancedPostEditorFormData 
} from '@/lib/stores/enhanced-post-editor-store';
import { useUser } from '@/hooks/useUser';
import { postCollectiveService } from '@/services/posts/PostCollectiveService';
import { 
  EnhancedPostFormData,
  PostCollectiveServiceResponse 
} from '@/types/enhanced-database.types';
import { Json } from '@/lib/database.types';

// Enhanced auto-save mutation hook with multi-collective support
export const useEnhancedAutoSavePost = () => {
  const queryClient = useQueryClient();
  const store = useEnhancedPostEditorStore();
  const { markSaving, markSaved, markError, updateFormData } = store;

  return useMutation({
    mutationFn: async (data: EnhancedPostEditorFormData & { author_id: string }): Promise<EnhancedPostEditorFormData> => {
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

      // Prepare post data for database
      const existingMetadata = data.metadata || {};
      const metadataObject = typeof existingMetadata === 'object' && existingMetadata !== null && !Array.isArray(existingMetadata) 
        ? existingMetadata as Record<string, unknown>
        : {};

      const postData = {
        id: data.id,
        title: data.title,
        content: data.content,
        subtitle: data.subtitle || null,
        author: data.author || null,
        author_id: data.author_id,
        seo_title: data.seo_title || null,
        meta_description: data.meta_description || null,
        thumbnail_url: data.thumbnail_url || null,
        post_type: data.post_type,
        metadata: {
          ...metadataObject,
          // Store collective sharing settings in metadata for backward compatibility
          collective_sharing_settings: data.collective_sharing_settings || {},
          selected_collectives: data.selected_collectives || [],
        } as Json,
        is_public: data.is_public,
        status: data.status,
        collective_id: data.collective_id || null,
        published_at: data.published_at || null,
      };

      // Save the post first
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

      // Handle multi-collective associations if selected_collectives exist
      // Note: This will work once the post_collectives table exists in production
      if (data.selected_collectives && data.selected_collectives.length > 0) {
        try {
          const associationResult = await postCollectiveService.createPostCollectiveAssociations(
            post.id,
            data.author_id,
            data.selected_collectives,
            data.collective_sharing_settings
          );

          if (!associationResult.success) {
            console.warn('Warning: Could not create collective associations:', associationResult.errors);
            // Don't fail the whole save for collective association errors
          }
        } catch (associationError) {
          console.warn('Warning: Collective association service not available yet:', associationError);
          // This is expected until post_collectives table is created in production
        }
      }

      // Handle legacy collective_id migration
      if (data.collective_id && (!data.selected_collectives || data.selected_collectives.length === 0)) {
        try {
          await postCollectiveService.migrateLegacyPostCollective(
            post.id,
            data.collective_id,
            data.author_id
          );
        } catch (migrationError) {
          console.warn('Warning: Legacy collective migration not available yet:', migrationError);
        }
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
      console.warn('✅ Enhanced auto-save successful');
      markSaved();
      
      // Update the store with the post ID only if it's a new post
      if (savedPost.id && !store.formData.id) {
        updateFormData({ id: savedPost.id });
      }
      
      // Update the query cache
      queryClient.setQueryData(['enhanced-post', savedPost.id], savedPost);
    },
    onError: (error) => {
      console.error('❌ Enhanced auto-save error:', error.message);
      markError();
    },
  });
};

// Load existing post data with enhanced fields
export const useEnhancedPostData = (postId?: string) => {
  return useQuery({
    queryKey: ['enhanced-post', postId],
    queryFn: async (): Promise<EnhancedPostEditorFormData | null> => {
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

      // Extract enhanced data from metadata if available
      const metadata = (data.metadata as Record<string, unknown>) || {};
      const collectiveSharingSettings = metadata.collective_sharing_settings as Record<string, any> || {};
      const selectedCollectives = metadata.selected_collectives as string[] || [];

      // Transform database data to enhanced form data
      const enhancedData: EnhancedPostEditorFormData = {
        id: data.id,
        title: data.title,
        content: data.content || '',
        subtitle: data.subtitle || '',
        author: data.author || '',
        seo_title: data.seo_title || '',
        meta_description: data.meta_description || '',
        thumbnail_url: data.thumbnail_url || '',
        post_type: data.post_type,
        metadata: metadata,
        is_public: data.is_public ?? false,
        status: data.status || 'draft',
        
        // Legacy field for backward compatibility
        collective_id: data.collective_id || undefined,
        
        // Enhanced multi-collective fields
        selected_collectives: selectedCollectives,
        collective_sharing_settings: collectiveSharingSettings,
        
        published_at: data.published_at || undefined,
      };

      return enhancedData;
    },
    enabled: Boolean(postId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Load post-collective associations (for posts that have them)
export const usePostCollectiveAssociations = (postId?: string) => {
  return useQuery({
    queryKey: ['post-collective-associations', postId],
    queryFn: async () => {
      if (!postId) return [];
      
      try {
        return await postCollectiveService.getPostCollectiveAssociations(postId);
      } catch (error) {
        console.warn('Post collective associations not available yet:', error);
        return [];
      }
    },
    enabled: Boolean(postId),
    staleTime: 1000 * 60 * 5,
  });
};

// Main enhanced post editor hook
export const useEnhancedPostEditor = (postId?: string) => {
  const store = useEnhancedPostEditorStore();
  const autoSave = useEnhancedAutoSavePost();
  const { data: postData, isLoading: isLoadingPost } = useEnhancedPostData(postId);
  const { data: collectiveAssociations } = usePostCollectiveAssociations(postId);
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
        console.warn('🚀 Enhanced auto-saving post...');
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

    return undefined;
  }, [store.formData, store.isDirty, autoSave, user?.id, isLoadingPost]);

  // Manual save function
  const savePost = useCallback(async () => {
    if (store.formData && user?.id) {
      const dataToSave = {
        ...store.formData,
        author_id: user.id,
        // Ensure selected_collectives is properly included
        selected_collectives: store.selectedCollectives,
        collective_sharing_settings: store.collectiveSharingSettings,
      };
      return autoSave.mutateAsync(dataToSave);
    }

    return undefined;
  }, [store.formData, autoSave, user?.id]);

  // Enhanced publish post function with collective validation
  const publishPost = useCallback(async () => {
    if (store.formData && user?.id) {
      // Validate collective permissions before publishing
      if (store.formData.selected_collectives && store.formData.selected_collectives.length > 0) {
        try {
          const validation = await postCollectiveService.validateCollectivePermissions(
            user.id,
            store.formData.selected_collectives
          );

          if (!validation.valid) {
            const errorMessages = validation.errors.map(err => err.message).join(', ');
            throw new Error(`Cannot publish to selected collectives: ${errorMessages}`);
          }
        } catch (validationError) {
          console.warn('Collective validation not available yet:', validationError);
          // Continue with publish if validation service is not available
        }
      }

      const dataToSave = {
        ...store.formData,
        author_id: user.id,
        status: 'active' as const,
        is_public: true,
        published_at: new Date().toISOString(),
        // Ensure selected_collectives is properly included
        selected_collectives: store.selectedCollectives,
        collective_sharing_settings: store.collectiveSharingSettings,
      };
      
      store.updateFormData({
        status: 'active',
        is_public: true,
        published_at: dataToSave.published_at,
      });
      
      return autoSave.mutateAsync(dataToSave);
    }

    return undefined;
  }, [store, autoSave, user?.id]);

  // Update collective associations
  const updateCollectiveAssociations = useCallback(async (collectiveIds: string[]) => {
    if (!store.formData?.id || !user?.id) {
      throw new Error('Post must be saved before updating collective associations');
    }

    try {
      const result = await postCollectiveService.updatePostCollectiveAssociations(
        store.formData.id,
        user.id,
        collectiveIds,
        store.formData.collective_sharing_settings
      );

      if (!result.success) {
        const errorMessages = result.errors?.map(err => err.error).join(', ') || 'Unknown error';
        throw new Error(`Failed to update collective associations: ${errorMessages}`);
      }

      // Update the store with new collective selections
      store.setSelectedCollectives(collectiveIds);

      return result;
    } catch (error) {
      console.error('Error updating collective associations:', error);
      throw error;
    }
  }, [store, user?.id]);

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
    
    // Collective data
    selectedCollectives: store.selectedCollectives,
    collectiveSharingSettings: store.collectiveSharingSettings,
    collectiveAssociations,
    
    // Actions
    updateFormData: store.updateFormData,
    setCurrentPage: store.setCurrentPage,
    resetForm: store.resetForm,
    savePost,
    publishPost,
    updateCollectiveAssociations,
    
    // Collective management
    addCollective: store.addCollective,
    removeCollective: store.removeCollective,
    updateCollectiveSharingSettings: store.updateCollectiveSharingSettings,
    setSelectedCollectives: store.setSelectedCollectives,
    clearCollectiveSelections: store.clearCollectiveSelections,
    
    // Backward compatibility
    getLegacyCollectiveId: store.getLegacyCollectiveId,
    setLegacyCollectiveId: store.setLegacyCollectiveId,
    migrateFromLegacyData: store.migrateFromLegacyData,
    
    // React Query states
    isSaving: autoSave.isPending,
    saveError: autoSave.error,
  };
}; 