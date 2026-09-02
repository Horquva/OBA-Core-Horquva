import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface TabItem {
  label: string;
  path: string;
}

interface WorkspaceTabsProps {
  tabs: TabItem[];
}

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({ tabs }) => {
  const location = useLocation();

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 px-4">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
};

export default WorkspaceTabs;