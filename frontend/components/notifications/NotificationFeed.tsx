"use client";

import NotificationCard from "./NotificationCard";
import NotificationEmpty from "./NotificationEmpty";
import { NotificationItem } from "@/types/notification";

interface NotificationFeedProps {
  notifications: NotificationItem[];
}

export default function NotificationFeed({
  notifications,
}: NotificationFeedProps) {
  if (!notifications.length) {
    return <NotificationEmpty />;
  }

  const groups = {
    Today: notifications.filter((n) => n.group === "Today"),
    Yesterday: notifications.filter((n) => n.group === "Yesterday"),
    Earlier: notifications.filter(
      (n) =>
        n.group !== "Today" &&
        n.group !== "Yesterday"
    ),
  };

  return (
    <div className="space-y-10">
      {Object.entries(groups).map(([title, items]) => {
        if (!items.length) return null;

        return (
          <section key={title}>
            {/* Group Heading */}

            <div className="mb-4 flex items-center gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--text-tertiary)]">
                {title}
              </h2>

              <div className="h-px flex-1 bg-[var(--border-subtle)]" />
            </div>

            {/* Notifications */}

            <div className="space-y-4">
              {items.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}