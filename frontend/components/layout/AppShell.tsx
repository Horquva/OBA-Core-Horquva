"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { AskHorquvaSlideOver } from "@/components/assistant/AskHorquvaSlideOver";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isAskOpen, setIsAskOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      {/* Primary Sidebar */}
      <Sidebar onOpenAskHorquva={() => setIsAskOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>

      {/* Slide-over Ask Horquva Assistant */}
      <AskHorquvaSlideOver isOpen={isAskOpen} onClose={() => setIsAskOpen(false)} />
    </div>
  );
}
