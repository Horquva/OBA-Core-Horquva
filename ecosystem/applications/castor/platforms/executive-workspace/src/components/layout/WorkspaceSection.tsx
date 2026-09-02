import React, { ReactNode } from 'react';

interface WorkspaceSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export const WorkspaceSection: React.FC<WorkspaceSectionProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <section className="mb-6 px-4">
      <div className="mb-2">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
};

export default WorkspaceSection;