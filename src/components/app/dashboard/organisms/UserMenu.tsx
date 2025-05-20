export interface UserMenuProps {
  user: { email?: string; avatar_url?: string; full_name?: string } | null;
  onSignOut?: () => void;
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  if (!user) return null;
  return (
    <button onClick={onSignOut} className="text-sm">
      {user.full_name || user.email || "User"}
    </button>
  );
}
