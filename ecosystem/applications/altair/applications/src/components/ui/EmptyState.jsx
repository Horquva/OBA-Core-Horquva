import React from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ icon: Icon = Inbox, title, body, action }) {
  return (
    <div className="empty-state">
      <Icon size={26} />
      <h4>{title}</h4>
      <p>{body}</p>
      {action}
    </div>
  );
}
