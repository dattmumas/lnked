import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';

import { useUser } from '@/hooks/useUser';
import { Json } from '@/lib/database.types';
import { 
  useEnhancedPostEditorStore, 
  EnhancedPostEditorFormData 
} from '@/lib/stores/enhanced-post-editor-store';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { postCollectiveService } from '@/services/posts/PostCollectiveService';

import type { CollectiveSharingSettings, PostCollectiveRow, PostCollectiveValidationResult, PostCollectiveServiceResponse } from '@/types/enhanced-database.types';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

// Constants
const AUTO_SAVE_DEBOUNCE_MS = 500;
/* eslint-disable no-magic-numbers */
const STALE_TIME_MS = 1000 * 60 * 5; // 5 minutes
/* eslint-enable no-magic-numbers */

// Enhanced auto-save mutation hook with multi-collective support
export const useEnhancedAutoSavePost = (): UseMutationResult<
  EnhancedPostEditorFormData,
  Error,
  EnhancedPostEditorFormData & { author_id: string }
> => {
  const queryClient = useQueryClient();
  const store = useEnhancedPostEditorStore();
  const { markSaving, markSaved, markError, updateFormData } = store;

  return useMutation({
    mutationFn: async (data: EnhancedPostEditorFormData & { author_id: string }): Promise<EnhancedPostEditorFormData> => {
      const supabase = createSupabaseBrowserClient();

      // Validate required fields
      const hasAuthorId = data.author_id !== undefined && data.author_id !== null && data.author_id !== '';
      if (!hasAuthorId) {
        throw new Error('Missing author_id - user not authenticated');
      }

      const hasTitle = data.title !== undefined && data.title !== null && data.title.trim() !== '';
      if (!hasTitle) {
        throw new Error('Title is required for saving');
      }

      // Check authentication status
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError !== null) {
        console.error('Auth error:', authError);
        throw new Error(`Authentication error: ${authError.message}`); 
      }

      const hasSession = session !== null && session !== undefined;
      const hasUser = hasSession && session.user !== null && session.user !== undefined;
      if (!hasSession || !hasUser) {
        throw new Error('User not authenticated');
      }

      // Prepare post data for database
      const existingMetadata = data.metadata ?? {};
      const isValidMetadata = typeof existingMetadata === 'object' && 
                             existingMetadata !== null && 
                             !Array.isArray(existingMetadata);
      const metadataObject = isValidMetadata ? existingMetadata : {};

      const hasId = data.id !== undefined && data.id !== null && data.id !== '';
      const hasSubtitle = data.subtitle !== undefined && data.subtitle !== null && data.subtitle !== '';
      const hasAuthor = data.author !== undefined && data.author !== null && data.author !== '';
      const hasSeoTitle = data.seo_title !== undefined && data.seo_title !== null && data.seo_title !== '';
      const hasMetaDescription = data.meta_description !== undefined && data.meta_description !== null && data.meta_description !== '';
      const hasThumbnailUrl = data.thumbnail_url !== undefined && data.thumbnail_url !== null && data.thumbnail_url !== '';
      const hasCollectiveId = data.collective_id !== undefined && data.collective_id !== null && data.collective_id !== '';
      const hasPublishedAt = data.published_at !== undefined && data.published_at !== null && data.published_at !== '';

      const postData = {
        id: hasId ? data.id : undefined,
        title: data.title,
        content: data.content,
        subtitle: hasSubtitle ? data.subtitle : null,
        author: hasAuthor ? data.author : null,
        author_id: data.author_id,
        seo_title: hasSeoTitle ? data.seo_title : null,
        meta_description: hasMetaDescription ? data.meta_description : null,
        thumbnail_url: hasThumbnailUrl ? data.thumbnail_url : null,
        post_type: data.post_type,
        metadata: {
          ...metadataObject,
          // Store collective sharing settings in metadata for backward compatibility
          collective_sharing_settings: data.collective_sharing_settings ?? {},
          selected_collectives: data.selected_collectives ?? [],
        } as Json,
        is_public: data.is_public,
        status: data.status,
        collective_id: hasCollectiveId ? data.collective_id : null,
        published_at: hasPublishedAt ? data.published_at : null,
      };

      // Save the post first
      const { data: post, error } = await supabase
        .from('posts')
        .upsert(postData)
        .select()
        .single();

      if (error !== null) {
        console.error('❌ Auto-save failed:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
      }

      if (post === null || post === undefined) {
        throw new Error('Post was not returned from database after save');
      }

      // Handle multi-collective associations if selected_collectives exist
      // Note: This will work once the post_collectives table exists in production
      const hasSelectedCollectives = data.selected_collectives !== undefined && 
                                    data.selected_collectives !== null && 
                                    data.selected_collectives.length > 0;
      if (hasSelectedCollectives && data.selected_collectives !== undefined) {
        try {
          const associationResult = await postCollectiveService.createPostCollectiveAssociations(
            post.id,
            data.author_id,
            data.selected_collectives,
            data.collective_sharing_settings
          );

          const hasAssociationSuccess = associationResult.success === true;
          if (!hasAssociationSuccess) {
            console.warn('Warning: Could not create collective associations:', associationResult.errors);
            // Don't fail the whole save for collective association errors
          }
        } catch (associationError) {
          console.warn('Warning: Collective association service not available yet:', associationError);
          // This is expected until post_collectives table is created in production
        }
      }

      // Handle legacy collective_id migration
      const shouldMigrateLegacy = hasCollectiveId && 
                                 (!hasSelectedCollectives || 
                                  (data.selected_collectives !== undefined && data.selected_collectives.length === 0));
      if (shouldMigrateLegacy && data.collective_id !== undefined) {
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
      const hasPostId = savedPost.id !== undefined && savedPost.id !== null && savedPost.id !== '';
      const hasExistingId = store.formData.id !== undefined && store.formData.id !== null && store.formData.id !== '';
      if (hasPostId && !hasExistingId) {
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
export const useEnhancedPostData = (postId?: string): UseQueryResult<EnhancedPostEditorFormData | null, Error> => {
  return useQuery({
    queryKey: ['enhanced-post', postId],
    queryFn: async (): Promise<EnhancedPostEditorFormData | null> => {
      const hasPostId = postId !== undefined && postId !== null && postId !== '';
      if (!hasPostId) return null;

      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error !== null) {
        console.error('Failed to load post:', error);
        throw error;
      }

      // Extract enhanced data from metadata if available
      const metadata = (data.metadata as Record<string, unknown>) ?? {};
      const collectiveSharingSettings = (metadata.collective_sharing_settings ?? {}) as Record<string, CollectiveSharingSettings>;
      const selectedCollectives = (metadata.selected_collectives as string[] | undefined) ?? [];

      const hasContent = data.content !== null && data.content !== undefined;
      const hasSubtitle = data.subtitle !== null && data.subtitle !== undefined;
      const hasAuthor = data.author !== null && data.author !== undefined;
      const hasSeoTitle = data.seo_title !== null && data.seo_title !== undefined;
      const hasMetaDescription = data.meta_description !== null && data.meta_description !== undefined;
      const hasThumbnailUrl = data.thumbnail_url !== null && data.thumbnail_url !== undefined;
      const hasIsPublic = data.is_public !== null && data.is_public !== undefined;
      const hasStatus = data.status !== null && data.status !== undefined;
      const hasCollectiveId = data.collective_id !== null && data.collective_id !== undefined;
      const hasPublishedAt = data.published_at !== null && data.published_at !== undefined;

      // Transform database data to enhanced form data
      const enhancedData: EnhancedPostEditorFormData = {
        id: data.id,
        title: data.title ?? '',
        content: hasContent ? data.content : '',
        subtitle: hasSubtitle && data.subtitle !== null ? data.subtitle : undefined,
        author: hasAuthor && data.author !== null ? data.author : undefined,
        seo_title: hasSeoTitle && data.seo_title !== null ? data.seo_title : undefined,
        meta_description: hasMetaDescription && data.meta_description !== null ? data.meta_description : undefined,
        thumbnail_url: hasThumbnailUrl && data.thumbnail_url !== null ? data.thumbnail_url : undefined,
        post_type: data.post_type,
        metadata,
        is_public: hasIsPublic ? data.is_public : false,
        status: hasStatus ? data.status : 'draft',
        
        // Legacy field for backward compatibility
        collective_id: hasCollectiveId && data.collective_id !== null ? data.collective_id : undefined,
        
        // Enhanced multi-collective fields
        selected_collectives: selectedCollectives,
        collective_sharing_settings: collectiveSharingSettings,
        
        published_at: hasPublishedAt && data.published_at !== null ? data.published_at : undefined,
      };

      return enhancedData;
    },
    enabled: Boolean(postId),
    staleTime: STALE_TIME_MS,
  });
};

// Load post-collective associations (for posts that have them)
export const usePostCollectiveAssociations = (postId?: string): UseQueryResult<PostCollectiveRow[], Error> => {
  return useQuery({
    queryKey: ['post-collective-associations', postId],
    queryFn: async (): Promise<PostCollectiveRow[]> => {
      const hasPostId = postId !== undefined && postId !== null && postId !== '';
      if (!hasPostId) return [];
      
      try {
        return await postCollectiveService.getPostCollectiveAssociations(postId);
      } catch (error: unknown) {
        console.warn('Post collective associations not available yet:', error);
        return [];
      }
    },
    enabled: Boolean(postId),
    staleTime: STALE_TIME_MS,
  });
};

interface UseEnhancedPostEditorReturn {
  // Form data and state
  formData: EnhancedPostEditorFormData;
  originalData: EnhancedPostEditorFormData | undefined;
  isDirty: boolean;
  isLoading: boolean;
  
  // Auto-save status
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  
  // Current page
  currentPage: string;
  
  // Collective data
  selectedCollectives: string[];
  collectiveSharingSettings: Record<string, CollectiveSharingSettings>;
  collectiveAssociations: PostCollectiveRow[];
  
  // Actions
  updateFormData: (data: Partial<EnhancedPostEditorFormData>) => void;
  setCurrentPage: (page: 'editor' | 'details') => void;
  resetForm: () => void;
  savePost: () => Promise<EnhancedPostEditorFormData | undefined>;
  publishPost: () => Promise<EnhancedPostEditorFormData | undefined>;
  updateCollectiveAssociations: (collectiveIds: string[]) => Promise<PostCollectiveServiceResponse>;
  
  // Collective management
  addCollective: (collectiveId: string) => void;
  removeCollective: (collectiveId: string) => void;
  updateCollectiveSharingSettings: (collectiveId: string, settings: CollectiveSharingSettings) => void;
  setSelectedCollectives: (collectiveIds: string[]) => void;
  clearCollectiveSelections: () => void;
  
  // Backward compatibility
  getLegacyCollectiveId: () => string | undefined;
  setLegacyCollectiveId: (collectiveId: string | undefined) => void;
  migrateFromLegacyData: (data: EnhancedPostEditorFormData) => void;
  
  // React Query states
  isSaving: boolean;
  saveError: Error | null;
}

// Main enhanced post editor hook
export const useEnhancedPostEditor = (postId?: string): UseEnhancedPostEditorReturn => {
  const store = useEnhancedPostEditorStore();
  const autoSave = useEnhancedAutoSavePost();
  const { data: postData, isLoading: isLoadingPost } = useEnhancedPostData(postId);
  const { data: collectiveAssociations } = usePostCollectiveAssociations(postId);
  const { user } = useUser();

  // Initialize form data from server when post loads
  useEffect((): (() => void) => {
    const hasPostData = postData !== null && postData !== undefined;
    const hasOriginalData = store.originalData !== null && store.originalData !== undefined;
    if (hasPostData && !hasOriginalData) {
      store.initializeForm(postData);
    }
    return () => {
      // Empty cleanup
    };
  }, [postData, store.originalData, store]);

  // Auto-save when dirty with debounce
  useEffect((): (() => void) => {
    // Don't auto-save while loading initial data
    if (isLoadingPost) {
      return () => {
        // Empty cleanup
      };
    }

    // Check all conditions for auto-save
    const hasFormData = store.formData !== null && store.formData !== undefined;
    const hasTitleInForm = hasFormData && 
                          store.formData.title !== undefined && 
                          store.formData.title !== null && 
                          store.formData.title.trim() !== '';
    const hasUserId = user?.id !== undefined && user?.id !== null && user?.id !== '';

    if (store.isDirty && hasFormData && hasTitleInForm && hasUserId && user?.id) {
      const timer = setTimeout(() => {
        console.warn('🚀 Enhanced auto-saving post...');
        const dataToSave = {
          ...store.formData,
          author_id: user.id,
        };
        autoSave.mutate(dataToSave);
      }, AUTO_SAVE_DEBOUNCE_MS);

      return () => {
        clearTimeout(timer);
      };
    }

    return () => {
      // Empty cleanup
    };
  }, [store.formData, store.isDirty, autoSave, user?.id, isLoadingPost]);

  // Manual save function
  const savePost = useCallback((): Promise<EnhancedPostEditorFormData | undefined> => {
    const hasFormData = store.formData !== null && store.formData !== undefined;
    const hasUserId = user?.id !== undefined && user?.id !== null && user?.id !== '';
    
    if (hasFormData && hasUserId && user?.id) {
      const dataToSave = {
        ...store.formData,
        author_id: user.id,
        // Ensure selected_collectives is properly included
        selected_collectives: store.selectedCollectives,
        collective_sharing_settings: store.collectiveSharingSettings,
      };
      return autoSave.mutateAsync(dataToSave);
    }

    return Promise.resolve(undefined);
  }, [store.formData, autoSave, user?.id, store.selectedCollectives, store.collectiveSharingSettings]);

  // Enhanced publish post function with collective validation
  const publishPost = useCallback(
    async (): Promise<EnhancedPostEditorFormData | undefined> => {
      const hasFormData = store.formData !== null && store.formData !== undefined;
      const hasUserId = user?.id !== undefined && user?.id !== null && user?.id !== '';
      
      if (hasFormData && hasUserId && user?.id) {
        // Validate collective permissions before publishing
        const hasSelectedCollectives = store.formData.selected_collectives !== undefined && 
                                      store.formData.selected_collectives !== null && 
                                      store.formData.selected_collectives.length > 0;
        if (hasSelectedCollectives && store.formData.selected_collectives !== undefined) {
          try {
            const validation: PostCollectiveValidationResult = await postCollectiveService.validateCollectivePermissions(
              user.id,
              store.formData.selected_collectives
            );

            const isValid = validation.valid === true;
            if (!isValid) {
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
    }, 
    [store, autoSave, user?.id]
  );

  // Update collective associations
  const updateCollectiveAssociations = useCallback(async (collectiveIds: string[]): Promise<PostCollectiveServiceResponse> => {
    const hasPostId = store.formData?.id !== undefined && 
                     store.formData?.id !== null && 
                     store.formData?.id !== '';
    const hasUserId = user?.id !== undefined && user?.id !== null && user?.id !== '';
    
    if (!hasPostId || !hasUserId) {
      throw new Error('Post must be saved before updating collective associations');
    }
    
    // Extra null/undefined checks to satisfy TypeScript
    const postId = store.formData?.id;
    const userId = user?.id;
    
    if (postId === undefined || postId === null || postId === '' || 
        userId === undefined || userId === null || userId === '') {
      throw new Error('Post must be saved before updating collective associations');
    }

    try {
      const result: PostCollectiveServiceResponse = await postCollectiveService.updatePostCollectiveAssociations(
        postId,
        userId,
        collectiveIds,
        store.formData.collective_sharing_settings
      );

      const hasSuccess = result.success === true;
      if (!hasSuccess) {
        const errorMessages = result.errors?.map(err => err.error).join(', ') ?? 'Unknown error';
        throw new Error(`Failed to update collective associations: ${errorMessages}`);
      }

      // Update the store with new collective selections
      store.setSelectedCollectives(collectiveIds);

      return result;
    } catch (error: unknown) {
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
    collectiveAssociations: collectiveAssociations ?? [],
    
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