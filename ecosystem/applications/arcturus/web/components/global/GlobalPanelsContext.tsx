"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface GlobalPanelsContextType {
  isNotificationPanelOpen: boolean;
  isAvatarPanelOpen: boolean;
  isSearchOpen: boolean;
  toggleNotificationPanel: () => void;
  toggleAvatarPanel: () => void;
  toggleSearch: () => void;
  closeAllPanels: () => void;
}

const GlobalPanelsContext = createContext<GlobalPanelsContextType | undefined>(undefined);

export function GlobalPanelsProvider({ children }: { children: ReactNode }) {
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isAvatarPanelOpen, setIsAvatarPanelOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleNotificationPanel = () => {
    setIsNotificationPanelOpen((prev) => !prev);
    setIsAvatarPanelOpen(false); // Close other panel
    setIsSearchOpen(false);
  };

  const toggleAvatarPanel = () => {
    setIsAvatarPanelOpen((prev) => !prev);
    setIsNotificationPanelOpen(false); // Close other panel
    setIsSearchOpen(false);
  };

  const toggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
    setIsNotificationPanelOpen(false);
    setIsAvatarPanelOpen(false);
  };

  const closeAllPanels = () => {
    setIsNotificationPanelOpen(false);
    setIsAvatarPanelOpen(false);
    setIsSearchOpen(false);
  };

  return (
    <GlobalPanelsContext.Provider
      value={{
        isNotificationPanelOpen,
        isAvatarPanelOpen,
        isSearchOpen,
        toggleNotificationPanel,
        toggleAvatarPanel,
        toggleSearch,
        closeAllPanels,
      }}
    >
      {children}
    </GlobalPanelsContext.Provider>
  );
}

export function useGlobalPanels() {
  const context = useContext(GlobalPanelsContext);
  if (context === undefined) {
    throw new Error("useGlobalPanels must be used within a GlobalPanelsProvider");
  }
  return context;
}
