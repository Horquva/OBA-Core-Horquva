import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./sidebar";
import RightPanel from "@/components/layout/RightPanel";
import TopBar from "@/components/layout/TopBar";

export const metadata: Metadata = {
  title: "Arcturus Command Center",
  description: "Arcturus Simulation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex h-screen bg-gray-50 text-slate-900 overflow-hidden">
        {/* Left Column: Global Sidebar */}
        <Sidebar />
        
        {/* Middle Column: Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--background)]">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>

        {/* Right Column: Live Simulation & Intelligence Insights */}
        <RightPanel />
      </body>
    </html>
  );
}