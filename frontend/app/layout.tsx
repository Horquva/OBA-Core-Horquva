import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { themeInitScript } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/Toast';

// One sans family for the whole product: dashboards read better without a display serif.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Horquva | OBA — Organizational Brain Analysis',
  description: 'When someone leaves, nothing breaks.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-full bg-canvas text-ink antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
