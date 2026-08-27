"use client";

import { SendHorizontal, Sparkles, } from "lucide-react";
import { useState, KeyboardEvent } from "react";
import VoiceButton from "./VoiceButton";

interface ChatInputProps {
  onSend?: (message: string) => void;
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    const text = message.trim();

    if (!text) return;

    onSend?.(text);
    setMessage("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Input */}
      <Sparkles
  size={18}
  className="text-cyan-400 shrink-0"
/>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask OBA about ownership, workflows or risks..."
        className="
          flex-1
          rounded-xl
          border border-white/10
          bg-white/5
          px-4
          py-3
          text-sm
          text-white
          placeholder:text-gray-500
          outline-none
          transition-all
          focus:border-cyan-500/40
          focus:ring-2
          focus:ring-cyan-500/10
        "
      />

      {/* Voice */}
      <VoiceButton />

      {/* Send */}
      <button
  type="button"
  onClick={handleSend}
  className="
    flex
    h-11
    w-11
    items-center
    justify-center
    rounded-xl
    bg-cyan-500
    text-white
    transition-all
    duration-200
    hover:bg-cyan-400
    hover:scale-105
    active:scale-95
  "
>
  <SendHorizontal size={18} />
</button>
      
    </div>
  );
}