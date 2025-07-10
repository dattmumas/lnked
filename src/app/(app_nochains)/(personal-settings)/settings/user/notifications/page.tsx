import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';

export default function NotificationSettingsPage() {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-muted-foreground">
          Control how and when you receive notifications.
        </p>
      </header>

      <NotificationPreferences />
    </>
  );
}
