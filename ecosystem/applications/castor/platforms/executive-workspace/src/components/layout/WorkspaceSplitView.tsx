import React, { ReactNode } from 'react';

interface WorkspaceSplitViewProps {
  left: ReactNode;
  right: ReactNode;
  leftWidth?: 'equal' | 'narrow' | 'wide';
}

const widthClasses: Record<string, string> = {
  equal: 'md:grid-cols-2',
  narrow: 'md:grid-cols-[1fr_2fr]',
  wide: 'md:grid-cols-[2fr_1fr]',
};

export const WorkspaceSplitView: React.FC<WorkspaceSplitViewProps> = ({
  left,
  right,
  leftWidth = 'equal',
}) => {
  return (
    <div className={`grid grid-cols-1 ${widthClasses[leftWidth]} gap-4 w-full`}>
      <div className="min-w-0">{left}</div>
      <div className="min-w-0">{right}</div>
    </div>
  );
};

export default WorkspaceSplitView;