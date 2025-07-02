import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import { useUser } from '@/hooks/useUser';
import { draftService } from '@/lib/services/draft-service';
import { type PostEditorFormData } from '@/lib/stores/post-editor-v2-store';
import { fastHash } from '@/lib/utils/hash';

interface UseEnhancedAutosaveOptions {
  formData: PostEditorFormData;
  debounceMs?: number;
  enableOffline?: boolean;
}

interface UseEnhancedAutosaveReturn {
  triggerSave: () => void;
  status: 'idle' | 'saving' | 'saved' | 'error' | 'offline';
  lastSavedAt: Date | null;
  isOffline: boolean;
}

const DEFAULT_DEBOUNCE_MS = 300;

export function useEnhancedAutosave({
  formData,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  enableOffline: _enableOffline = true,
}: UseEnhancedAutosaveOptions): UseEnhancedAutosaveReturn {
  const { user } = useUser();
  const [status, setStatus] =
    useState<UseEnhancedAutosaveReturn['status']>('idle');
  const [lastSavedAt, setLastSaved] = useState<Date | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastSavedContentRef = useRef<string>('');

  // Compute a stable key hash of canonical JSON plus title / subtitle
  const contentKey = useMemo(() => {
    const jsonStr = JSON.stringify(formData.contentJson ?? {});
    return fastHash(
      `${formData.title || ''}_${formData.subtitle || ''}_${jsonStr}`,
    );
  }, [formData.title, formData.subtitle, formData.contentJson]);

  useEffect(() => {
    const handleOnline = (): void => {
      setIsOffline(false);
    };
    const handleOffline = (): void => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Debounced save function – always persist locally first
  const debouncedSave = useCallback(() => {
    if (!formData.id || !user?.id) {
      console.warn('Cannot save: missing required data');
      return;
    }

    // Skip if content unchanged
    if (contentKey === lastSavedContentRef.current) {
      return;
    }

    lastSavedContentRef.current = contentKey;

    // 1️⃣  Persist to IndexedDB so a fast refresh immediately restores the content
    draftService
      .saveDraftLocal(formData.id, user.id, user.id, formData)
      .catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to save draft locally', err);
        }
        lastSavedContentRef.current = '';
      })
      .finally(() => {
        // 2️⃣  If offline, we are done – show Saved state
        if (!navigator.onLine) {
          setStatus('saved');
          return;
        }

        // 3️⃣  Otherwise also sync to Supabase
        setStatus('saving');
        draftService
          .syncDraftToServer(formData.id as string)
          .then(({ success }) => {
            setStatus(success ? 'saved' : 'error');
            if (success) setLastSaved(new Date());
          });
      });
  }, [contentKey, formData, user?.id]);

  // Trigger save with debounce
  const triggerSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(debouncedSave, debounceMs);
  }, [debouncedSave, debounceMs]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { triggerSave, status, lastSavedAt, isOffline };
}
