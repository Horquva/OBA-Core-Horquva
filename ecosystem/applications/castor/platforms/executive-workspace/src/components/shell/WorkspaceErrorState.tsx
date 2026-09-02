import React from 'react';

interface WorkspaceErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export const WorkspaceErrorState: React.FC<WorkspaceErrorStateProps> = ({
  title = 'Something went wrong',
  description,
  onRetry,
}) => {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center text-center py-10 px-4"
    >
      <div className="text-3xl mb-2" aria-hidden="true">⚠️</div>
      <h3 className="text-sm font-semibold text-red-700">{title}</h3>
      {description && (
        <p className="text-xs text-slate-500 mt-1 max-w-xs">{description}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 text-xs font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50"
        >
          Try again
        </button>
      )}
    </div>
  );
};

export default WorkspaceErrorState;
