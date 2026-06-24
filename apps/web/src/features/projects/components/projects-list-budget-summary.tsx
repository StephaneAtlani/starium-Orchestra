import type { ProjectListItem } from '../types/project.types';
import {
  formatProjectBudget,
  projectBudgetConsumptionPercent,
} from '../lib/projects-list-display';
import { cn } from '@/lib/utils';

type BudgetBarTone = 'ok' | 'warn' | 'danger' | 'muted';

function budgetBarTone(percent: number | null): BudgetBarTone {
  if (percent == null) return 'muted';
  if (percent > 100) return 'danger';
  if (percent >= 85) return 'warn';
  return 'ok';
}

export function ProjectsListBudgetSummary({
  project,
  className,
}: {
  project: ProjectListItem;
  className?: string;
}) {
  const budgetLabel = formatProjectBudget(project.targetBudgetAmount);
  const consumedLabel = formatProjectBudget(project.consumedBudgetAmount);
  const percent = projectBudgetConsumptionPercent(
    project.targetBudgetAmount,
    project.consumedBudgetAmount,
  );
  const tone = budgetBarTone(percent);
  const isOverrun = percent != null && percent > 100;
  const fillWidth = percent == null ? 0 : Math.min(100, Math.max(0, percent));

  if (!budgetLabel && consumedLabel == null) {
    return <span className={cn('text-muted-foreground/50', className)}>—</span>;
  }

  return (
    <div className={cn('starium-budget-summary min-w-[6.5rem] space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2 text-[10px] leading-none">
        <span className="shrink-0 font-medium uppercase tracking-wide text-muted-foreground">
          Consommé
        </span>
        <span
          className={cn(
            'tabular-nums font-semibold text-foreground',
            isOverrun && 'text-destructive',
          )}
        >
          {consumedLabel ?? '—'}
        </span>
      </div>

      <div
        className="starium-budget-summary__track starium-progress-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fillWidth}
        aria-label={
          percent != null
            ? `Consommation budgétaire : ${Math.round(percent)} % du budget`
            : 'Consommation budgétaire non calculable'
        }
      >
        <div
          className={cn('starium-progress-fill', `starium-progress-fill--${tone}`)}
          style={{ width: `${fillWidth}%` }}
        />
        {isOverrun ? (
          <div
            className="starium-budget-summary__overrun-marker"
            aria-hidden
            title="Dépassement budgétaire"
          />
        ) : null}
      </div>

      <div className="flex items-baseline justify-between gap-2 text-[10px] leading-none">
        <span className="shrink-0 font-medium uppercase tracking-wide text-muted-foreground">
          Budget
        </span>
        <span className="tabular-nums text-muted-foreground">{budgetLabel ?? '—'}</span>
      </div>

      {percent != null ? (
        <div
          className={cn(
            'text-[10px] font-medium tabular-nums leading-none',
            tone === 'ok' && 'text-[color:var(--state-success)]',
            tone === 'warn' && 'text-[color:var(--state-warning)]',
            tone === 'danger' && 'text-destructive',
            tone === 'muted' && 'text-muted-foreground',
          )}
        >
          {isOverrun ? `Dépassement · ${Math.round(percent)} %` : `${Math.round(percent)} %`}
        </div>
      ) : null}
    </div>
  );
}
