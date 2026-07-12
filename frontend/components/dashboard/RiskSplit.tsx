import { AlertCircle, FileText, UserPlus, ShieldAlert } from 'lucide-react';
import { Agent, Workflow } from '../../types';

interface RiskSplitProps {
  agents: Agent[];
  workflows: Workflow[];
}

export function RiskSplit({ agents, workflows }: RiskSplitProps) {
  // Get top critical agents
  const criticalAgents = agents
    .filter(a => a.criticality === 'critical')
    .slice(0, 5); // Take top 5

  // Generate some dynamic recommendations
  const recommendations = [];
  
  // 1. Orphaned critical agents
  const orphaned = agents.filter(a => !a.owner && a.criticality === 'critical');
  if (orphaned.length > 0) {
    recommendations.push({
      id: 'rec-1',
      title: 'Assign Owners to Critical Agents',
      description: `${orphaned.length} critical agent(s) operating without ownership oversight.`,
      icon: <UserPlus className="w-4 h-4 text-amber-400" />,
      type: 'urgent',
      action: 'Assign Now'
    });
  }

  // 2. Undocumented critical workflows
  const undocumented = workflows.filter(w => !w.documented && w.criticality === 'critical');
  if (undocumented.length > 0) {
    recommendations.push({
      id: 'rec-2',
      title: 'Document Critical Workflows',
      description: `${undocumented.length} highly critical workflow(s) lack formal documentation.`,
      icon: <FileText className="w-4 h-4 text-blue-400" />,
      type: 'warning',
      action: 'Review Docs'
    });
  }

  // 3. General proactive recommendation
  recommendations.push({
    id: 'rec-3',
    title: 'Review Single-Point Dependencies',
    description: '3 agents have no backup owner and are critical to revenue operations.',
    icon: <ShieldAlert className="w-4 h-4 text-indigo-400" />,
    type: 'proactive',
    action: 'Analyze Map'
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Left Column: Top Risks */}
      <div className="card p-6 flex flex-col">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">Top At-Risk Agents</h3>
            <p className="text-sm text-slate-400 mt-1">Agents requiring immediate attention</p>
          </div>
        </div>

        <div className="flex-grow flex flex-col space-y-3">
          {criticalAgents.map(agent => (
            <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg bg-[#16161c] border border-[#28283a] hover:border-[#3a3a52] transition-colors group">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">{agent.name}</h4>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
                    <span>{agent.department}</span>
                    <span>•</span>
                    <span className={!agent.owner ? 'text-amber-500/80' : ''}>
                      {agent.owner ? `Owner: ${agent.owner}` : 'No Owner'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase risk-critical">
                Critical
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Recommendations */}
      <div className="card p-6 flex flex-col">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white">Priority Actions</h3>
          <p className="text-sm text-slate-400 mt-1">AI-generated recommendations to improve continuity</p>
        </div>

        <div className="flex-grow flex flex-col space-y-4">
          {recommendations.map(rec => (
            <div key={rec.id} className="p-4 rounded-lg bg-[#1c1c24] border border-[#28283a] flex flex-col">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">
                  {rec.icon}
                </div>
                <div className="flex-grow">
                  <h4 className="text-sm font-medium text-white">{rec.title}</h4>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                    {rec.description}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <button className="text-xs font-medium px-4 py-1.5 rounded-full bg-[#28283a] text-white hover:bg-[#3a3a52] transition-colors">
                      {rec.action}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
