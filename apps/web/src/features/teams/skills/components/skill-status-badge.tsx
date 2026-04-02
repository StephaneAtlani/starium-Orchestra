import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SkillStatus } from '../types/skill.types';
import { skillStatusLabel } from '../lib/skill-label-mappers';

type SkillStatusBadgeProps = {
  status: SkillStatus;
  className?: string;
};

export function SkillStatusBadge({ status, className }: SkillStatusBadgeProps) {
  const variant =
    status === 'ACTIVE'
      ? 'default'
      : status === 'DRAFT'
        ? 'secondary'
        : 'outline';

  return (
    <Badge
      variant={variant}
      className={cn(
        status === 'ARCHIVED' && 'border-amber-500/50 text-amber-950 dark:text-amber-100',
        className,
      )}
    >
      {skillStatusLabel(status)}
    </Badge>
  );
}
