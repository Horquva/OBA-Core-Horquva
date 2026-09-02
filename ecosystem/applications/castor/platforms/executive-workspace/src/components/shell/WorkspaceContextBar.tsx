import React from 'react';

interface WorkspaceContextBarProps {
  contextLabel: string;
  onSearchClick?: () => void;
}

export const WorkspaceContextBar: React.FC<WorkspaceContextBarProps> = ({
  contextLabel,
  onSearchClick,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-slate-100 border-b border-slate-200 text-xs text-slate-600">
      <span>Viewing: <span className="font-medium text-slate-800">{contextLabel}</span></span>
      {onSearchClick && (
        <button
          onClick={onSearchClick}
          aria-label="Open global search"
          className="text-slate-500 hover:text-slate-800"
        >
          🔍 Search everything
        </button>
      )}
    </div>
  );
};

export default WorkspaceContextBar;