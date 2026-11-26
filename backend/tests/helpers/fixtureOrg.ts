import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IdentityQueueItem } from '@horquva/types';
import type { InitialState, UserAccount, OrgSettings, StoredChangeEvent, DepartureRecord } from '../../src/services/dataService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function demoState() {
  const fixturePath = path.resolve(__dirname, '../fixtures/handCheckableTruth.json');
  const fixture = fs.existsSync(fixturePath)
    ? JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))
    : { entities: [], edges: [], facts: [] };
  const users: UserAccount[] = [
    { id: 'user:admin', name: 'Alex Rivera', email: 'alex@acme.com', role: 'admin', isHrManager: true, title: 'Head of Operations' },
    { id: 'user:reviewer', name: 'Omar Farooq', email: 'omar@acme.com', role: 'reviewer', isHrManager: false, title: 'Staff Engineer' },
    { id: 'user:chen', name: 'Chen Wei', email: 'chen@acme.com', role: 'reviewer', isHrManager: false, title: 'Senior Engineer' },
    { id: 'user:maya', name: 'Maya Lin', email: 'maya@acme.com', role: 'viewer', isHrManager: false, title: 'Lead Architect' },
  ];
  const org: OrgSettings = {
    companyName: 'Your organization',
    logoUrl: null,
    minGroupSize: 5,
    departmentMappings: [
      { raw: 'Eng - Platform', mapped: 'Platform Engineering' },
      { raw: 'RevOps & Growth', mapped: 'Revenue Operations' },
    ],
  };
  const changeEvents: StoredChangeEvent[] = [
    {
      id: 'chg_001',
      kind: 'person_left',
      title: 'Sarah Connor marked departed in Entra ID',
      impact: 'Single-owner automation "Customer Onboarding Flow" has no active owner.',
      href: '/assets/automation:n8n:104',
      // Dated from the fixture (Sarah's departure), not relative to server start.
      detectedAt: '2025-01-15T00:00:00.000Z',
      acknowledged: false,
    },
    {
      id: 'chg_002',
      kind: 'credential_risk',
      title: 'Personal Credential bound to AI Ticket Routing',
      impact: 'David Miller personal token executes 2,500 runs/week.',
      href: '/assets/automation:n8n:105',
      detectedAt: '2025-01-01T00:00:00.000Z',
      acknowledged: false,
    },
  ];
  const queueItem: IdentityQueueItem = {
    id: 'qi_9921',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    externalAccountId: 'ext_usr_9921',
    source: 'n8n',
    displayName: 'D. Miller (n8n Dev)',
    emailCandidate: 'david.dev@acme.com',
    status: 'pending',
  };
  const departure: DepartureRecord = {
    id: 'dep_sarah_001',
    personId: 'person:sarah@acme.com',
    leaveDate: '2025-01-15T00:00:00Z',
    stage: 'initiated',
    note: 'Departed employee from Entra sync.',
    detectedFrom: 'entra',
    stageTimestamps: { initiated: '2025-01-15T00:00:00Z' },
    handovers: [{ id: 'hnd_104', assetId: 'automation:n8n:104', successorId: null, acceptance: 'none', declineReason: null }],
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  };
  return { fixture, users, org, changeEvents, queueItem, departure };
}

export function fixtureOrgState(): InitialState {
  const demo = demoState();
  return {
    entities: demo.fixture.entities,
    edges: demo.fixture.edges,
    facts: demo.fixture.facts,
    users: demo.users,
    org: demo.org,
    changeEvents: demo.changeEvents,
    queueItems: [demo.queueItem],
    departures: [demo.departure],
  };
}
