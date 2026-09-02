"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { tokens } from '../../lib/tokens';

type TabsContextType = { activeTab: string; setActiveTab: (id: string) => void };
const TabsContext = createContext<TabsContextType | undefined>(undefined);

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tabs components must be used within Tabs');
  return context;
};

interface TabsProps { defaultValue: string; children: ReactNode; className?: string; }

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn(`flex space-x-1 border-b border-[${tokens.color.border.default.value}]`, className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;
  return (
    <button
      className={cn(
        `px-[${tokens.spacing.md.value}px] py-[${tokens.spacing.sm.value}px] 
        text-[${tokens.typography.bodySmall.size.value}px] font-medium 
        transition-all border-b-2 -mb-[1px]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[${tokens.color.primary[300].value}]`,
        isActive
          ? `border-[${tokens.color.primary[600].value}] text-[${tokens.color.primary[600].value}]`
          : `border-transparent text-[${tokens.color.text.secondary.value}] hover:text-[${tokens.color.text.default.value}] hover:border-[${tokens.color.border.default.value}]`,
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
  return <div className={cn(`pt-[${tokens.spacing.md.value}px]`, className)}>{children}</div>;
}