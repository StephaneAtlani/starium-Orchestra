"use client";

import React from 'react';

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div className="space-y-2">
      <div
        className="text-[0.65rem] font-semibold uppercase tracking-wide"
        style={{ color: 'rgba(255,255,255,0.6)' }}
      >
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

