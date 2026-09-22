'use client';

import { useState, useCallback } from 'react';
import { CollaborationScoreCard } from '../../components/org-science/CollaborationScoreCard';
import { LearningMaturityCard } from '../../components/org-science/LearningMaturityCard';
import { PatternRegularityCard } from '../../components/org-science/PatternRegularityCard';
import { CapabilityInventoryCard } from '../../components/org-science/CapabilityInventoryCard';
import { OwnershipCoverageCard } from '../../components/org-science/OwnershipCoverageCard';
import { DNAFingerprintCard } from '../../components/org-science/DNAFingerprintCard';
import { CultureHealthCard } from '../../components/org-science/CultureHealthCard';
import { MaturityCurveCard } from '../../components/org-science/MaturityCurveCard';
import { BehavioralProfileCard } from '../../components/org-science/BehavioralProfileCard';
import { IndustryBenchmarkCard } from '../../components/org-science/IndustryBenchmarkCard';
import { GraphFreshnessBanner } from '../../components/org-science/GraphFreshnessBanner';
import { OwnershipMapCard } from '../../components/org-science/OwnershipMapCard';
import { DependencyFanInCard } from '../../components/org-science/DependencyFanInCard';
import { OrganizationalRiskCard } from '../../components/org-science/OrganizationalRiskCard';
import { AiAgentGovernanceCard } from '../../components/org-science/AiAgentGovernanceCard';
import { ReportingChainsCard } from '../../components/org-science/ReportingChainsCard';
import { DependencyGraphCard } from '../../components/org-science/DependencyGraphCard';
import { RelationshipsCard } from '../../components/org-science/RelationshipsCard';
import { EcosystemCard } from '../../components/org-science/EcosystemCard';
import { DependencyImpactCard } from '../../components/org-science/DependencyImpactCard';
import { HiddenDependenciesCard } from '../../components/org-science/HiddenDependenciesCard';
import { NetworkCentralityCard } from '../../components/org-science/NetworkCentralityCard';
import { DigitalTwinCard } from '../../components/org-science/DigitalTwinCard';

export default function OrgSciencePage() {
  const [reloadNonce, setReloadNonce] = useState(0);
  const handleReload = useCallback(() => setReloadNonce((n) => n + 1), []);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)] tracking-tight mb-1">
            Strategic &amp; Org Science
          </h1>
          <p className="text-[color:var(--text-secondary)] text-sm">
            Deep organizational behavioral analysis, culture health, and maturity curve positioning.
          </p>
        </div>
        <GraphFreshnessBanner onReload={handleReload} />
      </div>

      <div key={reloadNonce} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-up delay-150">
        <CollaborationScoreCard />
        <LearningMaturityCard />
        <PatternRegularityCard />
        <CapabilityInventoryCard />
        <OwnershipCoverageCard />
        <DNAFingerprintCard />
        <CultureHealthCard />
        <MaturityCurveCard />
        <BehavioralProfileCard />
        <IndustryBenchmarkCard />
      </div>

      {/* Knowledge Graph — structural intelligence wired 2026-09-02.
          M01/M02/M03/M07/M20/M28/M29/M31/M34/M35 (Huzaifa's reality layer)
          + M32/M49 (Tahir's prediction layer) — see backend/brain/README.md's
          "Known gaps" for the audit that found each one had real capability
          nothing else computed but no route calling it. */}
      <div className="animate-fade-up">
        <div className="mb-4 mt-4">
          <h2 className="text-lg font-bold text-[color:var(--text-primary)] tracking-tight mb-1">
            Knowledge Graph — Structural Intelligence
          </h2>
          <p className="text-[color:var(--text-secondary)] text-sm">
            Ownership, dependency, and network structure read directly from the Knowledge Graph — twelve analyses wired up 2026-09-02.
          </p>
        </div>
      </div>

      <div key={`graph-${reloadNonce}`} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-up delay-150">
        <OwnershipMapCard />
        <DependencyFanInCard />
        <OrganizationalRiskCard />
        <AiAgentGovernanceCard />
        <ReportingChainsCard />
        <DependencyGraphCard />
        <RelationshipsCard />
        <EcosystemCard />
        <DependencyImpactCard />
        <HiddenDependenciesCard />
        <NetworkCentralityCard />
        <DigitalTwinCard />
      </div>
    </div>
  );
}
