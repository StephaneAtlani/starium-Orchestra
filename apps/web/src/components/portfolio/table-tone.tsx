'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { toneAmountClass, toneDsBadgeClass, type StatusTone } from './status-tone';

/** Montant / % coloré dans une cellule. */
export function TableToneAmount({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('tabular-nums font-medium', toneAmountClass(tone), className)}>
      {children}
    </span>
  );
}

/** Badge statut dans une cellule (texte + couleur, jamais couleur seule). */
export function TableToneBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn(toneDsBadgeClass(tone), 'w-fit', className)}>{children}</span>
  );
}

/** Classes de ligne en alerte (fond teinté). */
export function tableAlertRowClass(alert: boolean | StatusTone | null | undefined): string {
  if (!alert) return '';
  const tone = alert === true ? 'danger' : alert;
  switch (tone) {
    case 'danger':
      return 'bg-destructive/5';
    case 'warn':
      return 'bg-[color:var(--state-warning)]/8';
    case 'info':
      return 'bg-[color:var(--state-info)]/8';
    default:
      return '';
  }
}
