import { redirect } from 'next/navigation';

export default function SettingsPage() {
  // Redirect to user settings by default
  redirect('/settings/user');
}
