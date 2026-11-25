import { describe, it, expect } from 'vitest';
import type {
  CanonicalEdge,
  CanonicalEntity,
  CanonicalFact,
  EdgeType,
  EntityKind,
  EvidenceGrade,
  IdentityLink,
} from '@horquva/types';
import {
  attributeAccounts,
  weakerGrade,
  type GraphSnapshot,
} from '../../src/domain/identity/attribution.js';
import { ContinuityGraph } from '../../src/domain/graph/index.js';
import { SimulationEngine } from '../../src/domain/simulation/index.js';
import { DataService } from '../../src/services/dataService.js';
import { edgeFactView } from '../../src/views/factViews.js';

const NOW = new Date('2026-11-10T12:00:00Z');

const entity = (
  id: string,
  kind: EntityKind,
  name: string,
  externalRefs: Record<string, string> = {}
): CanonicalEntity => ({
  id,
  kind,
  name,
  externalRefs,
  createdAt: NOW,
  updatedAt: NOW,
});

const edge = (
  id: string,
  fromId: string,
  type: EdgeType,
  toId: string,
  grade: EvidenceGrade = 'stated',
  source = 'connector:n8n',
  sourceRef?: string
): CanonicalEdge => ({
  id,
  fromId,
  toId,
  type,
  grade,
  source,
  ...(sourceRef !== undefined ? { sourceRef } : {}),
  validFrom: NOW,
  validTo: null,
});

const link = (
  overrides: Partial<IdentityLink> & Pick<IdentityLink, 'id' | 'accountId' | 'personId'>
): IdentityLink => ({
  grade: 'stated',
  method: 'exact_email',
  linkedBy: 'autoLink',
  note: null,
  validFrom: NOW,
  validTo: null,
  ...overrides,
});

const buildGraph = (snap: GraphSnapshot, links: IdentityLink[]) => {
  const attributed = attributeAccounts(snap, links);
  const linkedAccountIds = links
    .filter((l) => l.validTo == null && l.method !== 'suggested')
    .map((l) => l.accountId);
  return {
    attributed,
    graph: ContinuityGraph.fromSnapshot(
      attributed.entities,
      attributed.edges,
      attributed.facts,
      { linkedAccountIds }
    ),
  };
};

describe('identity attribution through graded links', () => {
  it('weakerGrade orders confirmed > stated > inferred > unknown', () => {
    expect(weakerGrade('confirmed', 'stated')).toBe('stated');
    expect(weakerGrade('stated', 'confirmed')).toBe('stated');
    expect(weakerGrade('confirmed', 'inferred')).toBe('inferred');
    expect(weakerGrade('stated', 'inferred')).toBe('inferred');
    expect(weakerGrade('inferred', 'unknown')).toBe('unknown');
    expect(weakerGrade('confirmed', 'confirmed')).toBe('confirmed');
  });

  it('linked account ownership attributed to person with weaker grade', () => {
    const omar = entity('person:entra:1', 'person', 'Omar Farooq', { entraId: '1' });
    const n8nAcc = entity('account:n8n:u1', 'account', 'Omar n8n', { source: 'n8n' });
    const wf = entity('automation:n8n:w1', 'automation', 'Payroll Sync');

    const rawEdge = edge('edge-1', n8nAcc.id, 'owns', wf.id, 'confirmed', 'connector:n8n', 'wf:w1');
    const l = link({ id: 'link-1', accountId: n8nAcc.id, personId: omar.id, grade: 'stated' });

    const { attributed, graph } = buildGraph(
      { entities: [omar, n8nAcc, wf], edges: [rawEdge], facts: [] },
      [l]
    );

    const attributedEdge = attributed.edges.find(
      (e) => e.fromId === omar.id && e.toId === wf.id && e.type === 'owns'
    );
    expect(attributedEdge).toBeDefined();
    expect(attributedEdge?.grade).toBe('stated');
    expect(graph.getOwners(wf.id).map((o) => o.id)).toEqual([omar.id]);
    expect(graph.getOwnedAssets(omar.id).map((a) => a.id)).toEqual([wf.id]);
  });

  it('confirmed link plus inferred edge gives inferred', () => {
    const omar = entity('person:entra:1', 'person', 'Omar Farooq', { entraId: '1' });
    const n8nAcc = entity('account:n8n:u1', 'account', 'Omar n8n', { source: 'n8n' });
    const wf = entity('automation:n8n:w1', 'automation', 'Payroll Sync');

    const rawEdge = edge('edge-1', n8nAcc.id, 'owns', wf.id, 'inferred', 'connector:n8n');
    const adminLink = link({
      id: 'link-admin',
      accountId: n8nAcc.id,
      personId: omar.id,
      grade: 'confirmed',
      method: 'admin_link',
      linkedBy: 'user:admin',
    });

    const { attributed } = buildGraph(
      { entities: [omar, n8nAcc, wf], edges: [rawEdge], facts: [] },
      [adminLink]
    );

    const attributedEdge = attributed.edges.find(
      (e) => e.fromId === omar.id && e.toId === wf.id && e.type === 'owns'
    );
    expect(attributedEdge?.grade).toBe('inferred');
  });

  it('preserves original account node and raw edge for provenance', () => {
    const omar = entity('person:entra:1', 'person', 'Omar Farooq', { entraId: '1' });
    const n8nAcc = entity('account:n8n:u1', 'account', 'Omar n8n', { source: 'n8n' });
    const wfWithRef = entity('automation:n8n:w1', 'automation', 'With Ref');
    const wfNoRef = entity('automation:n8n:w2', 'automation', 'No Ref');

    const rawWithRef = edge('edge-with-ref', n8nAcc.id, 'owns', wfWithRef.id, 'stated', 'connector:n8n', 'n8n:wf:w1');
    const rawNoRef = edge('edge-no-ref', n8nAcc.id, 'owns', wfNoRef.id, 'stated', 'connector:n8n');
    const l = link({ id: 'link-prov-1', accountId: n8nAcc.id, personId: omar.id, grade: 'stated' });

    const { attributed, graph } = buildGraph(
      { entities: [omar, n8nAcc, wfWithRef, wfNoRef], edges: [rawWithRef, rawNoRef], facts: [] },
      [l]
    );

    // Original account entity & raw edges remain intact
    expect(attributed.entities.some((e) => e.id === n8nAcc.id)).toBe(true);
    expect(graph.getNode(n8nAcc.id)).toBeDefined();
    expect(
      attributed.edges.find((e) => e.id === 'edge-with-ref' && e.fromId === n8nAcc.id)
    ).toMatchObject({
      fromId: n8nAcc.id,
      toId: wfWithRef.id,
      sourceRef: 'n8n:wf:w1',
    });
    expect(graph.getEdgesForEntity(n8nAcc.id)).toHaveLength(2);

    // Attributed edges carry provenance sourceRef
    const attrWithRef = attributed.edges.find(
      (e) => e.fromId === omar.id && e.toId === wfWithRef.id
    );
    const attrNoRef = attributed.edges.find(
      (e) => e.fromId === omar.id && e.toId === wfNoRef.id
    );
    expect(attrWithRef?.sourceRef).toBe('n8n:wf:w1|link:link-prov-1');
    expect(attrNoRef?.sourceRef).toBe('link:link-prov-1');
    expect(attrWithRef?.id).not.toBe('edge-with-ref');
  });

  it('person with two linked accounts owning one asset counts as one owner', () => {
    const omar = entity('person:entra:1', 'person', 'Omar Farooq', { entraId: '1' });
    const lina = entity('person:entra:2', 'person', 'Lina Haddad', { entraId: '2' });
    const acc1 = entity('account:n8n:u1', 'account', 'Omar n8n', { source: 'n8n' });
    const acc2 = entity('account:openai:u2', 'account', 'Omar OpenAI', { source: 'openai' });
    const backupAcc1 = entity('account:n8n:b1', 'account', 'Lina n8n', { source: 'n8n' });
    const backupAcc2 = entity('account:csv:b2', 'account', 'Lina CSV', { source: 'csv' });
    const wf = entity('automation:n8n:w1', 'automation', 'Critical Flow');

    const runFact: CanonicalFact = {
      entityId: wf.id,
      attribute: 'run_volume_weekly',
      value: 250,
      grade: 'stated',
      source: 'connector:n8n',
      validFrom: NOW,
      validTo: null,
    };

    const edges: CanonicalEdge[] = [
      edge('e-own-1', acc1.id, 'owns', wf.id, 'stated', 'connector:n8n'),
      edge('e-own-2', acc2.id, 'owns', wf.id, 'stated', 'connector:openai'),
      edge('e-bak-1', backupAcc1.id, 'backs_up', wf.id, 'stated', 'connector:n8n'),
      edge('e-bak-2', backupAcc2.id, 'backs_up', wf.id, 'confirmed', 'connector:csv'),
      edge('e-cred-1', wf.id, 'runs_on_credentials_of', acc1.id, 'stated', 'connector:n8n'),
      edge('e-cred-2', wf.id, 'runs_on_credentials_of', acc2.id, 'stated', 'connector:openai'),
    ];

    const links: IdentityLink[] = [
      link({ id: 'l1', accountId: acc1.id, personId: omar.id, grade: 'stated' }),
      link({ id: 'l2', accountId: acc2.id, personId: omar.id, grade: 'confirmed', method: 'admin_link' }),
      link({ id: 'l3', accountId: backupAcc1.id, personId: lina.id, grade: 'stated' }),
      link({ id: 'l4', accountId: backupAcc2.id, personId: lina.id, grade: 'stated' }),
    ];

    const { graph } = buildGraph(
      {
        entities: [omar, lina, acc1, acc2, backupAcc1, backupAcc2, wf],
        edges,
        facts: [runFact],
      },
      links
    );

    expect(graph.getOwners(wf.id).map((o) => o.id)).toEqual([omar.id]);
    expect(graph.getBackups(wf.id).map((b) => b.id)).toEqual([lina.id]);
    expect(graph.getOwnedAssets(omar.id).map((a) => a.id)).toEqual([wf.id]);

    const ownerView = edgeFactView(graph, wf.id, 'owns');
    expect(ownerView.state).toBe('value');
    expect(ownerView.ref).toEqual({ id: omar.id, kind: 'person', name: omar.name });

    const backupView = edgeFactView(graph, wf.id, 'backs_up');
    expect(backupView.state).toBe('value');
    expect(backupView.ref).toEqual({ id: lina.id, kind: 'person', name: lina.name });

    const sim = new SimulationEngine(graph).simulateDeparture([omar.id]);
    expect(sim.stoppedPersonalCredentialAutomations).toHaveLength(1);
    expect(sim.stoppedPersonalCredentialAutomations[0]).toMatchObject({
      workflowId: wf.id,
      credentialOwnerId: omar.id,
      weeklyRuns: 250,
    });
  });

  it('suggested links are ignored and closed links are ignored', () => {
    const omar = entity('person:entra:1', 'person', 'Omar Farooq', { entraId: '1' });
    const accSuggested = entity('account:n8n:u1', 'account', 'Omar ?', { source: 'n8n' });
    const accClosed = entity('account:n8n:u2', 'account', 'Old Link', { source: 'n8n' });
    const wf1 = entity('automation:n8n:w1', 'automation', 'Suggested WF');
    const wf2 = entity('automation:n8n:w2', 'automation', 'Closed WF');

    const links: IdentityLink[] = [
      link({
        id: 'link-sug',
        accountId: accSuggested.id,
        personId: omar.id,
        grade: 'inferred',
        method: 'suggested',
        validTo: null,
      }),
      link({
        id: 'link-closed',
        accountId: accClosed.id,
        personId: omar.id,
        grade: 'stated',
        method: 'exact_email',
        validTo: new Date('2026-11-09T00:00:00Z'),
      }),
    ];

    const { attributed, graph } = buildGraph(
      {
        entities: [omar, accSuggested, accClosed, wf1, wf2],
        edges: [
          edge('e1', accSuggested.id, 'owns', wf1.id),
          edge('e2', accClosed.id, 'owns', wf2.id),
        ],
        facts: [],
      },
      links
    );

    expect(attributed.edges.filter((e) => e.fromId === omar.id)).toHaveLength(0);
    expect(graph.getOwnedAssets(omar.id)).toEqual([]);
    expect(graph.getOwners(wf1.id).map((o) => o.id)).toEqual([accSuggested.id]);
    expect(graph.getOwners(wf2.id).map((o) => o.id)).toEqual([accClosed.id]);
  });

  it('unlinked account owner stays visible as owner', () => {
    const omar = entity('person:entra:1', 'person', 'Omar Farooq', { entraId: '1' });
    const unlinkedAcc = entity('account:n8n:u99', 'account', 'External Bot', { source: 'n8n' });
    const wf = entity('automation:n8n:w99', 'automation', 'Unlinked Flow');

    const { graph } = buildGraph(
      {
        entities: [omar, unlinkedAcc, wf],
        edges: [edge('e1', unlinkedAcc.id, 'owns', wf.id, 'stated', 'connector:n8n')],
        facts: [],
      },
      []
    );

    expect(graph.getOwners(wf.id).map((o) => o.id)).toEqual([unlinkedAcc.id]);
    const ownerView = edgeFactView(graph, wf.id, 'owns');
    expect(ownerView.state).toBe('value');
    expect(ownerView.ref).toEqual({
      id: unlinkedAcc.id,
      kind: 'account',
      name: unlinkedAcc.name,
    });
  });

  it('handles edges where both endpoints are linked accounts cleanly', () => {
    const omar = entity('person:entra:1', 'person', 'Omar Farooq', { entraId: '1' });
    const lina = entity('person:entra:2', 'person', 'Lina Haddad', { entraId: '2' });
    const acc1 = entity('account:n8n:u1', 'account', 'Omar n8n', { source: 'n8n' });
    const acc2 = entity('account:n8n:u2', 'account', 'Lina n8n', { source: 'n8n' });

    const raw = edge('e-both', acc1.id, 'reports_to', acc2.id, 'confirmed', 'connector:n8n', 'mgr:1');
    const l1 = link({ id: 'l-from', accountId: acc1.id, personId: omar.id, grade: 'stated' });
    const l2 = link({ id: 'l-to', accountId: acc2.id, personId: lina.id, grade: 'inferred' });

    const { attributed, graph } = buildGraph(
      { entities: [omar, lina, acc1, acc2], edges: [raw], facts: [] },
      [l1, l2]
    );

    const projected = attributed.edges.find((e) => e.fromId === omar.id && e.toId === lina.id);
    expect(projected).toBeDefined();
    expect(projected?.grade).toBe('inferred');
    expect(projected?.sourceRef).toBe('mgr:1|link:l-from+l-to');
    expect(projected?.id).toBe('e-both|link:l-from+l-to');
    expect(graph.getManager(omar.id)?.id).toBe(lina.id);
  });

  it('DataService.reattributeGraph updates in-memory graph when links change', async () => {
    const ds = new DataService({ persistent: false });
    const omar = entity('person:entra:re1', 'person', 'Omar Reattr', { entraId: 're1' });
    const acc = entity('account:n8n:re1', 'account', 'Omar n8n Reattr', { source: 'n8n' });
    const wf = entity('automation:n8n:re1', 'automation', 'Reattr Flow');

    ds.getGraph().addEntity(omar);
    ds.getGraph().addEntity(acc);
    ds.getGraph().addEntity(wf);
    ds.getGraph().addEdge(edge('e-reattr', acc.id, 'owns', wf.id, 'stated', 'connector:n8n'));

    expect(ds.getGraph().getOwners(wf.id).map((o) => o.id)).toEqual([acc.id]);

    const created = await ds.getLinkRepository().create({
      accountId: acc.id,
      personId: omar.id,
      grade: 'confirmed',
      method: 'admin_link',
      linkedBy: 'user:admin',
      note: 'Manual link',
    });

    await ds.reattributeGraph();
    expect(ds.getGraph().getOwners(wf.id).map((o) => o.id)).toEqual([omar.id]);
    expect(ds.getGraph().getLinkedAccountIds().has(acc.id)).toBe(true);

    await ds.getLinkRepository().close(created.id);
    await ds.reattributeGraph();
    expect(ds.getGraph().getOwners(wf.id).map((o) => o.id)).toEqual([acc.id]);
    expect(ds.getGraph().getLinkedAccountIds().has(acc.id)).toBe(false);
  });
});
