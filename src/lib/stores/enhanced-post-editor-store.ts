import { create } from 'zustand';
import { 
  EnhancedPostFormData,
  CollectiveSharingSettings 
} from '@/types/enhanced-database.types';

// Enhanced PostFormData interface with multi-collective support
export interface EnhancedPostEditorFormData extends Omit<EnhancedPostFormData, 'metadata'> {
  // Type-safe metadata field
  metadata: Record<string, unknown>;
}

// Store interface for enhanced post editor
interface EnhancedPostEditorStore {
  // Form data
  formData: EnhancedPostEditorFormData;
  originalData: EnhancedPostEditorFormData | null;

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
  updateFormData: (_updates: Partial<EnhancedPostEditorFormData>) => void;
  setCurrentPage: (_page: 'editor' | 'details') => void;
  markClean: () => void;
  markSaving: () => void;
  markSaved: () => void;
  markError: () => void;
  resetForm: () => void;
  initializeForm: (_data: EnhancedPostEditorFormData) => void;
  setLoading: (_loading: boolean) => void;

  // Multi-collective actions
  setCollectiveSelectionOpen: (_open: boolean) => void;
  addCollective: (_collectiveId: string, _settings?: CollectiveSharingSettings) => void;
  removeCollective: (_collectiveId: string) => void;
  updateCollectiveSharingSettings: (_collectiveId: string, _settings: Partial<CollectiveSharingSettings>) => void;
  setSelectedCollectives: (_collectiveIds: string[]) => void;
  clearCollectiveSelections: () => void;

  // Backward compatibility helpers
  getLegacyCollectiveId: () => string | undefined;
  setLegacyCollectiveId: (_collectiveId: string | undefined) => void;
  migrateFromLegacyData: (_legacyData: EnhancedPostEditorFormData) => void;
}

// Default form data with multi-collective support
const defaultEnhancedFormData: EnhancedPostEditorFormData = {
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
  
  // Legacy field for backward compatibility
  collective_id: undefined,
  
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

// Create the enhanced store
export const useEnhancedPostEditorStore = create<EnhancedPostEditorStore>((set, get) => ({
  // Initial state
  formData: defaultEnhancedFormData,
  originalData: null,
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
      formData: _state.originalData ?? defaultEnhancedFormData,
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

      const newSelectedCollectives = [...state.selectedCollectives, collectiveId];
      const newSharingSettings = {
        ...state.collectiveSharingSettings,
        [collectiveId]: { ...defaultSharingSettings, ...settings }
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
      const newSelectedCollectives = state.selectedCollectives.filter(id => id !== collectiveId);
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

      const newSharingSettings = {
        ...state.collectiveSharingSettings,
        [collectiveId]: {
          ...state.collectiveSharingSettings[collectiveId],
          ...settings
        }
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
      collectiveIds.forEach(id => {
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
        collective_id:
          collectiveId !== undefined && collectiveId !== '' ? collectiveId : undefined,
      },
      isDirty: true,
    })),

  migrateFromLegacyData: (legacyData: EnhancedPostEditorFormData) =>
    set(() => {
      // Convert legacy single collective_id to multi-collective format
      const selectedCollectives =
        legacyData.collective_id !== undefined && legacyData.collective_id !== ''
          ? [legacyData.collective_id]
          : [];

      const collectiveSharingSettings =
        legacyData.collective_id !== undefined && legacyData.collective_id !== ''
          ? {
              [legacyData.collective_id]: defaultSharingSettings,
            }
          : {};

      const enhancedData: EnhancedPostEditorFormData = {
        ...legacyData,
        selected_collectives: selectedCollectives,
        collective_sharing_settings: collectiveSharingSettings,
        metadata: legacyData.metadata ?? {},
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
  const store = useEnhancedPostEditorStore();
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
  formData: EnhancedPostEditorFormData;
  originalData: EnhancedPostEditorFormData | null;
  isDirty: boolean;
  isLoading: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  updateFormData: EnhancedPostEditorStore['updateFormData'];
  resetForm: () => void;
  initializeForm: (_data: EnhancedPostEditorFormData) => void;
} => {
  const store = useEnhancedPostEditorStore();
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
  const store = useEnhancedPostEditorStore();
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