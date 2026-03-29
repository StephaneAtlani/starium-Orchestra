'use client';

import { RegistryBadge } from '@/lib/ui/registry-badge';
import { RISK_STATUS_LABEL } from '../../constants/project-enum-labels';

export function RiskStatusBadge({ status }: { status: string }) {
  const label = RISK_STATUS_LABEL[status] ?? status;
  return (
    <RegistryBadge className="bg-secondary text-secondary-foreground">{label}</RegistryBadge>
  );
}
