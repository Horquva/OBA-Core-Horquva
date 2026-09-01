import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Sidebar from "./sidebar";
import RightPanel from "@/components/layout/RightPanel";
import TopBar from "@/components/layout/TopBar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

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
    <html lang="en" className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
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