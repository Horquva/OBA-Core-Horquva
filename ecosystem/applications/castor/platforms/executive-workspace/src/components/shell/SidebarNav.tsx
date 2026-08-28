import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NavigationItem } from '../../types/workspace.types';

interface SidebarNavProps {
  items: NavigationItem[];
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ items }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={`flex flex-col h-full bg-slate-900 text-slate-200 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-4">
        {!collapsed && (
          <span className="font-semibold text-sm tracking-wide">
            WOBA
          </span>
        )}
        <button
          data-testid="sidebar-toggle"
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed((prev) => !prev)}
          className="text-slate-400 hover:text-white text-sm p-1 rounded hover:bg-slate-800"
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="flex-1 px-2 space-y-1">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon && <span aria-hidden="true">{item.icon}</span>}
              {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="text-xs bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default SidebarNav;