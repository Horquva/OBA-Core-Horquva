import clsx from "clsx";

export default function TypingIndicator() {
  return (
    <article className="flex justify-start animate-fade-up">
      <div
        className={clsx(
          "max-w-55",
          "rounded-2xl border border-white/10",
          "bg-white/5 px-5 py-4"
        )}
      >
        {/* Sender */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-cyan-400">
          OBA
        </p>

        {/* Animated Dots */}
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-cyan-400"
            style={{ animationDelay: "0.15s" }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-cyan-400"
            style={{ animationDelay: "0.3s" }}
          />
        </div>
      </div>
    </article>
  );
}