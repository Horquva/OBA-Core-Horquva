"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface GlobalPanelsContextType {
  isNotificationPanelOpen: boolean;
  isSearchOpen: boolean;
  toggleNotificationPanel: () => void;
  toggleSearch: () => void;
  openSearch: () => void;
  closeAllPanels: () => void;
}

const GlobalPanelsContext = createContext<GlobalPanelsContextType | undefined>(undefined);

export function GlobalPanelsProvider({ children }: { children: ReactNode }) {
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleNotificationPanel = () => {
    setIsNotificationPanelOpen((prev) => !prev);
    setIsSearchOpen(false);
  };

  const toggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
    setIsNotificationPanelOpen(false);
  };

  const openSearch = () => {
    setIsSearchOpen(true);
    setIsNotificationPanelOpen(false);
  };

  const closeAllPanels = () => {
    setIsNotificationPanelOpen(false);
    setIsSearchOpen(false);
  };

  return (
    <GlobalPanelsContext.Provider
      value={{
        isNotificationPanelOpen,
        isSearchOpen,
        toggleNotificationPanel,
        toggleSearch,
        openSearch,
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
