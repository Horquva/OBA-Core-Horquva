import React, { ReactNode, useState } from 'react';
import { NavigationItem, BreadcrumbItem } from '../../types/workspace.types';
import SidebarNav from './SidebarNav';
import TopNavBar from './TopNavBar';

interface ApplicationShellProps {
  navigationItems: NavigationItem[];
  userName: string;
  userRole: string;
  children: ReactNode;
}

export const ApplicationShell: React.FC<ApplicationShellProps> = ({
  navigationItems,
  userName,
  userRole,
  children,
}) => {
  const [activePath, setActivePath] = useState(
    navigationItems[0]?.path ?? '/'
  );

  const activeItem = navigationItems.find((item) => item.path === activePath);
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Workspace' },
    { label: activeItem?.label ?? 'Overview' },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <SidebarNav
        items={navigationItems}
        activePath={activePath}
        onNavigate={setActivePath}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <TopNavBar
          breadcrumbs={breadcrumbs}
          userName={userName}
          userRole={userRole}
        />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ApplicationShell;