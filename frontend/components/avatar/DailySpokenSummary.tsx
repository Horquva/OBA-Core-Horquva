"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Play, Pause } from "lucide-react";

interface DailySpokenSummaryProps {
  summary: string;
}

export default function DailySpokenSummary({
  summary,
}: DailySpokenSummaryProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => speechSynthesis.cancel();
  }, []);

  const playSummary = () => {
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(summary);

    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = "en-US";

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    utteranceRef.current = utterance;

    speechSynthesis.speak(utterance);
  };

  const stopSummary = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
  };

  return (
    <div className="mb-6 rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">

      <div className="flex items-start justify-between">

        {/* Left */}

        <div className="flex gap-3">

          <div className="mt-1">
            <Bot className="h-5 w-5 text-cyan-400" />
          </div>

          <div>

            <div className="flex items-center gap-2">

              <h3 className="text-sm font-semibold text-white">
                Daily Briefing
              </h3>

              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cyan-400">
                Voice
              </span>

            </div>

            <p className="mt-2 max-h-28 overflow-y-auto pr-1 whitespace-pre-line text-sm leading-7 text-gray-300">
              {summary}
            </p>

          </div>

        </div>

        {/* Actions */}

        <div className="flex items-center gap-1">

          <button
            onClick={isPlaying ? stopSummary : playSummary}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>

          
        </div>

      </div>

    </div>
  );
}