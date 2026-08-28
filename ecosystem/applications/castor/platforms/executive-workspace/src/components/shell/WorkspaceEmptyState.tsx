import React from 'react';

interface WorkspaceEmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const WorkspaceEmptyState: React.FC<WorkspaceEmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="text-3xl mb-2" aria-hidden="true">📭</div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 mt-1 max-w-xs">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default WorkspaceEmptyState;