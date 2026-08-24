"use client";

import { askOBA, getDailySummary, getVoiceIntents } from "@/services/voiceApi";
import { useState, useEffect } from "react";
import ChatInput from "./ChatInput";
import SuggestedPrompts from "./SuggestedPrompts";
import TypingIndicator from "./TypingIndicator";
import ChatMessage from "./ChatMessage";
import { ChatMessages } from "@/types/oba";
import DailySpokenSummary from "./DailySpokenSummary";

export default function AvatarChatPanel() {
  const [messages, setMessages] = useState<ChatMessages[]>([
    {
      id: "welcome",
      sender: "assistant",
      message: `Hello.
I'm OBA.
How may I assist you today?`,
    },
  ]);

  const [dailySummary, setDailySummary] = useState(
  "Loading today's executive briefing..."
);

const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);

  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
  const loadDailySummary = async () => {
    try {
      const data = await getDailySummary();

      setDailySummary(
        data.summary || "No executive briefing available."
      );
    } catch (error) {
      console.error(error);

      setDailySummary(
        "Unable to load today's executive briefing."
      );
    }
  };
  const loadVoiceIntents = async () => {
  try {
    const data = await getVoiceIntents();

    setSuggestedPrompts(
      data.map((item: any) => item.example_query)
    );
  } catch (error) {
    console.error(error);
  }
};

loadVoiceIntents();

  loadDailySummary();
}, []);

  const handleSend = async (message: string) => {
  // User message
  const userMessage: ChatMessages = {
  id: Date.now().toString(),
  sender: "user",
  message,
};

  setMessages((prev) => [...prev, userMessage]);

  setIsTyping(true);

  try {
    const response = await askOBA(message);

    const assistantMessage: ChatMessages = {
      id: (Date.now() + 1).toString(),
      sender: "assistant",
      message: response.answer,
      entities: response.resolvedEntity 
        ? [{
            mentionedAs: response.query, // Simplification
            resolvedTo: response.resolvedEntity,
            confidence: response.confidence === "HIGH" ? 0.95 : response.confidence === "MEDIUM" ? 0.75 : 0.4,
            type: response.entityType || "Unknown"
          }] 
        : undefined
    };

    setMessages((prev) => [...prev, assistantMessage]);
  } catch (error) {
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        message: "Sorry, I couldn't reach the Organizational Brain.",
      },
    ]);
  } finally {
    setIsTyping(false);
  }
};
  return (
    <section className="card flex h-full min-h-0 flex-col overflow-hidden">

      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 shrink-0">
        <h2 className="text-2xl font-semibold text-white">
          OBA Executive Assistant
        </h2>

        <p className="mt-2 text-sm text-gray-400">
          Conversational front door for your organization.
          Ask about ownership, workflows, risks or organizational intelligence.
        </p>
      </div>
      {/* Daily Briefing */}

<DailySpokenSummary
  summary={dailySummary}
/>
      {/* Conversation */}
      <div className="flex-1 min-h-[200px] overflow-y-auto px-6 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {isTyping && <TypingIndicator />}

        </div>
      </div>

      {/* Suggested Prompts */}
      <div className="border-t border-white/10 px-6 py-3 max-h-[112px] overflow-y-auto shrink-0">
        <SuggestedPrompts
  prompts={suggestedPrompts}
  onSelect={handleSend}
/>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 px-6 py-4 shrink-0">
        <ChatInput onSend={handleSend} />
        
      </div>

    </section>
  );
}