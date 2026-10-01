"use client";

import React, { useState } from "react";
import { Sparkles, X, Send, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { askHorquva } from "@/lib/api";

export function AskHorquvaSlideOver({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Array<{ sender: "user" | "horquva"; text: string }>>([
    {
      sender: "horquva",
      text: "Hello! I am **Horquva**, your Operational Continuity Intelligence Assistant.\n\nAsk me about single points of failure, employee leaver risks, unbacked automations, or weekly continuity metrics.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userText = query.trim();
    setQuery("");
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await askHorquva(userText);
      setMessages((prev) => [...prev, { sender: "horquva", text: res.answer }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch response.";
      setMessages((prev) => [
        ...prev,
        {
          sender: "horquva",
          text: `⚠️ **Error querying continuity engine**: ${msg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Ask Horquva</h3>
              <p className="text-[11px] text-slate-500">Grounded Gemini 2.0 Continuity AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 text-sm ${m.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.sender === "horquva" && (
                <div className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2.5 leading-relaxed ${
                  m.sender === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60"
                }`}
              >
                <div className="prose dark:prose-invert prose-sm max-w-none text-xs">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2">
              <Sparkles className="w-4 h-4 animate-spin text-blue-500" />
              <span>Analyzing graph reachability and grounding facts...</span>
            </div>
          )}
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about leavers, critical unbacked assets, outages..."
            className="flex-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-3.5 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
