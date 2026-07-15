'use client';

import {
  Activity,
  AlertTriangle,
  Calendar,
  DollarSign,
  Settings2,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PROJECT_TYPE_LABEL } from '../../constants/project-enum-labels';
import {
  formatProjectBudget,
  formatProjectDateLong,
  projectBudgetConsumptionPercent,
  projectListProgressPercent,
  projectOwnerInitials,
  projectPortfolioCategoryIcon,
  projectPortfolioCategoryIconPresentation,
  projectPortfolioCategoryLabel,
} from '../../lib/projects-list-display';
import type { ProjectListItem } from '../../types/project.types';
import { codirReportStatusPresentation } from '../lib/codir-report-status';

const BAR_FILL: Record<string, string> = {
  ok: 'var(--state-success)',
  warn: 'var(--state-warning)',
  danger: 'var(--state-danger)',
  info: 'var(--state-info)',
  muted: 'var(--neutral-400)',
};

type CodirProjectReportCardProps = {
  project: ProjectListItem;
  onOpenPresentation: () => void;
  onConfigure: () => void;
};

export function CodirProjectReportCard({
  project,
  onOpenPresentation,
  onConfigure,
}: CodirProjectReportCardProps) {
  const status = codirReportStatusPresentation(project);
  const CategoryIcon = projectPortfolioCategoryIcon(project);
  const iconPresentation = projectPortfolioCategoryIconPresentation(project);
  const categoryLabel =
    projectPortfolioCategoryLabel(project) ??
    (PROJECT_TYPE_LABEL[project.type] ?? project.type);
  const progress = projectListProgressPercent(project);
  const budgetPct = projectBudgetConsumptionPercent(
    project.targetBudgetAmount,
    project.consumedBudgetAmount,
  );
  const targetBudget = formatProjectBudget(project.targetBudgetAmount);
  const consumedBudget = formatProjectBudget(project.consumedBudgetAmount);
  const criticalRisks = project.openRisksCount > 0 && project.computedHealth === 'RED' ? 1 : 0;

  const deadlineMeta = project.signals.isLate
    ? 'Dépassée'
    : project.status === 'PLANNED' || project.status === 'DRAFT'
      ? 'À lancer'
      : 'Dans les temps';

  return (
    <article
      className="starium-codir-report-card cursor-pointer transition-shadow hover:shadow-md"
      onClick={onOpenPresentation}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenPresentation();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Ouvrir la présentation du projet ${project.name}`}
    >
      <div
        className={cn(
          'starium-codir-report-card__accent',
          `starium-codir-report-card__accent--${status.accentTone}`,
        )}
        aria-hidden
      />

      <div className="flex items-start gap-3 border-b border-border/60 px-4 py-3.5 pl-5">
        <div className={iconPresentation.className} style={iconPresentation.style} aria-hidden>
          <CategoryIcon className="size-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[0.9375rem] font-extrabold tracking-tight">{project.name}</h3>
          <p className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">{categoryLabel}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span
              className="grid size-[1.375rem] place-items-center rounded-full bg-muted text-[0.5rem] font-bold text-muted-foreground"
              aria-hidden
            >
              {projectOwnerInitials(project.ownerDisplayName ?? '?')}
            </span>
            <span className="truncate text-[0.7rem] font-semibold text-muted-foreground">
              {project.ownerDisplayName?.trim() || 'Non renseigné'}
            </span>
          </div>
        </div>
        <Badge
          variant="secondary"
          className={cn('shrink-0 rounded-full text-[0.65rem] font-semibold', status.emphasisClass)}
        >
          {status.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-0 sm:grid-cols-4">
        <Indic
          icon={TrendingUp}
          label="Avancement"
          value={`${progress} %`}
          foot={project.openTasksCount > 0 ? `${project.openTasksCount} tâche(s)` : '—'}
          valueClassName={status.emphasisClass}
        />
        <Indic
          icon={DollarSign}
          label="Budget"
          value={budgetPct != null ? `${Math.round(budgetPct)} %` : '—'}
          foot={
            targetBudget && consumedBudget ? `${consumedBudget} / ${targetBudget}` : undefined
          }
        />
        <Indic
          icon={AlertTriangle}
          label="Risques"
          value={String(project.openRisksCount)}
          foot={criticalRisks > 0 ? `${criticalRisks} critique` : '0 critique'}
          valueClassName={
            project.openRisksCount > 2
              ? 'text-[color:var(--state-warning)]'
              : 'text-[color:var(--state-success)]'
          }
        />
        <Indic
          icon={Calendar}
          label="Échéance"
          value={formatProjectDateLong(project.targetEndDate).split(' ').slice(0, 2).join(' ')}
          foot={deadlineMeta}
          footClassName={
            project.signals.isLate
              ? 'text-[color:var(--state-danger)]'
              : 'text-[color:var(--state-success)]'
          }
        />
      </div>

      <footer className="flex items-center gap-2 border-t border-border/60 bg-muted/20 px-4 py-3 pl-5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="starium-progress-track h-1.5 min-w-0 flex-1">
            <div
              className={cn('starium-progress-fill h-full', `starium-progress-fill--${status.barTone}`)}
              style={{ width: `${Math.min(100, progress)}%`, background: BAR_FILL[status.barTone] }}
            />
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 text-[0.65rem] font-semibold">
          {status.healthLabel}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onConfigure();
          }}
          aria-label={`Configurer les widgets pour ${project.name}`}
        >
          <Settings2 className="size-4" />
        </Button>
      </footer>
    </article>
  );
}

function Indic({
  icon: Icon,
  label,
  value,
  foot,
  valueClassName,
  footClassName,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  foot?: string;
  valueClassName?: string;
  footClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-r border-border/50 px-3.5 py-3 last:border-r-0 sm:px-4">
      <span className="inline-flex items-center gap-1 text-[0.625rem] font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-2.5 opacity-70" aria-hidden />
        {label}
      </span>
      <span className={cn('text-lg font-extrabold tabular-nums leading-none', valueClassName)}>
        {value}
      </span>
      {foot ? (
        <span className={cn('text-[0.65rem] font-semibold text-muted-foreground', footClassName)}>
          {foot}
        </span>
      ) : null}
    </div>
  );
}
