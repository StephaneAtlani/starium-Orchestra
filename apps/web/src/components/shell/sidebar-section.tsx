"use client";

import React from 'react';

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div className="space-y-1">
      <div className="starium-sidebar-section-title px-2.5 text-[10px] font-semibold uppercase tracking-wide">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

