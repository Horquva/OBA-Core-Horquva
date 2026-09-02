import React, { ReactNode } from 'react';
import { useWorkspaceState } from '../../context/WorkspaceStateContext';

interface WorkspacePanelProps {
  id: string;
  title: string;
  children: ReactNode;
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({ id, title, children }) => {
  const { state, setActivePanel } = useWorkspaceState();
  const isActive = state.activePanel === id;

  return (
    <section
      role="region"
      aria-label={title}
      onClick={() => setActivePanel(id)}
      className={`rounded-xl border transition-colors cursor-pointer ${
        isActive
          ? 'border-indigo-400 bg-indigo-50/40 ring-1 ring-indigo-300'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {isActive && (
          <span className="text-xs font-medium text-indigo-600">Active</span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
};

export default WorkspacePanel;