"use client";

import { X } from "lucide-react";
import { useGlobalPanels } from "./GlobalPanelsContext";
import AvatarChatPanel from "../avatar/AvatarChatPanel";
import clsx from "clsx";

export default function GlobalAvatarPanel() {
  const { isAvatarPanelOpen, toggleAvatarPanel } = useGlobalPanels();

  return (
    <>
      {/* Backdrop */}
      {isAvatarPanelOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={toggleAvatarPanel}
        />
      )}
      
      {/* Panel */}
      <div 
        className={clsx(
          "fixed top-0 bottom-0 right-0 z-50 w-full max-w-lg shadow-2xl transition-transform duration-300 transform bg-[#0d0d1a] border-l border-white/10",
          isAvatarPanelOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <button 
          onClick={toggleAvatarPanel}
          className="absolute top-4 right-6 z-10 rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="h-full pt-12 overflow-y-auto w-full">
          {/* Reuse the chat panel, style it appropriately */}
          <div className="h-full flex flex-col scale-95 transform origin-top w-full mx-auto max-w-md">
            <AvatarChatPanel />
          </div>
        </div>
      </div>
    </>
  );
}
