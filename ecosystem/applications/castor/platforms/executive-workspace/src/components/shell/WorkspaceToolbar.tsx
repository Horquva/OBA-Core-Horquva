import React, { ReactNode } from 'react';

interface WorkspaceToolbarProps {
  title?: string;
  children: ReactNode;
}

export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({ title, children }) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white">
      {title && <h3 className="text-sm font-medium text-slate-700">{title}</h3>}
      <div className="flex items-center gap-2 ml-auto">{children}</div>
    </div>
  );
};

export default WorkspaceToolbar;