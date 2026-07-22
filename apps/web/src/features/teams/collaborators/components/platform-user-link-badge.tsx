import { Badge } from '@/components/ui/badge';
import type { PlatformUserLinkStatus } from '../types/collaborator.types';
import { platformUserLinkStatusLabel } from '../lib/collaborator-label-mappers';

export function PlatformUserLinkBadge({
  status,
}: {
  status: PlatformUserLinkStatus | undefined;
}) {
  if (!status || status === 'LINKED') return null;
  return (
    <Badge
      variant="outline"
      className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100"
    >
      {platformUserLinkStatusLabel(status)}
    </Badge>
  );
}
