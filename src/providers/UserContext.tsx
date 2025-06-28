'use client';

import React, { createContext, useContext, useMemo } from 'react';

import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface UserContextValue {
  user: User | null;
  profile: UserProfile | null;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({
  user,
  profile,
  children,
}: UserContextValue & { children: React.ReactNode }): React.ReactElement {
  const value = useMemo(
    () => ({ user, profile }),
    [user, profile], // recalculates only when these change
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (ctx === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return ctx;
}
