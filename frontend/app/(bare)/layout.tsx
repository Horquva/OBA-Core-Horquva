import * as React from 'react';

export default function BareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
      {children}
    </div>
  );
}
