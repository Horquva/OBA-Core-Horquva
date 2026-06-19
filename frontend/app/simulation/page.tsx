import { getDataset } from '../../lib/data';
import { SimulationDashboard } from '../../components/simulation/SimulationDashboard';

export default function SimulationPage() {
  const data = getDataset();

  return (
    <div style={{ height: 'calc(100vh - 2rem)' }}>
      <SimulationDashboard
        agents={data.agents}
        dependencies={data.dependencies}
        tools={data.ai_tools}
      />
    </div>
  );
}
