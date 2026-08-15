import React from 'react';
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

export const WorkspaceDashboard: React.FC = () => {
  return (
    <ApplicationShell
      navigationItems={navigationItems}
      userName="Taha Zaidi"
      userRole="Executive Admin"
    >
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
    </ApplicationShell>
  );
};

export default WorkspaceDashboard;