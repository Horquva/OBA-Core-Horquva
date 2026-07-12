import { getDataset } from '../../lib/data';
import { DependencyKPIs } from '../../components/map/DependencyKPIs';
import { FlowCanvas } from '../../components/map/FlowCanvas';
import { DependencyTable } from '../../components/map/DependencyTable';
import { getSPOFs, getDownstream } from '../../lib/graph';

export const metadata = {
  title: 'Dependency Intelligence | Horquva',
};

export default function DependencyMapPage() {
  const data = getDataset();
  
  const spofs = getSPOFs(data.agents, data.dependencies);
  
  let maxCascadeRisk = 0;
  data.agents.forEach(agent => {
    const victims = getDownstream(agent.id, data.dependencies);
    if (victims.size > maxCascadeRisk) {
      maxCascadeRisk = victims.size;
    }
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Dependency Intelligence</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Map how agents depend on each other, detect single points of failure, and simulate cascading risks.
        </p>
      </div>

      <DependencyKPIs 
        totalAgents={data.agents.length}
        totalDependencies={data.dependencies.length}
        spofCount={spofs.length}
        maxCascadeRisk={maxCascadeRisk}
      />

      <div className="animate-fade-up delay-300 mb-8">
        <FlowCanvas agents={data.agents} dependencies={data.dependencies} />
      </div>

      <div className="animate-fade-up delay-400">
        <DependencyTable agents={data.agents} dependencies={data.dependencies} />
      </div>
    </div>
  );
}
