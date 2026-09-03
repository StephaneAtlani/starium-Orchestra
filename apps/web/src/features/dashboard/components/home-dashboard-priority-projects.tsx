'use client';

import Link from 'next/link';
import { Briefcase, ChevronRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PortfolioProgressBar } from '@/components/portfolio';
import { EmptyState } from '@/components/feedback/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PROJECT_STATUS_LABEL } from '@/features/projects/constants/project-enum-labels';
import {
  projectDetail,
  projectsList,
} from '@/features/projects/constants/project-routes';
import type { ProjectListItem } from '@/features/projects/types/project.types';
import { displayLabel } from '@/lib/display-label';

type Props = {
  projects: ProjectListItem[];
  loading?: boolean;
};

const healthLabel: Record<ProjectListItem['computedHealth'], string> = {
  GREEN: 'Excellente',
  ORANGE: 'À surveiller',
  RED: 'Critique',
};

const healthDot: Record<ProjectListItem['computedHealth'], string> = {
  GREEN: 'bg-[color:var(--state-success)]',
  ORANGE: 'bg-[color:var(--state-warning)]',
  RED: 'bg-[color:var(--state-danger)]',
};

function formatDeadline(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '—';
  }
}

function statusDotClass(status: string): string {
  if (status === 'IN_PROGRESS') return 'bg-[color:var(--state-success)]';
  if (status === 'ON_HOLD' || status === 'PLANNED') {
    return 'bg-[color:var(--state-warning)]';
  }
  if (status === 'COMPLETED') return 'bg-[color:var(--state-info)]';
  return 'bg-muted-foreground';
}

export function HomeDashboardPriorityProjects({ projects, loading }: Props) {
  return (
    <section
      className="starium-section flex h-full flex-col gap-3"
      aria-labelledby="home-priority-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="home-priority-heading" className="starium-section-title text-base">
          Projets prioritaires
        </h2>
        <Link
          href={projectsList()}
          className="inline-flex min-h-11 items-center gap-0.5 text-sm font-medium text-[color:var(--brand-gold-700)] hover:underline sm:min-h-0"
        >
          Tout voir
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 py-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="Aucun projet prioritaire"
          description="Les projets à haute priorité apparaîtront ici."
          className="py-8"
        />
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {projects.map((p) => {
              const progress =
                p.derivedProgressPercent ?? p.progressPercent ?? 0;
              return (
                <li key={p.id}>
                  <Link
                    href={projectDetail(p.id)}
                    className="block rounded-lg border border-border/70 bg-muted/20 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="font-medium text-foreground">
                      {displayLabel(p.name, 'Projet')}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={cn(
                            'size-1.5 rounded-full',
                            statusDotClass(p.status),
                          )}
                          aria-hidden
                        />
                        {PROJECT_STATUS_LABEL[p.status] ?? p.status}
                      </span>
                      <span>{formatDeadline(p.targetEndDate)}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={cn('size-1.5 rounded-full', healthDot[p.computedHealth])}
                          aria-hidden
                        />
                        {healthLabel[p.computedHealth]}
                      </span>
                    </div>
                    <PortfolioProgressBar
                      value={progress}
                      className="mt-2"
                      label={`Avancement ${displayLabel(p.name, 'projet')}`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="starium-overline">Projet</TableHead>
                  <TableHead className="starium-overline">Statut</TableHead>
                  <TableHead className="starium-overline min-w-[7rem]">
                    Avancement
                  </TableHead>
                  <TableHead className="starium-overline">Échéance</TableHead>
                  <TableHead className="starium-overline">Santé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => {
                  const progress =
                    p.derivedProgressPercent ?? p.progressPercent ?? 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link
                          href={projectDetail(p.id)}
                          className="flex min-w-0 items-center gap-2 font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]">
                            <Briefcase className="size-3.5" aria-hidden />
                          </span>
                          <span className="truncate">
                            {displayLabel(p.name, 'Projet')}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              statusDotClass(p.status),
                            )}
                            aria-hidden
                          />
                          {PROJECT_STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <PortfolioProgressBar
                          value={progress}
                          showPercent
                          className="min-w-[6.5rem]"
                          label={`Avancement ${displayLabel(p.name, 'projet')}`}
                        />
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatDeadline(p.targetEndDate)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              healthDot[p.computedHealth],
                            )}
                            aria-hidden
                          />
                          {healthLabel[p.computedHealth]}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </section>
  );
}
