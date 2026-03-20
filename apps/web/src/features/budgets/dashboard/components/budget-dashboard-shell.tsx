'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Workspace = fond clair (FRONTEND_VISION.md §16 : blanc pour le contenu).
 * Pas de « thème cockpit » sombre isolé : cohérence avec le shell Starium.
 */
const COCKPIT = 'space-y-8';

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

export {
  cockpitCardClass,
  CockpitSection,
  CockpitSurfaceCard,
} from './budget-cockpit-primitives';
