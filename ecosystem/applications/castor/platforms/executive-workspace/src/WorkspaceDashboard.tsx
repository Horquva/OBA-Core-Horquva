import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ApplicationShell from './components/shell/ApplicationShell';
import WorkspaceGrid from './components/layout/WorkspaceGrid';
import WorkspaceSection from './components/layout/WorkspaceSection';
import WorkspacePanel from './components/layout/WorkspacePanel';
import WorkspaceSplitView from './components/layout/WorkspaceSplitView';
import WidgetContainer from './components/widgets/WidgetContainer';
import WorkspaceTabs from './components/shell/WorkspaceTabs';
import { WorkspaceStateProvider } from './context/WorkspaceStateContext';
import { LayoutDashboard, Brain, Settings, CheckCircle2 } from 'lucide-react';
import { NavigationItem } from './types/workspace.types';

const navigationItems: NavigationItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} />, path: '/overview' },
  { id: 'intelligence', label: 'Intelligence', icon: <Brain size={18} />, path: '/intelligence' },
  { id: 'operations', label: 'Operations', icon: <Settings size={18} />, path: '/operations', badge: '3' },
  { id: 'approvals', label: 'Approvals', icon: <CheckCircle2 size={18} />, path: '/approvals' },
];

const intelligenceTabs = [
  { label: 'Insights', path: '/intelligence/insights' },
  { label: 'Reports', path: '/intelligence/reports' },
];
const OverviewPage: React.FC = () => (
  <div>
    <WorkspaceSection title="Key Metrics" description="Live financial and operational snapshot">
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
    </WorkspaceSection>

    <WorkspaceSection title="Focus Areas" description="Click a panel to mark it active">
      <WorkspaceSplitView
        left={
          <WorkspacePanel id="focus-revenue" title="Revenue Deep Dive">
            <p className="text-sm text-slate-600">
              Drill into revenue trends by region and product line.
            </p>
          </WorkspacePanel>
        }
        right={
          <WorkspacePanel id="focus-risk" title="Risk Watch">
            <p className="text-sm text-slate-600">
              Monitor flagged accounts and compliance exceptions.
            </p>
          </WorkspacePanel>
        }
      />
    </WorkspaceSection>
  </div>
);
const InsightsTab: React.FC = () => (
  <WorkspaceGrid columns={2} gap="md">
    <WidgetContainer id="ai-insights" title="AI Insights" subtitle="Latest analysis">
      <p className="text-sm text-slate-600">No insights generated yet.</p>
    </WidgetContainer>
  </WorkspaceGrid>
);

const ReportsTab: React.FC = () => (
  <WorkspaceGrid columns={2} gap="md">
    <WidgetContainer id="ai-reports" title="Generated Reports" subtitle="Weekly digest">
      <p className="text-sm text-slate-600">No reports generated yet.</p>
    </WidgetContainer>
  </WorkspaceGrid>
);

const IntelligencePage: React.FC = () => (
  <div>
    <WorkspaceTabs tabs={intelligenceTabs} />
    <div className="p-4">
      <Routes>
        <Route path="/" element={<Navigate to="/intelligence/insights" replace />} />
        <Route path="insights" element={<InsightsTab />} />
        <Route path="reports" element={<ReportsTab />} />
      </Routes>
    </div>
  </div>
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
    <WorkspaceStateProvider>
      <BrowserRouter>
        <ApplicationShell
          navigationItems={navigationItems}
          userName="Taha Zaidi"
          userRole="Executive Admin"
        >
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/intelligence/*" element={<IntelligencePage />} />
            <Route path="/operations" element={<OperationsPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
          </Routes>
        </ApplicationShell>
      </BrowserRouter>
    </WorkspaceStateProvider>
  );
};

export default WorkspaceDashboard;