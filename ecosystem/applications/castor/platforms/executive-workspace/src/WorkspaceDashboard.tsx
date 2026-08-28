import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ApplicationShell from './components/shell/ApplicationShell';
import WorkspaceGrid from './components/layout/WorkspaceGrid';
import WidgetContainer from './components/widgets/WidgetContainer';
import { NavigationItem } from './types/workspace.types';

const navigationItems: NavigationItem[] = [
  { id: 'overview', label: 'Overview', icon: '📊', path: '/overview' },
  { id: 'intelligence', label: 'Intelligence', icon: '🧠', path: '/intelligence' },
  { id: 'operations', label: 'Operations', icon: '⚙️', path: '/operations', badge: '3' },
  { id: 'approvals', label: 'Approvals', icon: '✅', path: '/approvals' },
];

const OverviewPage: React.FC = () => (
  <WorkspaceGrid columns={4} gap="md">
    <WidgetContainer id="revenue" title="Revenue" subtitle="This quarter">
      <div className="text-2xl font-bold text-slate-800">$1.2M</div>
    </WidgetContainer>

    <WidgetContainer id="headcount" title="Headcount" isLoading>
      <div />
    </WidgetContainer>

    <WidgetContainer
      id="pipeline"
      title="Pipeline"
      error="Failed to load pipeline data"
    >
      <div />
    </WidgetContainer>

    <WidgetContainer id="briefing" title="AI Briefing" subtitle="Daily summary">
      <p className="text-sm text-slate-600">
        All KPIs trending within expected range.
      </p>
    </WidgetContainer>
  </WorkspaceGrid>
);

const IntelligencePage: React.FC = () => (
  <WorkspaceGrid columns={2} gap="md">
    <WidgetContainer id="ai-insights" title="AI Insights" subtitle="Latest analysis">
      <p className="text-sm text-slate-600">No insights generated yet.</p>
    </WidgetContainer>
  </WorkspaceGrid>
);

const OperationsPage: React.FC = () => (
  <WorkspaceGrid columns={3} gap="md">
    <WidgetContainer id="ops-status" title="Operations Status">
      <p className="text-sm text-slate-600">All systems operational.</p>
    </WidgetContainer>
  </WorkspaceGrid>
);

const ApprovalsPage: React.FC = () => (
  <WorkspaceGrid columns={1} gap="md">
    <WidgetContainer id="pending-approvals" title="Pending Approvals">
      <p className="text-sm text-slate-600">No pending approvals.</p>
    </WidgetContainer>
  </WorkspaceGrid>
);

export const WorkspaceDashboard: React.FC = () => {
  return (
    <BrowserRouter>
      <ApplicationShell
        navigationItems={navigationItems}
        userName="Taha Zaidi"
        userRole="Executive Admin"
      >
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/intelligence" element={<IntelligencePage />} />
          <Route path="/operations" element={<OperationsPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
        </Routes>
      </ApplicationShell>
    </BrowserRouter>
  );
};

export default WorkspaceDashboard;