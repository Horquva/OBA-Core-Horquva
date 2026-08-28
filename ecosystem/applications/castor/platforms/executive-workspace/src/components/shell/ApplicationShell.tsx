import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();

  const activeItem = navigationItems.find((item) => item.path === location.pathname);
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Workspace' },
    { label: activeItem?.label ?? 'Overview' },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <SidebarNav items={navigationItems} />

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