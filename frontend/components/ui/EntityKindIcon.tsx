import * as React from 'react';
import { AppWindow, Box, Building2, Cpu, KeyRound, Sparkles, User, Users, Workflow, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

const KIND_ICON: Record<string, LucideIcon> = {
  automation: Workflow,
  credential: KeyRound,
  app: AppWindow,
  group: Users,
  person: User,
  ai_agent: Sparkles,
  model: Cpu,
  vendor: Building2,
};

const KIND_LABEL: Record<string, string> = {
  automation: 'Automation',
  credential: 'Credential',
  app: 'App',
  group: 'Team',
  person: 'Person',
  ai_agent: 'AI agent',
  model: 'AI model',
  vendor: 'Vendor',
};

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind.charAt(0).toUpperCase() + kind.slice(1).replace(/_/g, ' ');
}

/** A monochrome icon for an entity kind; decorative, so always pair it with the name. */
export function EntityKindIcon({ kind, className }: { kind: string; className?: string }) {
  const Icon = KIND_ICON[kind] ?? Box;
  return <Icon aria-hidden="true" className={cn('h-3.5 w-3.5', className)} />;
}
