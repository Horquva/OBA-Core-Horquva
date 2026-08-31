import clsx from "clsx";
import { ChatMessages } from "@/types/oba";
import EntityAliasResolver from "./EntityAliasResolver";

interface ChatMessageProps {
  message: ChatMessages;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.sender === "assistant";

  return (
    <article
      className={clsx(
        "flex w-full",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={clsx(
          "max-w-[75%] rounded-2xl px-5 py-4",
          "border transition-all duration-200",
          isAssistant
            ? "bg-white/5 border-white/10 text-white"
            : "bg-cyan-500/10 border-cyan-500/20 text-cyan-50"
        )}
      >
        {/* Sender */}
        <p
          className={clsx(
            "mb-2 text-xs font-semibold uppercase tracking-wider",
            isAssistant ? "text-cyan-400" : "text-cyan-300"
          )}
        >
          {isAssistant ? "OBA" : "You"}
        </p>

        {/* Message */}
        <p className="whitespace-pre-wrap leading-7">
          {message.message}
        </p>

        {/* Entities */}
        {isAssistant && message.entities && message.entities.length > 0 && (
          <div className="mt-4">
            <EntityAliasResolver entities={message.entities} />
          </div>
        )}

        {/* Time (future use) */}
        {message.timestamp && (
          <p className="mt-3 text-right text-xs text-gray-500">
            {message.timestamp}
          </p>
        )}
      </div>
    </article>
  );
}