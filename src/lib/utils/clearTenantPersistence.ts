'use client';

// Clears any persisted tenant selection across localStorage and sessionStorage.
// Invoke on sign-out and on Supabase auth state change (SIGNED_OUT).
export function clearTenantPersistence(): void {
  try {
    // Clear current Zustand store in sessionStorage
    sessionStorage.removeItem('lnked.active-tenant');
    sessionStorage.removeItem('lnked.active-tenant-id');
  } catch {
    /* sessionStorage may be unavailable in SSR */
  }

  try {
    // Clear legacy localStorage keys that might interfere
    localStorage.removeItem('lnked.active-tenant-id');
    localStorage.removeItem('lnked.active-tenant');
  } catch {
    /* localStorage may be unavailable in SSR */
  }
}
