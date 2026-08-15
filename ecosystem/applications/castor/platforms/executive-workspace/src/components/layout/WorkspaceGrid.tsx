import React from 'react';
import { WorkspaceGridProps } from '../../types/workspace.types';

const columnClasses: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

const gapClasses: Record<string, string> = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

export const WorkspaceGrid: React.FC<WorkspaceGridProps> = ({
  columns = 4,
  gap = 'md',
  children,
}) => {
  return (
    <div
      className={`grid ${columnClasses[columns]} ${gapClasses[gap]} p-4 w-full`}
    >
      {children}
    </div>
  );
};

export default WorkspaceGrid;