'use client';

import { RegistryBadge } from '@/lib/ui/registry-badge';
import { PROJECT_RISK_CRITICALITY_LABEL } from '../../constants/project-enum-labels';
import type { ProjectRiskCriticalityLevel } from '../../types/project.types';

function criticalityBadgeClass(level: string): string {
  switch (level) {
    case 'CRITICAL':
      return 'border-violet-500/50 bg-violet-500/10 text-violet-950 dark:text-violet-300';
    case 'HIGH':
      return 'border-red-500/50 bg-red-500/10 text-red-800 dark:text-red-300';
    case 'MEDIUM':
      return 'border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-600';
    default:
      return 'border-emerald-600/45 bg-emerald-500/10 text-emerald-950 dark:text-emerald-500';
  }
}

export function RiskLevelBadge({ level }: { level: ProjectRiskCriticalityLevel | string }) {
  const label = PROJECT_RISK_CRITICALITY_LABEL[level as ProjectRiskCriticalityLevel] ?? level;
  return (
    <RegistryBadge className={criticalityBadgeClass(level)}>{label}</RegistryBadge>
  );
}
