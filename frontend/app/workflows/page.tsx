import { WorkflowStepChain } from '../../components/workflows/WorkflowStepChain';
import { CollisionDetector } from '../../components/workflows/CollisionDetector';
import { VerificationLedger } from '../../components/workflows/VerificationLedger';
import { SelfHealingFeed } from '../../components/workflows/SelfHealingFeed';

export default function WorkflowsPage() {
  return (
    <div className="space-y-8 pb-12">
      {/* Header — matches RiskHeader title pattern */}
      <div className="animate-fade-up">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gradient tracking-tight mb-1">
            Workflow &amp; Orchestration
          </h1>
          <p className="text-[color:var(--text-secondary)] text-sm">
            End-to-end workflow intelligence, collision detection, verification audit trail,
            and self-healing status.
          </p>
        </div>
      </div>

      <WorkflowStepChain />
      <CollisionDetector />
      <VerificationLedger />
      <SelfHealingFeed />
    </div>
  );
}
