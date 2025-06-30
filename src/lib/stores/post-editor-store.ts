import { create } from 'zustand';

import { Database } from '@/lib/database.types';

// Enhanced PostFormData interface with new schema fields
export interface PostFormData {
  id?: string;
  title: string;
  content: string;
  subtitle?: string;
  author?: string;
  seo_title?: string;
  meta_description?: string;
  thumbnail_url?: string;
  post_type: Database['public']['Enums']['post_type_enum'];
  metadata: Record<string, unknown>;
  is_public: boolean;
  status: 'draft' | 'active' | 'removed';
  collective_id?: string;
  tenant_id?: string;
  published_at?: string;
}

// Store interface
interface PostEditorStore {
  // Form data
  formData: PostFormData;
  originalData: PostFormData | undefined;

  // UI state
  currentPage: 'editor' | 'details';
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isDirty: boolean;
  isLoading: boolean;

  // Actions
  updateFormData: (_updates: Partial<PostFormData>) => void;
  setCurrentPage: (_page: 'editor' | 'details') => void;
  markClean: () => void;
  markSaving: () => void;
  markSaved: () => void;
  markError: () => void;
  resetForm: () => void;
  initializeForm: (_data: PostFormData) => void;
  setLoading: (_loading: boolean) => void;
}

// Default form data
const defaultFormData: PostFormData = {
  title: '',
  content: '',
  subtitle: '',
  author: '',
  seo_title: '',
  meta_description: '',
  thumbnail_url: '',
  post_type: 'text',
  metadata: {},
  is_public: false,
  status: 'draft',
};

// Create the store
export const usePostEditorStore = create<PostEditorStore>((set) => ({
  // Initial state
  formData: defaultFormData,
  originalData: undefined,
  currentPage: 'editor',
  autoSaveStatus: 'idle',
  isDirty: false,
  isLoading: false,

  // Actions
  updateFormData: (updates) =>
    set((state) => ({
      formData: { ...state.formData, ...updates },
      isDirty: true,
    })),

  setCurrentPage: (page) => set({ currentPage: page }),

  markClean: () =>
    set({
      isDirty: false,
      autoSaveStatus: 'saved',
    }),

  markSaving: () =>
    set({
      autoSaveStatus: 'saving',
    }),

  markSaved: () =>
    set({
      autoSaveStatus: 'saved',
      isDirty: false,
    }),

  markError: () =>
    set({
      autoSaveStatus: 'error',
    }),

  resetForm: () =>
    set((state) => ({
      formData: state.originalData || defaultFormData,
      isDirty: false,
      autoSaveStatus: 'idle',
    })),

  initializeForm: (data) =>
    set({
      formData: data,
      originalData: data,
      isDirty: false,
      autoSaveStatus: 'idle',
    }),

  setLoading: (loading) =>
    set({
      isLoading: loading,
    }),
}));
