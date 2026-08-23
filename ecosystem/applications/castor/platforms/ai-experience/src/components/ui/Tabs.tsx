"use client";

import { cn } from "../../lib/utils";
import { createContext, useContext, useState, ReactNode } from "react";

type TabsContextType = { activeTab: string; setActiveTab: (id: string) => void };
const TabsContext = createContext<TabsContextType | undefined>(undefined);

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Tabs components must be used within Tabs");
  return context;
};

interface TabsProps { defaultValue: string; children: ReactNode; className?: string; }

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex space-x-1 border-b border-gray-200", className)}>{children}</div>;
}

export function TabsTrigger({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;
  return (
    <button
      className={cn(
        "px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-[1px]",
        isActive ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300",
        className
      )}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { activeTab } = useTabs();
  if (activeTab !== value) return null;
  return <div className={cn("pt-4", className)}>{children}</div>;
}