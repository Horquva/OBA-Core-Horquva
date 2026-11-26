// =============================================================================
// Horquva Continuity Platform — Identity Attribution Through Graded Links
// =============================================================================
// Projects active edges touching linked tool accounts (`kind: 'account'`) onto
// their resolved directory `person` nodes, taking the weaker of the edge's
// evidence grade and the identity link's evidence grade.
//
// Provenance invariant: original account entities and raw edges remain intact
// on the returned snapshot; attributed copies are appended with `sourceRef`
// chaining `<edge sourceRef>|link:<link.id>` (or `link:<link.id>`).
// =============================================================================

import type {
  CanonicalEdge,
  CanonicalEntity,
  CanonicalFact,
  EvidenceGrade,
  IdentityLink,
} from '@horquva/types';

export interface GraphSnapshot {
  entities: CanonicalEntity[];
  edges: CanonicalEdge[];
  facts: CanonicalFact[];
}

const GRADE_RANK: Record<EvidenceGrade, number> = {
  confirmed: 3,
  stated: 2,
  inferred: 1,
  unknown: 0,
};

export function weakerGrade(a: EvidenceGrade, b: EvidenceGrade): EvidenceGrade {
  return (GRADE_RANK[a] ?? 0) <= (GRADE_RANK[b] ?? 0) ? a : b;
}

export function attributeAccounts(
  snapshot: GraphSnapshot,
  links: IdentityLink[]
): GraphSnapshot {
  const linkByAccount = new Map<string, IdentityLink>();
  for (const link of links) {
    if (link.validTo == null && link.method !== 'suggested') {
      if (!linkByAccount.has(link.accountId)) {
        linkByAccount.set(link.accountId, link);
      }
    }
  }

  if (linkByAccount.size === 0) {
    return snapshot;
  }

  const attributedEdges: CanonicalEdge[] = [];

  for (const edge of snapshot.edges) {
    if (edge.validTo != null) continue;

    const fromLink = linkByAccount.get(edge.fromId);
    const toLink = linkByAccount.get(edge.toId);
    if (!fromLink && !toLink) continue;

    const nextFromId = fromLink ? fromLink.personId : edge.fromId;
    const nextToId = toLink ? toLink.personId : edge.toId;
    if (nextFromId === edge.fromId && nextToId === edge.toId) continue;
    if (nextFromId === nextToId && edge.fromId !== edge.toId) continue;

    const linkSuffix =
      fromLink && toLink
        ? fromLink.id === toLink.id
          ? fromLink.id
          : `${fromLink.id}+${toLink.id}`
        : (fromLink ?? toLink)!.id;

    let grade = edge.grade;
    if (fromLink) grade = weakerGrade(grade, fromLink.grade);
    if (toLink) grade = weakerGrade(grade, toLink.grade);

    const baseId = edge.id ?? `${edge.fromId}:${edge.type}:${edge.toId}`;
    const sourceRef = edge.sourceRef
      ? `${edge.sourceRef}|link:${linkSuffix}`
      : `link:${linkSuffix}`;

    attributedEdges.push({
      ...edge,
      id: `${baseId}|link:${linkSuffix}`,
      fromId: nextFromId,
      toId: nextToId,
      grade,
      sourceRef,
    });
  }

  return {
    entities: snapshot.entities,
    edges: [...snapshot.edges, ...attributedEdges],
    facts: snapshot.facts,
  };
}
