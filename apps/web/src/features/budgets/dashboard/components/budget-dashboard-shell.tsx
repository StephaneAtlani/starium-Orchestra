'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Workspace = fond clair (FRONTEND_VISION.md §16 : blanc pour le contenu).
 * Pas de « thème cockpit » sombre isolé : cohérence avec le shell Starium.
 */
const COCKPIT = 'space-y-6';

export function BudgetDashboardShell({
  children,
  className,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(COCKPIT, className)} {...rest}>
      {children}
    </div>
  );
}

/** Cartes alignées sur shadcn `Card` / surface application */
export const cockpitCardClass =
  'border border-border bg-card text-card-foreground rounded-2xl shadow-sm';
