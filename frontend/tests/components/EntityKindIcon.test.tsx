import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import type { EntityKind } from '@horquva/types';
import { EntityKindIcon, isKnownKind, kindLabel } from '@/components/ui/EntityKindIcon';
import { nodeTypes } from '@/features/map/nodes';

// `satisfies` makes this list fail to compile when a kind is added to the types package.
const ALL_KINDS = {
  person: true,
  automation: true,
  credential: true,
  model: true,
  vendor: true,
  group: true,
  app: true,
  process: true,
  account: true,
  repository: true,
  project: true,
} satisfies Record<EntityKind, true>;

describe('EntityKindIcon', () => {
  it('every EntityKind has an icon and label', () => {
    for (const kind of Object.keys(ALL_KINDS)) {
      expect(isKnownKind(kind), kind).toBe(true);
      expect(nodeTypes).toHaveProperty(kind);
      const { container } = render(<EntityKindIcon kind={kind} />);
      expect(container.querySelector('svg')).not.toBeNull();
    }
  });

  it('labels the new kinds Account, Repository and Project', () => {
    expect(kindLabel('account')).toBe('Account');
    expect(kindLabel('repository')).toBe('Repository');
    expect(kindLabel('project')).toBe('Project');
  });

  it('the map no longer aliases the legacy workflow kind', () => {
    expect(nodeTypes).not.toHaveProperty('workflow');
  });
});
