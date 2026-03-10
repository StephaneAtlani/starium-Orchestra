import React from 'react';

interface TableToolbarProps {
  children?: React.ReactNode;
  className?: string;
}

export function TableToolbar({ children = null, className }: TableToolbarProps) {
  return (
    <div
      className={
        className ??
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-2'
      }
    >
      {children}
    </div>
  );
}
