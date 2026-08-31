import { getDataset } from '../../lib/data';
import { computeNetworkRisk } from '../../lib/networkRisk';
import { CentralityGraph } from '../../components/network/CentralityGraph';

export default function NetworkPage() {
  const dataset = getDataset();
  const report = computeNetworkRisk(dataset);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
      
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Network Visualization</h1>
        <p className="text-sm text-[color:var(--text-secondary)] mt-1">
          People-centric dependency topology. Uncovers human bottlenecks and hidden siloes across the organization.
        </p>
      </div>

      <CentralityGraph report={report} />
      
    </div>
  );
}
