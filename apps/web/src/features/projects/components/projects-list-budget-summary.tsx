import type { ProjectListItem } from '../types/project.types';
import { formatProjectBudget } from '../lib/projects-list-display';
import { cn } from '@/lib/utils';

export function ProjectsListBudgetSummary({
  project,
  className,
}: {
  project: ProjectListItem;
  className?: string;
}) {
  const budget = formatProjectBudget(project.targetBudgetAmount);
  const consumed = formatProjectBudget(project.consumedBudgetAmount);

  if (!budget && consumed == null) {
    return <span className={cn('text-muted-foreground/50', className)}>—</span>;
  }

  return (
    <div className={cn('space-y-1 text-xs leading-snug', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Budget
        </span>
        <span className="tabular-nums text-foreground">{budget ?? '—'}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Consommé
        </span>
        <span className="tabular-nums text-muted-foreground">{consumed ?? '—'}</span>
      </div>
    </div>
  );
}
