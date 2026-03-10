import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={className ?? 'p-6 space-y-6 max-w-7xl mx-auto'}
    >
      {children}
    </div>
  );
}
