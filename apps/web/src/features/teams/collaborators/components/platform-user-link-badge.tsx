import { Link2, Link2Off } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlatformUserLinkStatus } from '../types/collaborator.types';
import { platformUserLinkStatusLabel } from '../lib/collaborator-label-mappers';

export function PlatformUserLinkBadge({
  status,
  className,
}: {
  status: PlatformUserLinkStatus | undefined;
  className?: string;
}) {
  if (!status) return null;

  if (status === 'LINK_REQUIRED') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'gap-1 border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100',
          className,
        )}
      >
        <Link2Off className="size-3.5 shrink-0" aria-hidden />
        <span>{platformUserLinkStatusLabel(status)}</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100',
        className,
      )}
    >
      <Link2 className="size-3.5 shrink-0" aria-hidden />
      <span>{platformUserLinkStatusLabel(status)}</span>
    </Badge>
  );
}
