import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import ApplicationShell from '../src/components/shell/ApplicationShell';
import WidgetContainer from '../src/components/widgets/WidgetContainer';
import { NavigationItem } from '../src/types/workspace.types';

const navItems: NavigationItem[] = [
  { id: 'overview', label: 'Overview', path: '/overview' },
  { id: 'ops', label: 'Operations', path: '/operations' },
];

describe('ApplicationShell', () => {
  it('renders top navigation and sidebar without crashing', () => {
    render(
      <MemoryRouter initialEntries={['/overview']}>
        <ApplicationShell navigationItems={navItems} userName="Taha" userRole="Admin">
          <div>Content</div>
        </ApplicationShell>
      </MemoryRouter>
    );
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
    expect(screen.getByText('Taha')).toBeInTheDocument();
  });

  it('collapses and expands the sidebar on toggle', () => {
    render(
      <MemoryRouter initialEntries={['/overview']}>
        <ApplicationShell navigationItems={navItems} userName="Taha" userRole="Admin">
          <div>Content</div>
        </ApplicationShell>
      </MemoryRouter>
    );
    const toggle = screen.getByTestId('sidebar-toggle');
    expect(screen.getByText('WOBA')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByText('WOBA')).not.toBeInTheDocument();
  });
});

describe('WidgetContainer', () => {
  it('renders title and children in the slot', () => {
    render(
      <WidgetContainer id="w1" title="Revenue">
        <span>$1.2M</span>
      </WidgetContainer>
    );
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$1.2M')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    const { container } = render(
      <WidgetContainer id="w2" title="Headcount" isLoading>
        <span>Hidden</span>
      </WidgetContainer>
    );
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });
});
