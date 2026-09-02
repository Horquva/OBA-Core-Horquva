import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import WorkspacePanel from '../src/components/layout/WorkspacePanel';
import WorkspaceSplitView from '../src/components/layout/WorkspaceSplitView';
import WorkspaceTabs from '../src/components/shell/WorkspaceTabs';
import { WorkspaceStateProvider } from '../src/context/WorkspaceStateContext';

describe('WorkspacePanel', () => {
  it('renders its title and children', () => {
    render(
      <WorkspaceStateProvider>
        <WorkspacePanel id="panel-1" title="Test Panel">
          <p>Panel content</p>
        </WorkspacePanel>
      </WorkspaceStateProvider>
    );
    expect(screen.getByText('Test Panel')).toBeInTheDocument();
    expect(screen.getByText('Panel content')).toBeInTheDocument();
  });

  it('marks itself as active when clicked', () => {
    render(
      <WorkspaceStateProvider>
        <WorkspacePanel id="panel-1" title="Test Panel">
          <p>Panel content</p>
        </WorkspacePanel>
      </WorkspaceStateProvider>
    );
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Test Panel'));
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});

describe('WorkspaceSplitView', () => {
  it('renders both left and right content', () => {
    render(
      <WorkspaceSplitView
        left={<div>Left content</div>}
        right={<div>Right content</div>}
      />
    );
    expect(screen.getByText('Left content')).toBeInTheDocument();
    expect(screen.getByText('Right content')).toBeInTheDocument();
  });
});

describe('WorkspaceTabs', () => {
  it('renders all tab labels', () => {
    render(
      <MemoryRouter initialEntries={['/intelligence/insights']}>
        <WorkspaceTabs
          tabs={[
            { label: 'Insights', path: '/intelligence/insights' },
            { label: 'Reports', path: '/intelligence/reports' },
          ]}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('marks the tab matching the current URL as active', () => {
    render(
      <MemoryRouter initialEntries={['/intelligence/reports']}>
        <WorkspaceTabs
          tabs={[
            { label: 'Insights', path: '/intelligence/insights' },
            { label: 'Reports', path: '/intelligence/reports' },
          ]}
        />
      </MemoryRouter>
    );
    const reportsTab = screen.getByText('Reports');
    expect(reportsTab.className).toContain('text-indigo-600');
  });
});