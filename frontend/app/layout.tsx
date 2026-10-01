import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";
import { AppShell } from "@/components/layout/AppShell";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Horquva | Operational Continuity Platform",
  description:
    "When someone leaves, nothing breaks. Detect single points of failure across automated workflows, critical credentials, and business processes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full`} suppressHydrationWarning>
      <body className="h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
