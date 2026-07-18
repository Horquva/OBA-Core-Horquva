import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/lib/ThemeContext";
import { GlobalPanelsProvider } from "@/components/global/GlobalPanelsContext";
import GlobalAvatarPanel from "@/components/global/GlobalAvatarPanel";
import GlobalNotificationPanel from "@/components/global/GlobalNotificationPanel";
import GlobalSearchOverlay from "@/components/global/GlobalSearchOverlay";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Horquva OBA | AI Workforce Intelligence",
  description:
    "Organizational Brain Analysis — discover, map, and analyze AI agents inside your organization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full`}>
      <body className="h-full">
        <GlobalPanelsProvider>
          <ThemeProvider>
            <div className="flex h-full">
              {/* Persistent Sidebar — never re-mounts on navigation */}
              <Sidebar />

              {/* Main content column */}
              <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
                <main className="flex-1 overflow-y-auto p-6 lg:p-8">
                  {children}
                </main>
              </div>

              {/* Global Panels */}
              <GlobalAvatarPanel />
              <GlobalNotificationPanel />
              <GlobalSearchOverlay />
            </div>
          </ThemeProvider>
        </GlobalPanelsProvider>
      </body>
    </html>
  );
}
