'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { CoverageStrip } from '@/components/ui/CoverageStrip';
import { SegmentedBar, NamedShareBar } from '@/components/ui/bars';
import { PriorityCard } from '@/components/ui/PriorityCard';
import { StageStepper } from '@/components/ui/StageStepper';
import {
  EvidenceDot,
  EvidenceBadge,
  CheckStatusBadge,
  CriticalityDots,
  UnknownValue,
  NoneValue,
} from '@/components/ui/marks';
import { Button } from '@/components/ui/Button';
import { ActionPill } from '@/components/ui/ActionPill';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { Drawer } from '@/components/ui/Drawer';
import { DataTable } from '@/components/ui/DataTable';
import { PersonPicker, PersonItem } from '@/components/ui/PersonPicker';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { Skeleton, ErrorState, EmptyState } from '@/components/ui/states';
import { useThemePreference, ThemePreference } from '@/lib/theme';
import type { EntityRef, CoverageMetrics } from '@/types/view';

export default function DesignShowcasePage() {
  const [currentTheme, setThemePreference] = useThemePreference();
  const [activeTab, setActiveTab] = React.useState('components');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedPerson, setSelectedPerson] = React.useState<EntityRef | null>(null);
  const [selectedEntity, setSelectedEntity] = React.useState<EntityRef | null>(null);
  const [isBtnLoading, setIsBtnLoading] = React.useState(false);

  const handleThemeChange = (mode: ThemePreference) => {
    setThemePreference(mode);
  };

  // Sample data for demonstration
  const sampleCoverage: CoverageMetrics = {
    total: 65,
    covered: 42,
    exposed: 18,
    unknown: 5,
    definition:
      'A critical automation is fully covered when it has at least one confirmed backup owner, a documented and accessible runbook, and operates on dedicated non-personal credentials.',
  };

  const sampleHolders = [
    { person: { id: 'p1', kind: 'person' as const, name: 'Sarah Connor' }, sharePct: 54 },
    { person: { id: 'p2', kind: 'person' as const, name: 'Alex Rivera' }, sharePct: 31 },
    { person: { id: 'p3', kind: 'person' as const, name: 'Elena Rostova' }, sharePct: 15 },
  ];

  const peopleList: PersonItem[] = [
    { id: 'u1', kind: 'person', name: 'Sarah Connor', title: 'VP Platform Eng', email: 'sarah@acme.corp' },
    { id: 'u2', kind: 'person', name: 'Alex Rivera', title: 'Staff SRE', email: 'alex@acme.corp' },
    { id: 'u3', kind: 'person', name: 'Elena Rostova', title: 'Senior DevOps', email: 'elena@acme.corp' },
  ];

  const entityList: EntityRef[] = [
    { id: 'e1', kind: 'automation', name: 'Stripe Webhook Gateway' },
    { id: 'e2', kind: 'credential', name: 'AWS Production Master Key' },
    { id: 'e3', kind: 'app', name: 'Billing Portal' },
  ];

  const tableData = [
    { id: '1', name: 'Stripe Webhook Gateway', owner: 'Sarah Connor', grade: 'confirmed' as const, status: 'FAIL' as const },
    { id: '2', name: 'AWS Cost Orchestrator', owner: 'Alex Rivera', grade: 'stated' as const, status: 'PASS' as const },
    { id: '3', name: 'Identity Token Mint', owner: 'Unknown', grade: 'unknown' as const, status: 'UNKNOWN' as const },
  ];

  return (
    <div className="min-h-screen bg-canvas text-ink transition-colors pb-24">
      {/* Top Bar Banner */}
      <header className="sticky top-0 z-40 border-b border-rule bg-surface/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-control bg-amber flex items-center justify-center font-serif text-lg font-bold text-ink-night shadow-xs">
            O
          </div>
          <div>
            <h1 className="font-serif text-xl font-normal leading-tight text-ink">
              OBA Design System & Living Look-and-Feel Preview
            </h1>
            <p className="text-xs text-ink-3">Phase A & B Design Verification Showcase</p>
          </div>
        </div>

        {/* Theme Switcher */}
        <div className="flex items-center gap-1.5 bg-surface-sunken p-1 rounded-control border border-rule">
          {(['light', 'dark', 'system'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleThemeChange(mode)}
              className={`px-3 py-1 text-xs font-medium rounded-control capitalize transition-colors ${
                currentTheme === mode
                  ? 'bg-surface text-ink shadow-xs border border-rule'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 pt-8 space-y-12">
        {/* Navigation Tabs */}
        <Tabs
          tabs={[
            { id: 'components', label: '1. Visual Building Blocks', count: 14 },
            { id: 'overview-preview', label: '2. Live Screen Preview (Overview & Cards)' },
            { id: 'states-preview', label: '3. Data States & Edge Cases' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* TAB 1: VISUAL BUILDING BLOCKS */}
        <TabPanel id="components" activeTab={activeTab} className="space-y-10">
          {/* Typography & Editorial Brand */}
          <section className="space-y-4">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-3">
              Typography System (Instrument Serif + Hanken Grotesk)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <span className="text-xs text-amber-ink font-mono uppercase tracking-wider">Editorial Serif Display</span>
                <p className="font-serif text-3xl font-normal text-ink mt-2">
                  Operational Continuity & Ownership Risk
                </p>
                <p className="font-serif text-xl italic text-ink-2 mt-1">
                  "Counted facts only. Never invented scores or percentages."
                </p>
              </Card>
              <Card>
                <span className="text-xs text-ink-3 font-mono uppercase tracking-wider">Grotesque Interface Sans</span>
                <p className="text-sm font-semibold text-ink mt-2">Hanken Grotesk System Interface</p>
                <p className="text-xs text-ink-2 mt-1 leading-relaxed">
                  High-contrast tabular numerals for density and legibility: <span className="tabular-nums font-mono">1,492 / 5,000 runs</span>
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink">Invariant 2 Check:</span>
                  <UnknownValue />
                  <span className="text-ink-3">vs</span>
                  <NoneValue />
                </div>
              </Card>
            </div>
          </section>

          {/* Semantic Marks & Evidence Grades */}
          <section className="space-y-4">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-3">
              Evidence Grades (Invariant 3) & Criticality Dots
            </h2>
            <Card className="space-y-6">
              <div>
                <p className="text-xs text-ink-2 mb-3">Evidence Grades with Source Attributions:</p>
                <div className="flex flex-wrap items-center gap-4">
                  <EvidenceBadge grade="confirmed">Confirmed · BambooHR</EvidenceBadge>
                  <EvidenceBadge grade="inferred">Inferred · Git Commit</EvidenceBadge>
                  <EvidenceBadge grade="stated">Stated · Self-report</EvidenceBadge>
                  <EvidenceBadge grade="unknown">Unknown · Unobserved</EvidenceBadge>
                </div>
              </div>

              <div className="border-t border-rule pt-4">
                <p className="text-xs text-ink-2 mb-3">Check Status Badges (Verification State):</p>
                <div className="flex flex-wrap items-center gap-3">
                  <CheckStatusBadge status="PASS">PASS: Confirmed Backup</CheckStatusBadge>
                  <CheckStatusBadge status="FAIL">FAIL: Single Point of Failure</CheckStatusBadge>
                  <CheckStatusBadge status="UNKNOWN">UNKNOWN: Unverified</CheckStatusBadge>
                </div>
              </div>

              <div className="border-t border-rule pt-4">
                <p className="text-xs text-ink-2 mb-3">Asset Criticality Dots (Never uses red for criticality):</p>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2 text-xs">
                    <CriticalityDots level="critical" />
                    <span>Critical (Tier 1)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CriticalityDots level="high" />
                    <span>High (Tier 2)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CriticalityDots level="medium" />
                    <span>Medium (Tier 3)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CriticalityDots level="low" />
                    <span>Low (Tier 4)</span>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Buttons & Action Controls */}
          <section className="space-y-4">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-3">
              Action Elements & Controls
            </h2>
            <Card className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="primary">Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="destructive">Destructive Action</Button>
                <Button
                  variant="primary"
                  isLoading={isBtnLoading}
                  onClick={() => {
                    setIsBtnLoading(true);
                    setTimeout(() => setIsBtnLoading(false), 2000);
                  }}
                >
                  {isBtnLoading ? 'Saving...' : 'Test Loading Spinner'}
                </Button>
              </div>

              <div className="border-t border-rule pt-4 flex flex-wrap items-center gap-3">
                <ActionPill onClick={() => setDrawerOpen(true)}>Inspect in Drawer →</ActionPill>
                <ActionPill href="#sample">Action Pill as Link</ActionPill>
              </div>
            </Card>
          </section>

          {/* Autocomplete Pickers */}
          <section className="space-y-4">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-3">
              Searchable Pickers (PersonPicker & EntityPicker)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <PersonPicker
                  label="Select Departing Employee or Backup"
                  options={peopleList}
                  value={selectedPerson}
                  onChange={setSelectedPerson}
                />
              </Card>
              <Card>
                <EntityPicker
                  label="Select Monitored Asset or System"
                  options={entityList}
                  value={selectedEntity}
                  onChange={setSelectedEntity}
                />
              </Card>
            </div>
          </section>
        </TabPanel>

        {/* TAB 2: SCREEN PREVIEW */}
        <TabPanel id="overview-preview" activeTab={activeTab} className="space-y-8">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-3">
                1. Headline Coverage Strip (SIM-07 Standard)
              </h2>
            </div>
            <CoverageStrip metrics={sampleCoverage} />
          </section>

          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-3">
              2. Priority Risk Items (Uniform Action Cards)
            </h2>
            <PriorityCard
              rank="01"
              category="Key Person Departure"
              problem="Sarah Connor departing in 4 days — 3 unbacked critical automations"
              criticalAssetsAffected={3}
              onReview={() => setDrawerOpen(true)}
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-3">
              3. Departure 5-Stage Stepper
            </h2>
            <Card>
              <StageStepper currentStage="successor_named" />
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-3">
              4. Named Share Distribution Bar
            </h2>
            <Card className="space-y-2">
              <span className="text-xs text-ink-3">Critical Automation Knowledge Share:</span>
              <NamedShareBar holders={sampleHolders} />
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-3">
              5. 48px Density Data Table with Column Sorting
            </h2>
            <DataTable
              columns={[
                { key: 'name', header: 'Asset / Automation', sortable: true },
                { key: 'owner', header: 'Owner', sortable: true },
                {
                  key: 'grade',
                  header: 'Evidence Grade',
                  render: (row) => <EvidenceBadge grade={row.grade} />,
                },
                {
                  key: 'status',
                  header: 'Check Status',
                  align: 'right',
                  render: (row) => <CheckStatusBadge status={row.status} />,
                },
              ]}
              data={tableData}
              keyExtractor={(r) => r.id}
              onRowClick={() => setDrawerOpen(true)}
            />
          </section>
        </TabPanel>

        {/* TAB 3: DATA STATES */}
        <TabPanel id="states-preview" activeTab={activeTab} className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-3">
              Loading Shimmer Skeletons (Invariant 5: Zero Fake Data)
            </h2>
            <Card className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <div className="grid grid-cols-3 gap-3 pt-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-3">
              Honest Empty State
            </h2>
            <EmptyState
              title="No Departures Planned"
              description="When team members submit notice or enter departure workflows, they will appear here with calculated asset impacts."
              actionLabel="Plan New Departure"
              onAction={() => alert('New Departure Wizard triggered')}
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-3">
              Error State with Synchronous Retry
            </h2>
            <ErrorState
              message="The BambooHR sync endpoint returned 503 Service Unavailable. Local cache is currently serving read-only data."
              onRetry={() => alert('Retrying fetch...')}
            />
          </section>
        </TabPanel>
      </main>

      {/* 560px Drawer Demonstration */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Asset Inspection: Stripe Webhook Gateway"
        description="Observed entity in production account aws-prod-01"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={() => setDrawerOpen(false)}>
              Reassign Backup
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="p-3 bg-surface-sunken rounded-control border border-rule text-xs space-y-1">
            <p className="font-semibold text-ink">Risk Diagnosis (SIM-01)</p>
            <p className="text-ink-2">
              Sarah Connor is the sole administrator of this endpoint. Departure scheduled in 4 days.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-ink-3 uppercase">Attested Runbook</h4>
            <Card className="text-xs text-ink-2">
              <p className="font-medium text-ink">docs/runbooks/stripe-failover.md</p>
              <div className="mt-2 flex items-center gap-2">
                <EvidenceBadge grade="stated">Stated · Self-reported</EvidenceBadge>
                <span className="text-ink-3">Last verified 14 days ago</span>
              </div>
            </Card>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
