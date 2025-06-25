// Tenant-Aware Post Editor Hook
// Handles post creation and editing within tenant context

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

import { createPost, updatePost } from '@/app/actions/postActions';
import { useTenantContext } from '@/providers/TenantProvider';

import type { CreatePostServerValues, UpdatePostServerValues } from '@/lib/schemas/postSchemas';

// =============================================================================
// TYPES
// =============================================================================

interface TenantPostEditorOptions {
  postId?: string; // For editing existing posts
  initialData?: Partial<CreatePostServerValues>;
}

interface PostFormData {
  title: string;
  subtitle?: string;
  content: string;
  is_public: boolean;
  published_at?: string;
  seo_title?: string;
  meta_description?: string;
  author?: string;
}

export interface UseTenantPostEditorReturn {
  // Form state
  formData: PostFormData;
  setFormData: React.Dispatch<React.SetStateAction<PostFormData>>;
  
  // Current context
  currentTenant: { id: string; name: string; type: string } | null;
  
  // Actions
  savePost: (data: PostFormData) => Promise<{ success: boolean; error?: string; postId?: string }>;
  saveDraft: (data: PostFormData) => Promise<{ success: boolean; error?: string; postId?: string }>;
  publishPost: (data: PostFormData) => Promise<{ success: boolean; error?: string; postId?: string }>;
  
  // States
  isSaving: boolean;
  isPublishing: boolean;
  error: string | null;
  
  // Validation
  validateForm: (data: PostFormData) => { isValid: boolean; errors: Record<string, string> };
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useTenantPostEditor(options: TenantPostEditorOptions = {}): UseTenantPostEditorReturn {
  const router = useRouter();
  const { currentTenant } = useTenantContext();
  const { postId, initialData } = options;
  
  // Form state
  const [formData, setFormData] = useState<PostFormData>({
    title: initialData?.title || '',
    subtitle: initialData?.subtitle || undefined,
    content: initialData?.content || '',
    is_public: initialData?.is_public ?? true,
    published_at: initialData?.published_at || undefined,
    seo_title: initialData?.seo_title || undefined,
    meta_description: initialData?.meta_description || undefined,
    author: initialData?.author || undefined,
  });
  
  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form validation
  const validateForm = useCallback((data: PostFormData): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    
    if (!data.title.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!data.content.trim()) {
      errors.content = 'Content is required';
    }
    
    if (data.title.length > 200) {
      errors.title = 'Title must be 200 characters or less';
    }
    
    if (data.content.length > 50000) {
      errors.content = 'Content must be 50,000 characters or less';
    }
    
    if (data.seo_title && data.seo_title.length > 60) {
      errors.seo_title = 'SEO title must be 60 characters or less';
    }
    
    if (data.meta_description && data.meta_description.length > 160) {
      errors.meta_description = 'Meta description must be 160 characters or less';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }, []);

  // Save post (create or update)
  const savePost = useCallback(async (data: PostFormData): Promise<{ success: boolean; error?: string; postId?: string }> => {
    if (!currentTenant) {
      return { success: false, error: 'No tenant context available' };
    }

    const validation = validateForm(data);
    if (!validation.isValid) {
      const errorMessage = Object.values(validation.errors)[0];
      return { success: false, error: errorMessage };
    }

    setIsSaving(true);
    setError(null);

    try {
      if (postId) {
        // Update existing post
        const updateData: UpdatePostServerValues = {
          title: data.title,
          subtitle: data.subtitle || undefined,
          content: data.content,
          is_public: data.is_public,
          published_at: data.published_at || undefined,
          seo_title: data.seo_title || undefined,
          meta_description: data.meta_description || undefined,
          author: data.author || undefined,
        };

        const result = await updatePost(postId, updateData);
        
        if (result.error) {
          setError(result.error);
          return { success: false, error: result.error };
        }

        return { 
          success: true, 
          postId: result.data?.postId 
        };
      } else {
        // Create new post
        const createData: CreatePostServerValues = {
          title: data.title,
          subtitle: data.subtitle || undefined,
          content: data.content,
          is_public: data.is_public,
          published_at: data.published_at || undefined,
          seo_title: data.seo_title || undefined,
          meta_description: data.meta_description || undefined,
          author: data.author || undefined,
          // Use current tenant as the context
          collectiveId: currentTenant.is_personal ? undefined : currentTenant.tenant_id,
          selected_collectives: [],
        };

        const result = await createPost(createData);
        
        if (result.error) {
          setError(result.error);
          return { success: false, error: result.error };
        }

        return { 
          success: true, 
          postId: result.data?.postId 
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save post';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSaving(false);
    }
  }, [currentTenant, postId, validateForm]);

  // Save as draft
  const saveDraft = useCallback(async (data: PostFormData): Promise<{ success: boolean; error?: string; postId?: string }> => {
    const draftData = {
      ...data,
      is_public: false,
      published_at: undefined,
    };
    
    return savePost(draftData);
  }, [savePost]);

  // Publish post
  const publishPost = useCallback(async (data: PostFormData): Promise<{ success: boolean; error?: string; postId?: string }> => {
    setIsPublishing(true);
    
    const publishData = {
      ...data,
      is_public: true,
      published_at: data.published_at || new Date().toISOString(),
    };
    
    try {
      const result = await savePost(publishData);
      
      if (result.success && result.postId) {
        // Navigate to the published post
        const tenantSlug = currentTenant?.is_personal ? 'personal' : currentTenant?.tenant_slug;
        if (tenantSlug) {
          router.push(`/posts/${result.postId}`);
        }
      }
      
      return result;
    } finally {
      setIsPublishing(false);
    }
  }, [savePost, currentTenant, router]);

  return {
    // Form state
    formData,
    setFormData,
    
    // Current context
    currentTenant: currentTenant ? {
      id: currentTenant.tenant_id,
      name: currentTenant.tenant_name,
      type: currentTenant.is_personal ? 'personal' : 'collective',
    } : null,
    
    // Actions
    savePost,
    saveDraft,
    publishPost,
    
    // States
    isSaving,
    isPublishing,
    error,
    
    // Validation
    validateForm,
  };
} 