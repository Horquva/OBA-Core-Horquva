import React from 'react';
import { BreadcrumbItem } from '../../types/workspace.types';
import Breadcrumbs from './Breadcrumbs';

interface TopNavBarProps {
  breadcrumbs: BreadcrumbItem[];
  userName: string;
  userRole: string;
  onSearchClick?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  breadcrumbs,
  userName,
  userRole,
  onSearchClick,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
      <Breadcrumbs items={breadcrumbs} />

      <div className="flex items-center gap-4">
        <button
          onClick={onSearchClick}
          aria-label="Search"
          className="text-slate-400 hover:text-slate-700 text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          🔍 Search
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
            {userName.charAt(0)}
          </div>
          <div className="text-sm">
            <p className="font-medium text-slate-800 leading-none">{userName}</p>
            <p className="text-xs text-slate-500">{userRole}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavBar;