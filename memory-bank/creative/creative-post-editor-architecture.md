# 🏗️ CREATIVE PHASE: ARCHITECTURE DESIGN - MULTI-PAGE POST EDITOR

**Component**: Technical Architecture for Multi-Page Post Editor
**Date**: 2025-06-01
**Status**: ✅ COMPLETE
**Selected Option**: Zustand + React Query Pattern

## 📋 ARCHITECTURE CHALLENGE

Design a robust technical architecture to support the full-page focused workflow, ensuring seamless state preservation, efficient data persistence, and optimal user experience across page transitions.

**Technical Requirements:**

- Seamless state preservation across page transitions
- Auto-save functionality with conflict resolution
- Efficient data persistence to Supabase
- Clean routing structure with proper URL management
- Component state synchronization between editor and settings

**Constraints:**

- Next.js 15 App Router architecture
- React Hook Form + Zod validation ecosystem
- Supabase PostgreSQL backend with RLS
- Lexical editor integration requirements
- Performance: < 200ms page transitions, < 500ms auto-save

## 🧩 COMPONENT ANALYSIS

### Core Components & Responsibilities

**1. PostEditorFlow (Orchestrator)**

- Role: Manages overall multi-page flow state
- Responsibilities: Route coordination, state persistence, navigation logic

**2. EditorPage Component**

- Role: Pure content creation interface
- Responsibilities: Lexical editor integration, auto-save triggers, navigation guards

**3. DetailsPage Component**

- Role: Post configuration and publishing interface
- Responsibilities: Form management, thumbnail handling, publishing logic

**4. PostStateManager (Hook/Context)**

- Role: Centralized state management
- Responsibilities: Form state, persistence, conflict resolution, validation

**5. AutoSaveService**

- Role: Background data persistence
- Responsibilities: Debounced saves, conflict detection, offline support

## 🏗️ ARCHITECTURE OPTIONS ANALYSIS

### Option 1: Context + Local Storage Pattern

**Description**: React Context for state management with localStorage backup and Supabase sync
**Pros**: Simple React patterns, immediate localStorage backup, clear separation
**Cons**: Context re-renders, limited scalability, manual synchronization, race conditions
**Technical Fit**: High | **Complexity**: Low | **Scalability**: Medium

### Option 2: Zustand + React Query Pattern ⭐ **SELECTED**

**Description**: Zustand for client state management with React Query for server state synchronization
**Pros**: Excellent performance, built-in server state, automatic caching, great DX, offline support
**Cons**: Additional dependencies, learning curve, more complex setup
**Technical Fit**: High | **Complexity**: Medium | **Scalability**: High

### Option 3: Server Components + Form Actions Pattern

**Description**: Leverage Next.js 15 Server Components with Server Actions for state management
**Pros**: Modern Next.js patterns, excellent SEO, progressive enhancement, simplified state
**Cons**: Limited client state, server round-trips, complex preservation, less interactive
**Technical Fit**: Medium | **Complexity**: Medium | **Scalability**: Medium

### Option 4: URL-Based State with Search Params

**Description**: Store editor state in URL search parameters for stateless navigation
**Pros**: Stateless navigation, shareable URLs, natural browser behavior, easy debugging
**Cons**: URL length limitations, exposed data, complex encoding, poor UX, compatibility issues
**Technical Fit**: Low | **Complexity**: High | **Scalability**: Low

## ✅ DECISION RATIONALE

**Selected: Zustand + React Query Pattern**

Key justifications:

1. **Performance Excellence**: Minimal re-renders with Zustand's selective subscriptions
2. **Server State Management**: React Query handles caching, background sync, and error states elegantly
3. **Scalability**: Architecture supports future enhancements (collaborative editing, version history)
4. **Developer Experience**: Excellent devtools and debugging capabilities
5. **Modern Patterns**: Aligns with current React ecosystem best practices

## 🏗️ IMPLEMENTATION ARCHITECTURE

### State Management Layer

```typescript
interface PostEditorStore {
  // Form data
  formData: PostFormData;
  originalData: PostFormData | null;

  // UI state
  currentPage: 'editor' | 'details';
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isDirty: boolean;

  // Actions
  updateFormData: (updates: Partial<PostFormData>) => void;
  setCurrentPage: (page: 'editor' | 'details') => void;
  markClean: () => void;
  resetForm: () => void;
}

const usePostEditorStore = create<PostEditorStore>((set, get) => ({
  formData: {},
  originalData: null,
  currentPage: 'editor',
  autoSaveStatus: 'idle',
  isDirty: false,

  updateFormData: (updates) =>
    set((state) => ({
      formData: { ...state.formData, ...updates },
      isDirty: true,
    })),

  setCurrentPage: (page) => set({ currentPage: page }),
  markClean: () => set({ isDirty: false }),
  resetForm: () =>
    set((state) => ({
      formData: state.originalData || {},
      isDirty: false,
    })),
}));
```

### Server State Integration

```typescript
// Auto-save mutation with React Query
const useAutoSavePost = (postId?: string) => {
  return useMutation({
    mutationFn: async (data: PostFormData) => {
      const { data: post, error } = await supabase
        .from('posts')
        .upsert({ id: postId, ...data })
        .select()
        .single();

      if (error) throw error;
      return post;
    },
    onSuccess: () => {
      usePostEditorStore.getState().markClean();
    },
    onError: (error) => {
      console.error('Auto-save failed:', error);
    },
  });
};

// Load existing post data
const usePostData = (postId?: string) => {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      if (!postId) return null;

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!postId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
```

### Custom Hook Integration

```typescript
const usePostEditor = (postId?: string) => {
  const store = usePostEditorStore();
  const autoSave = useAutoSavePost(postId);
  const { data: postData } = usePostData(postId);

  // Initialize form data from server
  useEffect(() => {
    if (postData && !store.originalData) {
      store.updateFormData(postData);
      store.markClean();
      usePostEditorStore.setState({ originalData: postData });
    }
  }, [postData]);

  // Auto-save when dirty with 500ms debounce
  useEffect(() => {
    if (store.isDirty && store.formData) {
      const timer = setTimeout(() => {
        autoSave.mutate(store.formData);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [store.formData, store.isDirty]);

  return {
    formData: store.formData,
    updateFormData: store.updateFormData,
    autoSaveStatus: autoSave.isPending
      ? 'saving'
      : autoSave.isSuccess
        ? 'saved'
        : autoSave.isError
          ? 'error'
          : 'idle',
    isDirty: store.isDirty,
    currentPage: store.currentPage,
    setCurrentPage: store.setCurrentPage,
  };
};
```

### Routing Architecture

**File Structure:**

```
app/posts/
├── new/
│   ├── page.tsx          # Editor page
│   └── details/
│       └── page.tsx      # Details page
└── [slug]/edit/
    ├── page.tsx          # Editor page
    └── details/
        └── page.tsx      # Details page
```

**Navigation Guards:**

```typescript
const useNavigationGuard = () => {
  const { isDirty } = usePostEditor();
  const router = useRouter();

  const navigateWithConfirmation = useCallback(
    (path: string) => {
      if (isDirty) {
        const confirmed = window.confirm(
          'You have unsaved changes. Do you want to continue?',
        );
        if (!confirmed) return;
      }
      router.push(path);
    },
    [isDirty, router],
  );

  return { navigateWithConfirmation };
};
```

### Data Persistence Strategy

**Multi-Layer Persistence:**

1. **Layer 1**: Immediate Zustand store (memory)
2. **Layer 2**: Debounced auto-save to Supabase (500ms)
3. **Layer 3**: Manual save triggers (page navigation, explicit save)

**Conflict Resolution:**

```typescript
const useConflictResolution = () => {
  const store = usePostEditorStore();

  const handleConflict = (
    serverData: PostFormData,
    localData: PostFormData,
  ) => {
    // For MVP: Last-write-wins with user notification
    const shouldUseServerData = window.confirm(
      'Your post was updated elsewhere. Use server version?',
    );

    if (shouldUseServerData) {
      store.updateFormData(serverData);
      store.markClean();
    }
  };

  return { handleConflict };
};
```

## 📊 ARCHITECTURE VERIFICATION

### Requirements Validation

- [x] **Seamless State Preservation**: Zustand store persists across navigation
- [x] **Auto-save Functionality**: 500ms debounced saves with React Query
- [x] **Efficient Data Persistence**: Optimized Supabase queries with caching
- [x] **Clean Routing Structure**: App Router with logical URL patterns
- [x] **Component Synchronization**: Shared store state across editor/details

### Performance Characteristics

- **Page Transitions**: < 200ms (client-side navigation with preserved state)
- **Auto-save Operations**: < 500ms (debounced with optimistic updates)
- **Bundle Size Impact**: +15KB (Zustand 2KB + React Query 13KB)
- **Memory Usage**: Minimal (single store instance with selective subscriptions)

### Scalability Considerations

- **Collaborative Editing**: Store architecture supports real-time updates
- **Version History**: React Query cache can track document versions
- **Offline Support**: React Query handles network failures gracefully
- **Complex Forms**: Zustand handles nested state updates efficiently

## 🔧 IMPLEMENTATION CONSIDERATIONS

### Dependencies Required

```json
{
  "zustand": "^4.4.7",
  "@tanstack/react-query": "^5.0.0",
  "use-debounced-callback": "^4.0.1"
}
```

### Migration Strategy

1. **Phase 1**: Install dependencies and create store structure
2. **Phase 2**: Implement auto-save mutations and queries
3. **Phase 3**: Integrate with existing form components
4. **Phase 4**: Add navigation guards and conflict resolution

### Testing Strategy

- **Unit Tests**: Zustand store actions and state transitions
- **Integration Tests**: React Query mutations with mock Supabase
- **E2E Tests**: Full workflow with auto-save and navigation
- **Performance Tests**: Store subscription efficiency and memory usage

**Status**: ✅ ARCHITECTURE DESIGN COMPLETE - READY FOR IMPLEMENTATION
