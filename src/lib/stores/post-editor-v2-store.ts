import { create } from 'zustand';

import type { Database } from '@/lib/database.types';
import type { JSONContent } from '@tiptap/core';

// Type aliases from generated database types
type PostRow = Database['public']['Tables']['posts']['Row'];
type PostInsert = Database['public']['Tables']['posts']['Insert'];
type PostCollectiveRow =
  Database['public']['Tables']['post_collectives']['Row'];
type PostCollectiveInsert =
  Database['public']['Tables']['post_collectives']['Insert'];

// Collective sharing settings for multi-collective posts
export interface CollectiveSharingSettings {
  status: 'draft' | 'published' | 'pending_approval' | 'rejected';
  metadata?: Record<string, unknown>;
  display_order?: number;
  auto_publish?: boolean;
  require_approval?: boolean;
  display_priority?: number;
}

// Collective with user permission information
export interface CollectiveWithPermission {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  user_role: Database['public']['Enums']['collective_member_role'];
  can_post: boolean;
  member_count?: number;
}

// Post form data interface using generated types
export interface PostEditorFormData {
  // Core post fields from database
  id?: string;
  title: string;
  content?: string; // legacy HTML (optional)
  subtitle?: string;
  author_id?: string;
  author?: string; // Custom author byline field
  seo_title?: string;
  meta_description?: string;
  thumbnail_url?: string;
  post_type: Database['public']['Enums']['post_type_enum'];
  metadata: Record<string, unknown>;
  is_public: boolean;
  status: Database['public']['Enums']['post_status_type'];

  // Legacy field for backward compatibility
  collective_id?: string;

  // New multi-collective fields
  selected_collectives: string[];
  collective_sharing_settings?: Record<string, CollectiveSharingSettings>;

  // Optional timestamp
  published_at?: string;

  // Canonical JSON representation of the document (new)
  contentJson?: JSONContent | null;
}

// Store interface for post editor
interface PostEditorStore {
  // Form data
  formData: PostEditorFormData;
  originalData: PostEditorFormData | undefined;

  // UI state
  currentPage: 'editor' | 'details';
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isDirty: boolean;
  isLoading: boolean;

  // Collective selection state
  collectiveSelectionOpen: boolean;
  selectedCollectives: string[];
  collectiveSharingSettings: Record<string, CollectiveSharingSettings>;

  // Actions
  updateFormData: (_updates: Partial<PostEditorFormData>) => void;
  setCurrentPage: (_page: 'editor' | 'details') => void;
  markClean: () => void;
  markSaving: () => void;
  markSaved: () => void;
  markError: () => void;
  resetForm: () => void;
  initializeForm: (_data: PostEditorFormData) => void;
  setLoading: (_loading: boolean) => void;

  // Multi-collective actions
  setCollectiveSelectionOpen: (_open: boolean) => void;
  addCollective: (
    _collectiveId: string,
    _settings?: CollectiveSharingSettings,
  ) => void;
  removeCollective: (_collectiveId: string) => void;
  updateCollectiveSharingSettings: (
    _collectiveId: string,
    _settings: Partial<CollectiveSharingSettings>,
  ) => void;
  setSelectedCollectives: (_collectiveIds: string[]) => void;
  clearCollectiveSelections: () => void;

  // Backward compatibility helpers
  getLegacyCollectiveId: () => string | undefined;
  setLegacyCollectiveId: (_collectiveId: string | undefined) => void;
  migrateFromLegacyData: (_legacyData: PostEditorFormData) => void;
}

// Default form data with multi-collective support
const defaultFormData: PostEditorFormData = {
  title: '',
  content: '',
  contentJson: null,
  post_type: 'text',
  metadata: {},
  is_public: false,
  status: 'draft',

  // New multi-collective fields
  selected_collectives: [],
  collective_sharing_settings: {},
};

// Default sharing settings
const defaultSharingSettings: CollectiveSharingSettings = {
  status: 'published',
  metadata: {},
  display_order: 0,
  auto_publish: true,
  require_approval: false,
  display_priority: 0,
};

// Create the store (renamed from enhanced to just post editor)
export const usePostEditorStore = create<PostEditorStore>((set, get) => ({
  // Initial state
  formData: defaultFormData,
  originalData: undefined,
  currentPage: 'editor',
  autoSaveStatus: 'idle',
  isDirty: false,
  isLoading: false,

  // Collective selection state
  collectiveSelectionOpen: false,
  selectedCollectives: [],
  collectiveSharingSettings: {},

  // Basic actions
  updateFormData: (updates) =>
    set((state) => ({
      formData: { ...state.formData, ...updates },
      isDirty: true,
    })),

  setCurrentPage: (_page) => set({ currentPage: _page }),

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
    set((_state) => ({
      formData: _state.originalData ?? defaultFormData,
      selectedCollectives: _state.originalData?.selected_collectives ?? [],
      collectiveSharingSettings:
        _state.originalData?.collective_sharing_settings ?? {},
      isDirty: false,
      autoSaveStatus: 'idle',
    })),

  initializeForm: (data) =>
    set({
      formData: data,
      originalData: data,
      selectedCollectives: data.selected_collectives ?? [],
      collectiveSharingSettings: data.collective_sharing_settings ?? {},
      isDirty: false,
      autoSaveStatus: 'idle',
    }),

  setLoading: (loading) =>
    set({
      isLoading: loading,
    }),

  // Multi-collective actions
  setCollectiveSelectionOpen: (open) =>
    set({
      collectiveSelectionOpen: open,
    }),

  addCollective: (collectiveId, settings = defaultSharingSettings) =>
    set((state) => {
      const alreadySelected = state.selectedCollectives.includes(collectiveId);
      if (alreadySelected) {
        return {}; // No changes needed if already selected
      }

      const newSelectedCollectives = [
        ...state.selectedCollectives,
        collectiveId,
      ];
      const newSharingSettings = {
        ...state.collectiveSharingSettings,
        [collectiveId]: { ...defaultSharingSettings, ...settings },
      };

      return {
        selectedCollectives: newSelectedCollectives,
        collectiveSharingSettings: newSharingSettings,
        formData: {
          ...state.formData,
          selected_collectives: newSelectedCollectives,
          collective_sharing_settings: newSharingSettings,
        },
        isDirty: true,
      };
    }),

  removeCollective: (collectiveId) =>
    set((state) => {
      const newSelectedCollectives = state.selectedCollectives.filter(
        (id) => id !== collectiveId,
      );
      const newSharingSettings = { ...state.collectiveSharingSettings };
      delete newSharingSettings[collectiveId];

      return {
        selectedCollectives: newSelectedCollectives,
        collectiveSharingSettings: newSharingSettings,
        formData: {
          ...state.formData,
          selected_collectives: newSelectedCollectives,
          collective_sharing_settings: newSharingSettings,
        },
        isDirty: true,
      };
    }),

  updateCollectiveSharingSettings: (collectiveId, settings) =>
    set((state) => {
      const isSelected = state.selectedCollectives.includes(collectiveId);
      if (!isSelected) {
        return {}; // No changes required
      }

      const currentSettings =
        state.collectiveSharingSettings[collectiveId] ?? defaultSharingSettings;
      const updatedSettings: CollectiveSharingSettings = {
        status: settings.status ?? currentSettings.status,
        ...(settings.metadata !== undefined
          ? { metadata: settings.metadata }
          : currentSettings.metadata !== undefined
            ? { metadata: currentSettings.metadata }
            : {}),
        ...(settings.display_order !== undefined
          ? { display_order: settings.display_order }
          : currentSettings.display_order !== undefined
            ? { display_order: currentSettings.display_order }
            : {}),
        ...(settings.auto_publish !== undefined
          ? { auto_publish: settings.auto_publish }
          : currentSettings.auto_publish !== undefined
            ? { auto_publish: currentSettings.auto_publish }
            : {}),
        ...(settings.require_approval !== undefined
          ? { require_approval: settings.require_approval }
          : currentSettings.require_approval !== undefined
            ? { require_approval: currentSettings.require_approval }
            : {}),
        ...(settings.display_priority !== undefined
          ? { display_priority: settings.display_priority }
          : currentSettings.display_priority !== undefined
            ? { display_priority: currentSettings.display_priority }
            : {}),
      };

      const newSharingSettings = {
        ...state.collectiveSharingSettings,
        [collectiveId]: updatedSettings,
      };

      return {
        collectiveSharingSettings: newSharingSettings,
        formData: {
          ...state.formData,
          collective_sharing_settings: newSharingSettings,
        },
        isDirty: true,
      };
    }),

  setSelectedCollectives: (collectiveIds) =>
    set((state) => {
      // Preserve existing sharing settings for retained collectives
      const newSharingSettings: Record<string, CollectiveSharingSettings> = {};
      collectiveIds.forEach((id) => {
        newSharingSettings[id] =
          state.collectiveSharingSettings[id] ?? defaultSharingSettings;
      });

      return {
        selectedCollectives: collectiveIds,
        collectiveSharingSettings: newSharingSettings,
        formData: {
          ...state.formData,
          selected_collectives: collectiveIds,
          collective_sharing_settings: newSharingSettings,
        },
        isDirty: true,
      };
    }),

  clearCollectiveSelections: () =>
    set((_state) => ({
      selectedCollectives: [],
      collectiveSharingSettings: {},
      formData: {
        ..._state.formData,
        selected_collectives: [],
        collective_sharing_settings: {},
      },
      isDirty: true,
    })),

  // Backward compatibility helpers
  getLegacyCollectiveId: () => {
    const current = get();
    return current.formData.collective_id;
  },

  setLegacyCollectiveId: (collectiveId) =>
    set((state) => ({
      formData: {
        ...state.formData,
        ...(collectiveId !== undefined && collectiveId !== ''
          ? { collective_id: collectiveId }
          : {}),
      },
      isDirty: true,
    })),

  migrateFromLegacyData: (legacyData: PostEditorFormData) =>
    set(() => {
      // Convert legacy single collective_id to multi-collective format
      const selectedCollectives =
        legacyData.collective_id !== undefined &&
        legacyData.collective_id !== ''
          ? [legacyData.collective_id]
          : [];

      const collectiveSharingSettings =
        legacyData.collective_id !== undefined &&
        legacyData.collective_id !== ''
          ? {
              [legacyData.collective_id]: defaultSharingSettings,
            }
          : {};

      const enhancedData: PostEditorFormData = {
        ...legacyData,
        selected_collectives: selectedCollectives,
        collective_sharing_settings: collectiveSharingSettings,
        metadata: legacyData.metadata ?? {},
        contentJson: legacyData.content ? null : null,
      };

      return {
        formData: enhancedData,
        originalData: enhancedData,
        selectedCollectives,
        collectiveSharingSettings,
        isDirty: false,
        autoSaveStatus: 'idle' as const,
      };
    }),
}));

// Helper hooks for easier access to specific store slices
export const useCollectiveSelection = (): {
  selectedCollectives: string[];
  collectiveSharingSettings: Record<string, CollectiveSharingSettings>;
  isOpen: boolean;
  setOpen: (_open: boolean) => void;
  addCollective: (_id: string, _s?: CollectiveSharingSettings) => void;
  removeCollective: (_id: string) => void;
  updateSettings: (_id: string, _s: Partial<CollectiveSharingSettings>) => void;
  setSelected: (_ids: string[]) => void;
  clear: () => void;
} => {
  const store = usePostEditorStore();
  return {
    selectedCollectives: store.selectedCollectives,
    collectiveSharingSettings: store.collectiveSharingSettings,
    isOpen: store.collectiveSelectionOpen,
    setOpen: store.setCollectiveSelectionOpen,
    addCollective: store.addCollective,
    removeCollective: store.removeCollective,
    updateSettings: store.updateCollectiveSharingSettings,
    setSelected: store.setSelectedCollectives,
    clear: store.clearCollectiveSelections,
  };
};

export const usePostFormData = (): {
  formData: PostEditorFormData;
  originalData: PostEditorFormData | undefined;
  isDirty: boolean;
  isLoading: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  updateFormData: PostEditorStore['updateFormData'];
  resetForm: () => void;
  initializeForm: (_data: PostEditorFormData) => void;
} => {
  const store = usePostEditorStore();
  return {
    formData: store.formData,
    originalData: store.originalData,
    isDirty: store.isDirty,
    isLoading: store.isLoading,
    autoSaveStatus: store.autoSaveStatus,
    updateFormData: store.updateFormData,
    resetForm: store.resetForm,
    initializeForm: store.initializeForm,
  };
};

export const usePostEditor = (): {
  currentPage: 'editor' | 'details';
  setCurrentPage: (_p: 'editor' | 'details') => void;
  markClean: () => void;
  markSaving: () => void;
  markSaved: () => void;
  markError: () => void;
  setLoading: (_l: boolean) => void;
} => {
  const store = usePostEditorStore();
  return {
    currentPage: store.currentPage,
    setCurrentPage: store.setCurrentPage,
    markClean: store.markClean,
    markSaving: store.markSaving,
    markSaved: store.markSaved,
    markError: store.markError,
    setLoading: store.setLoading,
  };
};

// Backward compatibility export
export { usePostEditorStore as useEnhancedPostEditorStore };
