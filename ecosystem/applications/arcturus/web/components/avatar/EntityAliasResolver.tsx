"use client";

import { CheckCircle2, ChevronRight, Tags } from "lucide-react";

interface EntityAliasResolverProps {
  entities: Array<{
    mentionedAs: string;
    resolvedTo: string;
    confidence: number;
    type: string;
  }>;
}

export default function EntityAliasResolver({ entities }: EntityAliasResolverProps) {
  if (!entities || entities.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-md">
      <div className="mb-3 flex items-center gap-2">
        <Tags className="h-4 w-4 text-cyan-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          Entity Alias Resolution
        </h3>
      </div>
      
      <div className="space-y-3">
        {entities.map((entity, idx) => (
          <div 
            key={idx} 
            className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-sm transition-colors hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-300 italic">"{entity.mentionedAs}"</span>
              <ChevronRight className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-white">{entity.resolvedTo}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-gray-400">
                {entity.type}
              </span>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-emerald-400">
                  {Math.round(entity.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
