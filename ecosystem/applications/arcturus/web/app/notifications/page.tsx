import NotificationHeader from "@/components/notifications/NotificationHeader";
import NotificationFeed from "@/components/notifications/NotificationFeed";
import { notifications } from "@/data/notification";

export default function NotificationsPage() {
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