'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', bordered = true }) => {
  return (
    <div className={`bg-zinc-900/60 backdrop-blur-sm rounded-xl p-6 ${bordered ? 'border border-zinc-800' : ''} ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`mb-4 border-b border-zinc-800/80 pb-3 ${className}`}>{children}</div>
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between ${className}`}>{children}</div>
);