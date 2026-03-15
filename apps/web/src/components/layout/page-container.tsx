import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Conteneur de page : espacement vertical uniquement.
 * Le padding horizontal et max-width sont gérés par le shell (AppShell).
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={className ?? 'space-y-6'}>
      {children}
    </div>
  );
}
