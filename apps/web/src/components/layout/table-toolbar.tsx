import React from 'react';

import { cn } from '@/lib/utils';

interface TableToolbarProps {
  children?: React.ReactNode;
  className?: string;
}

export function TableToolbar({ children = null, className }: TableToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-2',
        className
      )}
    >
      {children}
    </div>
  );
}
