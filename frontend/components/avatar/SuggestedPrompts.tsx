"use client";

interface SuggestedPromptsProps {
  prompts: string[];
  onSelect?: (prompt: string) => void;
}

export default function SuggestedPrompts({
  prompts,
  onSelect,
}: SuggestedPromptsProps) {
  return (
    <section>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
        Suggested Questions
      </p>

      <div className="flex flex-wrap gap-3">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelect?.(prompt)}
            className="
              rounded-full
              border border-white/10
              bg-white/5
              px-4
              py-2
              text-sm
              text-gray-300
              transition-all
              duration-200
              hover:border-cyan-500/30
              hover:bg-cyan-500/10
              hover:text-cyan-300
            "
          >
            {prompt}
          </button>
        ))}
      </div>
    </section>
  );
}