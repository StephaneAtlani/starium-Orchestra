'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  Ban,
  CalendarRange,
  ChevronRight,
  Flag,
  ListTodo,
  ShieldAlert,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectSheet } from '../constants/project-routes';
import { projectWarningLabel } from '../constants/project-enum-labels';
import type { ProjectDetail } from '../types/project.types';

type WarningSeverity = 'danger' | 'warn';

type WarningMeta = {
  hint: string;
  severity: WarningSeverity;
  Icon: LucideIcon;
};

const WARNING_META: Record<string, WarningMeta> = {
  NO_OWNER: {
    hint: 'Désignez un responsable sur la fiche projet.',
    severity: 'warn',
    Icon: UserX,
  },
  NO_TASKS: {
    hint: 'Planifiez au moins une tâche pour suivre l’avancement.',
    severity: 'warn',
    Icon: ListTodo,
  },
  NO_RISKS: {
    hint: 'Documentez les risques sur le registre projet.',
    severity: 'warn',
    Icon: ShieldAlert,
  },
  NO_MILESTONES: {
    hint: 'Ajoutez des jalons dans le planning.',
    severity: 'warn',
    Icon: Flag,
  },
  PLANNING_DRIFT: {
    hint: 'Écart planning détecté — revoyez les échéances.',
    severity: 'danger',
    Icon: CalendarRange,
  },
  BLOCKED: {
    hint: 'Le projet est bloqué — levez le point bloquant.',
    severity: 'danger',
    Icon: Ban,
  },
};

function getWarningMeta(code: string): WarningMeta {
  return (
    WARNING_META[code] ?? {
      hint: 'Complétez la fiche projet pour lever ce point.',
      severity: 'warn',
      Icon: AlertTriangle,
    }
  );
}

function sortWarnings(codes: string[]): string[] {
  return [...codes].sort((a, b) => {
    const rank = (code: string) => (getWarningMeta(code).severity === 'danger' ? 0 : 1);
    return rank(a) - rank(b);
  });
}

function severityBadgeClass(severity: WarningSeverity): string {
  return severity === 'danger' ? 'starium-ds-badge--danger' : 'starium-ds-badge--warn';
}

function severityBadgeLabel(severity: WarningSeverity): string {
  return severity === 'danger' ? 'Critique' : 'À compléter';
}

function itemIconClass(severity: WarningSeverity): string {
  return severity === 'danger'
    ? 'bg-destructive/10 text-destructive dark:bg-destructive/15'
    : 'bg-amber-500/15 text-amber-950 dark:text-amber-300';
}

/** Points d’attention pilotage (aperçu projet) — libellés métier, pas les codes API. */
export function ProjectPilotageAttentionPanel({
  projectId,
  project,
}: {
  projectId: string;
  project: ProjectDetail;
}) {
  const warnings = project.warnings ?? [];
  if (warnings.length === 0) return null;

  const sorted = sortWarnings(warnings);
  const hasCritical = sorted.some((code) => getWarningMeta(code).severity === 'danger');
  const sheetHref = projectSheet(projectId);

  return (
    <section
      className={cn(
        'starium-card flex flex-col gap-4 rounded-xl border border-border/70 p-4 shadow-sm sm:p-5',
        hasCritical ? 'border-l-[3px] border-l-destructive/70' : 'border-l-[3px] border-l-amber-500/70',
      )}
      role="status"
      aria-live="polite"
      aria-labelledby="project-pilotage-attention-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg',
              hasCritical
                ? 'bg-destructive/10 text-destructive dark:bg-destructive/15'
                : 'bg-amber-500/15 text-amber-950 dark:text-amber-300',
            )}
            aria-hidden
          >
            <AlertTriangle className="size-5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2
              id="project-pilotage-attention-title"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              Points d&apos;attention
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              {sorted.length === 1
                ? 'Un élément de pilotage est incomplet ou en écart — corrigez-le sur la fiche projet.'
                : `${sorted.length} éléments de pilotage à traiter — complétez la fiche projet pour lever ces alertes.`}
            </p>
          </div>
        </div>
        <Link
          href={sheetHref}
          className="starium-btn starium-btn-secondary starium-btn-sm min-h-11 shrink-0 self-start"
        >
          Compléter la fiche projet
          <ChevronRight className="size-4" strokeWidth={2.5} aria-hidden />
        </Link>
      </div>

      <ul className="starium-risk-attention-list rounded-lg border border-border/60 bg-muted/20 px-3 sm:px-4">
        {sorted.map((code) => {
          const meta = getWarningMeta(code);
          const ItemIcon = meta.Icon;
          const label = projectWarningLabel(code);

          return (
            <li key={code} className="starium-risk-attention-item">
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-lg',
                  itemIconClass(meta.severity),
                )}
                aria-hidden
              >
                <ItemIcon className="size-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="starium-risk-attention-title">{label}</p>
                <p className="starium-risk-attention-meta">{meta.hint}</p>
              </div>
              <span
                className={cn(
                  'starium-ds-badge hidden shrink-0 sm:inline-flex',
                  severityBadgeClass(meta.severity),
                )}
              >
                {severityBadgeLabel(meta.severity)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
