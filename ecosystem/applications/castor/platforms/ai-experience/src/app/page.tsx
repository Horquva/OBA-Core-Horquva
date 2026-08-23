"use client";

import { AIProvider } from '../features/ai/context/AIContext';
import { ChatInterface } from '../features/ai/components/ChatInterface';

export default function Home() {
  return (
    <AIProvider>
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <ChatInterface />
      </div>
    </AIProvider>
  );
}