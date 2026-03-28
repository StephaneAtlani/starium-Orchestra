'use client';

import { Badge } from '@/components/ui/badge';
import { RISK_STATUS_LABEL } from '../../constants/project-enum-labels';

export function RiskStatusBadge({ status }: { status: string }) {
  const label = RISK_STATUS_LABEL[status] ?? status;
  return (
    <Badge variant="secondary" className="font-normal">
      {label}
    </Badge>
  );
}
