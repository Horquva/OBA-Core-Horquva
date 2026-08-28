'use client';

import { useState, useCallback } from 'react';
import { CollaborationScoreCard } from '../../components/org-science/CollaborationScoreCard';
import { LearningMaturityCard } from '../../components/org-science/LearningMaturityCard';
import { PatternRegularityCard } from '../../components/org-science/PatternRegularityCard';
import { CapabilityByDeptCard } from '../../components/org-science/CapabilityByDeptCard';
import { StrategicAlignmentCard } from '../../components/org-science/StrategicAlignmentCard';
import { DNAFingerprintCard } from '../../components/org-science/DNAFingerprintCard';
import { CultureHealthCard } from '../../components/org-science/CultureHealthCard';
import { MaturityCurveCard } from '../../components/org-science/MaturityCurveCard';
import { BehavioralProfileCard } from '../../components/org-science/BehavioralProfileCard';
import { IndustryBenchmarkCard } from '../../components/org-science/IndustryBenchmarkCard';
import { GraphFreshnessBanner } from '../../components/org-science/GraphFreshnessBanner';

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
        <CapabilityByDeptCard />
        <StrategicAlignmentCard />
        <DNAFingerprintCard />
        <CultureHealthCard />
        <MaturityCurveCard />
        <BehavioralProfileCard />
        <IndustryBenchmarkCard />
      </div>
    </div>
  );
}
