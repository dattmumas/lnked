'use client';

import { useEffect } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useTenantStore } from '@/stores/tenant-store';

// This component centralises the logic for handling Supabase auth state changes.
// It listens for SIGNED_OUT events and ensures that any
// persisted tenant state from a previous session is properly cleared.
export function AuthChangeListener() {
  const clearTenantState = useTenantStore((state) => state.actions.clear);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        void clearTenantState();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [clearTenantState]);

  return null;
}
