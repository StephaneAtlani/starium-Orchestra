"use client";

import React from 'react';

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div className="space-y-1">
      <div className="starium-sidebar-section-title px-3 text-[11px] font-semibold uppercase tracking-wide md:px-2.5 md:text-[10px]">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

