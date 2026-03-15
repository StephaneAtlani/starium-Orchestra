"use client";

import React from 'react';

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div className="space-y-2">
      <div className="starium-sidebar-section-title px-3 text-xs font-semibold uppercase tracking-wider">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

