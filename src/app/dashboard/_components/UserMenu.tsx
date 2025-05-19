export interface UserMenuProps {
  user: { email?: string; avatar_url?: string; full_name?: string } | null;
  onSignOut?: () => void;
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  // ... existing code ...
}
