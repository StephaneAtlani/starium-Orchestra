'use client';

import { RegistryBadge } from '@/lib/ui/registry-badge';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';
import type { ActionPlanApi } from '../types/project.types';
import {
  actionPlanPriorityLabel,
  actionPlanStatusLabel,
  actionPlanStatusToLifecycleKey,
  isKnownActionPlanPriority,
} from '../lib/action-plan-display';
import type { ProjectEntityPriorityKey } from '@/lib/ui/badge-registry';

export function ActionPlanMetaBadges({ plan }: { plan: ActionPlanApi }) {
  const { merged } = useClientUiBadgeConfig();
  const lifecycleKey = actionPlanStatusToLifecycleKey(plan.status);
  const statusBadge = merged.projectLifecycleStatus[lifecycleKey];
  const statusLabel = actionPlanStatusLabel(plan.status);

  const priorityKnown = isKnownActionPlanPriority(plan.priority);
  const priorityEntry = priorityKnown
    ? merged.projectEntityPriority[plan.priority as ProjectEntityPriorityKey]
    : undefined;
  const priorityWord =
    priorityEntry?.label ?? actionPlanPriorityLabel(plan.priority);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <RegistryBadge className={statusBadge.className}>{statusLabel}</RegistryBadge>
      <RegistryBadge
        className={priorityEntry?.className ?? 'border-border/80 text-foreground'}
      >
        Priorité {priorityWord}
      </RegistryBadge>
    </div>
  );
}
