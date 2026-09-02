import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ApplicationShell from '../src/components/shell/ApplicationShell';
import { NavigationItem } from '../src/types/workspace.types';

const navItems: NavigationItem[] = [
  { id: 'overview', label: 'Overview', path: '/overview' },
  { id: 'operations', label: 'Operations', path: '/operations' },
];

describe('Routing', () => {
  it('renders the Overview page content when at /overview', () => {
    render(
      <MemoryRouter initialEntries={['/overview']}>
        <ApplicationShell navigationItems={navItems} userName="Taha" userRole="Admin">
          <Routes>
            <Route path="/overview" element={<div>Overview Page Content</div>} />
            <Route path="/operations" element={<div>Operations Page Content</div>} />
          </Routes>
        </ApplicationShell>
      </MemoryRouter>
    );
    expect(screen.getByText('Overview Page Content')).toBeInTheDocument();
    expect(screen.queryByText('Operations Page Content')).not.toBeInTheDocument();
  });

  it('renders the Operations page content when at /operations', () => {
    render(
      <MemoryRouter initialEntries={['/operations']}>
        <ApplicationShell navigationItems={navItems} userName="Taha" userRole="Admin">
          <Routes>
            <Route path="/overview" element={<div>Overview Page Content</div>} />
            <Route path="/operations" element={<div>Operations Page Content</div>} />
          </Routes>
        </ApplicationShell>
      </MemoryRouter>
    );
    expect(screen.getByText('Operations Page Content')).toBeInTheDocument();
    expect(screen.queryByText('Overview Page Content')).not.toBeInTheDocument();
  });
});
