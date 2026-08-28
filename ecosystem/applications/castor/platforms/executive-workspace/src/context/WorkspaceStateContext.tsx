import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface WorkspaceState {
  activePanel: string | null;
  selectedContext: string | null;
  filters: Record<string, string>;
}

interface WorkspaceStateContextValue {
  state: WorkspaceState;
  setActivePanel: (panelId: string | null) => void;
  setSelectedContext: (context: string | null) => void;
  setFilter: (key: string, value: string) => void;
  clearFilter: (key: string) => void;
  resetState: () => void;
}

const defaultState: WorkspaceState = {
  activePanel: null,
  selectedContext: null,
  filters: {},
};

const WorkspaceStateContext = createContext<WorkspaceStateContextValue | undefined>(undefined);

export const WorkspaceStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WorkspaceState>(defaultState);

  const setActivePanel = (panelId: string | null) => {
    setState((prev) => ({ ...prev, activePanel: panelId }));
  };

  const setSelectedContext = (context: string | null) => {
    setState((prev) => ({ ...prev, selectedContext: context }));
  };

  const setFilter = (key: string, value: string) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
    }));
  };

  const clearFilter = (key: string) => {
    setState((prev) => {
      const nextFilters = { ...prev.filters };
      delete nextFilters[key];
      return { ...prev, filters: nextFilters };
    });
  };

  const resetState = () => {
    setState(defaultState);
  };

  return (
    <WorkspaceStateContext.Provider
      value={{ state, setActivePanel, setSelectedContext, setFilter, clearFilter, resetState }}
    >
      {children}
    </WorkspaceStateContext.Provider>
  );
};

export const useWorkspaceState = (): WorkspaceStateContextValue => {
  const context = useContext(WorkspaceStateContext);
  if (!context) {
    throw new Error('useWorkspaceState must be used within a WorkspaceStateProvider');
  }
  return context;
};