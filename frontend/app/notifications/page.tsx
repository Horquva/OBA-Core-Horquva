"use client";

import NotificationHeader from "@/components/notifications/NotificationHeader";
import NotificationFeed from "@/components/notifications/NotificationFeed";
import { useLiveNotifications } from "@/lib/notifications";

export default function NotificationsPage() {
  const { notifications } = useLiveNotifications();

  return (
    <main className="space-y-6">

      <NotificationHeader
        total={notifications.length}
      />

      <NotificationFeed
        notifications={notifications}
      />

    </main>
  );
}
