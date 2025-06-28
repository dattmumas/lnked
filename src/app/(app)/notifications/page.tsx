import { Bell } from 'lucide-react';
import { redirect } from 'next/navigation';
import React, { Suspense } from 'react';

import { NotificationList } from '@/components/notifications/NotificationList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationService } from '@/lib/notifications/service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

async function NotificationsContent(): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/sign-in');
  }

  // Create server-side notification service instance
  const notificationService = new NotificationService();

  // Fetch initial notifications
  const initialData = await notificationService.getNotifications({
    limit: 20,
    offset: 0,
  });

  return (
    <NotificationList
      initialNotifications={initialData.notifications}
      initialUnreadCount={initialData.unread_count}
      className="h-[calc(100vh-12rem)]"
    />
  );
}

function NotificationsLoading(): React.ReactElement {
  return (
    <Card className="h-[calc(100vh-12rem)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-4 rounded-lg border animate-pulse"
            >
              <div className="w-8 h-8 bg-muted rounded-full" />
              <div className="w-8 h-8 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function NotificationsPage(): React.ReactElement {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Stay up to date with your latest activity and interactions.
        </p>
      </div>

      <Card>
        <Suspense fallback={<NotificationsLoading />}>
          <NotificationsContent />
        </Suspense>
      </Card>
    </div>
  );
}

export const metadata = {
  title: 'Notifications',
  description: 'View and manage your notifications',
};
