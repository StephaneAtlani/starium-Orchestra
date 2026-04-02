'use client';

import { Badge } from '@/components/ui/badge';
import { workTeamStatusLabel } from '../lib/work-team-label-mappers';
import type { WorkTeamStatus } from '../types/work-team.types';

export function WorkTeamStatusBadge({ status }: { status: WorkTeamStatus }) {
  const variant = status === 'ACTIVE' ? 'default' : 'secondary';
  return <Badge variant={variant}>{workTeamStatusLabel(status)}</Badge>;
}
