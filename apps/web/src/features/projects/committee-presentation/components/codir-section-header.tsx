'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type CodirSectionHeaderProps = {
  number: number;
  title: string;
  subtitle?: string;
  className?: string;
};

export function CodirSectionHeader({ number, title, subtitle, className }: CodirSectionHeaderProps) {
  return (
    <div className={cn('starium-codir-section', className)}>
      <span className="starium-codir-section-num" aria-hidden>
        {number}
      </span>
      <span className="starium-codir-section-title">{title}</span>
      {subtitle ? <span className="starium-codir-section-sub">{subtitle}</span> : null}
    </div>
  );
}

type CodirPanelCardProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function CodirPanelCard({ title, children, className }: CodirPanelCardProps) {
  return (
    <div className={cn('rounded-xl border border-border/80 bg-card p-4 shadow-sm', className)}>
      <h3 className="mb-3 text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </div>
  );
}
