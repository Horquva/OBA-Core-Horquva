import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";
import { AuthProvider } from "@/lib/AuthContext";
import { GlobalPanelsProvider } from "@/components/global/GlobalPanelsContext";
import { AppShell } from "@/components/layout/AppShell";

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
        <ThemeProvider>
          <AuthProvider>
            <GlobalPanelsProvider>
              <AppShell>{children}</AppShell>
            </GlobalPanelsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
