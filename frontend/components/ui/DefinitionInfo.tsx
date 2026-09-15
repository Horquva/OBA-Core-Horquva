import { Info } from 'lucide-react';

interface DefinitionInfoProps {
  /** One sentence naming exactly what population/computation this number
   *  covers — backend/brain/knowledge/intelligenceExchange.js's
   *  createIntelligence() `definition` field. */
  definition: string | undefined;
  className?: string;
}

// Section 06: several catalog names collide with a same-named SQL surface
// that answers a structurally different question over a different
// population — M03's SPOF count is every asset type, GET /api/dependencies/
// agent-spofs is agents only, both correctly called "SPOF", both real,
// disagreeing numbers. Renaming every label was rejected in favor of the
// smaller change that scales: the backend already knows its own scope, so
// it says so, and this renders that sentence on hover wherever a number
// carrying one is shown. Native `title` attribute, same lightweight
// convention as ProvenanceBadge/AuthoredBadge — no tooltip library.
export function DefinitionInfo({ definition, className }: DefinitionInfoProps) {
  if (!definition) return null;

  return (
    <span
      title={definition}
      tabIndex={0}
      aria-label={definition}
      className={className ?? 'inline-flex text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)] cursor-help focus-visible:outline-2 focus-visible:outline-offset-2'}
    >
      <Info className="w-3.5 h-3.5" />
    </span>
  );
}
