import React from 'react';
import { WidgetContainerProps } from '../../types/workspace.types';

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  id,
  title,
  subtitle,
  isLoading = false,
  error,
  children,
  onRefresh,
}) => {
  return (
    <div
      id={id}
      className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm h-full"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              aria-label="Refresh widget"
              className="text-slate-400 hover:text-slate-700 transition-colors text-sm px-2 py-1 rounded-md hover:bg-slate-100"
            >
              ⟳
            </button>
          )}
          <button
            aria-label="Widget menu"
            className="text-slate-400 hover:text-slate-700 transition-colors text-sm px-2 py-1 rounded-md hover:bg-slate-100"
          >
            ⋯
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 w-full h-full">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-24 bg-slate-200 rounded" />
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2"
          >
            <span>⚠</span>
            <span>{error}</span>
          </div>
        ) : (
          <div className="w-full h-full">{children}</div>
        )}
      </div>
    </div>
  );
};

export default WidgetContainer;