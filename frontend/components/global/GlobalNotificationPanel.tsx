"use client";

import { X } from "lucide-react";
import { useGlobalPanels } from "./GlobalPanelsContext";
import NotificationFeed from "../notifications/NotificationFeed";
import { useLiveNotifications } from "@/lib/notifications";
import clsx from "clsx";

export default function GlobalNotificationPanel() {
  const { isNotificationPanelOpen, toggleNotificationPanel } = useGlobalPanels();
  const { notifications } = useLiveNotifications();

  return (
    <>
      {/* Backdrop */}
      {isNotificationPanelOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={toggleNotificationPanel}
        />
      )}
      
      {/* Panel */}
      <div 
        className={clsx(
          "fixed top-0 bottom-0 right-0 z-50 w-full max-w-[480px] shadow-2xl transition-transform duration-300 transform bg-[#0d0d1a] border-l border-white/10",
          isNotificationPanelOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-16 items-center border-b border-white/10 px-6 justify-between">
          <h2 className="text-xl font-semibold text-white tracking-wide">
            Notification Center
          </h2>
          <button 
            onClick={toggleNotificationPanel}
            className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="h-[calc(100vh-4rem)] overflow-y-auto px-6 py-8">
          <NotificationFeed notifications={notifications} />
        </div>
      </div>
    </>
  );
}
