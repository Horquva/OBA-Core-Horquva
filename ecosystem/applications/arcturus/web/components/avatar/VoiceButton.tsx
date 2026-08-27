"use client";

import { executeVoiceCommand } from "@/services/voiceApi";
import { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import clsx from "clsx";

export default function VoiceButton() {
  const [isRecording, setIsRecording] = useState(false);

  const toggleRecording = async () => {
  setIsRecording((prev) => !prev);

  try {
    const result = await executeVoiceCommand(
      "Show workflow status"
    );

    console.log(result);
  } catch (error) {
    console.error(error);
  }
};

  return (
    <button
      type="button"
      onClick={toggleRecording}
      title={isRecording ? "Stop Recording" : "Start Voice Command"}
      className={clsx(
        "flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200",
        isRecording
          ? "border-red-500/30 bg-red-500/10 text-red-400 shadow-[0_0_16px_rgba(239,68,68,0.15)]"
          : "border-white/10 bg-white/5 text-gray-300 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-400"
      )}
    >
      {isRecording ? (
        <MicOff size={18} strokeWidth={2} />
      ) : (
        <Mic size={18} strokeWidth={2} />
      )}
    </button>
  );
}