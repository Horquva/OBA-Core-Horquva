import React, { useState } from "react";
import { Bell, UserCircle2, ChevronRight, LogOut } from "lucide-react";
import { useAltair } from "../../context/AltairContext";
import { useAuth } from "../../context/AuthContext";
import { breadcrumbFor } from "../../navigation/breadcrumbs";
import { timeAgo } from "../../utils/datetime";

export function TopBar({ route, navigate }) {
  const { notifications } = useAltair();
  const { user, logout } = useAuth();
  const unread = notifications.filter((n) => !n.read);
  const [open, setOpen] = useState(false);
  const crumbs = breadcrumbFor(route);

  return (
    <header className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <span key={i} className="crumb">
            {i > 0 && <ChevronRight size={13} className="crumb-sep" />}
            {c.to ? (
              <button onClick={() => navigate(c.to.view, c.to.id)}>{c.label}</button>
            ) : (
              <span className="crumb-current">{c.label}</span>
            )}
          </span>
        ))}
      </div>
      <div className="topbar-actions">
        <div className="actor-chip" title={`${user?.role || "user"} · ${user?.email || ""}`}>
          <UserCircle2 size={16} />
          {user?.name || user?.email}
        </div>
        <button className="icon-btn" onClick={logout} aria-label="Sign out" title="Sign out">
          <LogOut size={17} />
        </button>
        <div className="bell-wrap">
          <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label={`Notifications (${unread.length} unread)`}>
            <Bell size={17} />
            {unread.length > 0 && <span className="bell-dot">{unread.length}</span>}
          </button>
          {open && (
            <div className="bell-menu" role="dialog" aria-label="Recent notifications">
              <div className="bell-menu-head">
                <span>Notifications</span>
                <button onClick={() => navigate("notifications")}>View all</button>
              </div>
              {notifications.slice(0, 5).map((n) => (
                <button
                  key={n.id}
                  className={`bell-item ${n.read ? "" : "unread"}`}
                  onClick={() => {
                    setOpen(false);
                    navigate(n.link.view, n.link.id);
                  }}
                >
                  <span className="bell-item-title">{n.title}</span>
                  <span className="bell-item-msg">{n.message}</span>
                  <span className="bell-item-time">{timeAgo(n.at)}</span>
                </button>
              ))}
              {notifications.length === 0 && <div className="bell-empty">No notifications yet.</div>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
