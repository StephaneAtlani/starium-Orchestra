"use client";

import React from 'react';

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div className="space-y-2">
      <div className="px-2 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/60">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

