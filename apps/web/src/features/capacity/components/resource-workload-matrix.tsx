'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { formatNumberFr } from '@/lib/currency-format';
import { cn } from '@/lib/utils';
import {
  sortByWorkloadDesc,
  visibleProjects,
  workloadBand,
  type WorkloadBand,
} from '../lib/resource-workload';
import type { ResourceProjectLoadResult } from '../types/capacity.types';

const BAND_BAR_CLASS: Record<WorkloadBand, string> = {
  overload: 'bg-[color:var(--state-danger)]',
  warning: 'bg-[color:var(--brand-gold)]',
  low: 'bg-[color:var(--state-success)]',
  none: 'bg-[color:var(--neutral-300)]',
};

const BAND_TEXT_CLASS: Record<WorkloadBand, string> = {
  overload: 'text-destructive',
  warning: 'text-[color:var(--brand-gold-700)]',
  low: 'text-[color:var(--state-success)]',
  none: 'text-muted-foreground',
};

const LEGEND: ReadonlyArray<{ label: string; band: WorkloadBand }> = [
  { label: 'moins de 70 %', band: 'low' },
  { label: '70 – 100 %', band: 'warning' },
  { label: 'plus de 100 %', band: 'overload' },
];

function days(value: number): string {
  return formatNumberFr(value, { maxFraction: 1 });
}

/** Cellule d'allocation : jours sur un projet, tiret discret si rien. */
function AllocationCell({ value }: { value: number }) {
  if (value <= 0) {
    return (
      <span className="text-muted-foreground/60" aria-label="aucune allocation">
        –
      </span>
    );
  }
  return <span className="font-semibold tabular-nums">{days(value)}</span>;
}

export function ResourceWorkloadMatrix({
  data,
  isLoading,
}: {
  data: ResourceProjectLoadResult | undefined;
  isLoading: boolean;
}) {
  const projects = useMemo(() => (data ? visibleProjects(data) : []), [data]);
  const rows = useMemo(() => (data ? sortByWorkloadDesc(data.items) : []), [data]);
  const hasOther = rows.some((row) => row.otherDays > 0);

  return (
    <Card
      size="sm"
      className="starium-panel overflow-hidden border border-border shadow-sm"
      data-testid="resource-workload-matrix"
    >
      <CardHeader className="gap-2 border-b border-border/60 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold">Plan de charge par ressource</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Jours alloués par projet et charge totale sur la période.
          </CardDescription>
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {LEGEND.map((entry) => (
            <li key={entry.band} className="inline-flex items-center gap-1.5">
              <span
                className={cn('size-2.5 rounded-sm', BAND_BAR_CLASS[entry.band])}
                aria-hidden
              />
              {entry.label}
            </li>
          ))}
        </ul>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-md" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10">
            <EmptyState
              title="Aucune ressource humaine"
              description="Ajoutez des ressources humaines pour suivre leur plan de charge."
            />
          </div>
        ) : (
          /* Matrice dense ressource × projet : scroll horizontal contrôlé (RFC-FE-MOB-003). */
          <div className="overflow-x-auto">
            <table className="starium-projects-table w-full min-w-[48rem] border-collapse text-sm">
              <caption className="sr-only">
                Jours alloués par ressource et par projet, avec charge totale
              </caption>
              <thead>
                <tr className="border-b border-border/60">
                  <th scope="col" className="px-3 py-2 text-left font-semibold">
                    Ressource
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">
                    Rôle
                  </th>
                  {projects.map((project) => (
                    <th
                      key={project.id}
                      scope="col"
                      className="px-3 py-2 text-center font-semibold"
                      title={project.code ? `${project.name} · ${project.code}` : project.name}
                    >
                      <span className="block max-w-[8rem] truncate">{project.name}</span>
                    </th>
                  ))}
                  {hasOther && (
                    <th
                      scope="col"
                      className="px-3 py-2 text-center font-semibold"
                      title="Allocations hors projet : manuelles, risques, plans d'action"
                    >
                      Hors projet
                    </th>
                  )}
                  <th scope="col" className="px-3 py-2 text-left font-semibold">
                    Charge totale
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const band = workloadBand(row.loadPercent);
                  return (
                    <tr key={row.resourceId} className="border-b border-border/40 last:border-0">
                      <th scope="row" className="px-3 py-2 text-left font-normal">
                        <span className="flex items-center gap-2.5">
                          <UserInitialsAvatar
                            displayName={row.label}
                            seed={row.resourceId}
                            size="sm"
                          />
                          <span className="font-semibold text-foreground">{row.label}</span>
                        </span>
                      </th>
                      <td className="px-3 py-2 text-muted-foreground">{row.roleName ?? '—'}</td>
                      {projects.map((project) => (
                        <td key={project.id} className="px-3 py-2 text-center">
                          <AllocationCell value={row.byProject[project.id] ?? 0} />
                        </td>
                      ))}
                      {hasOther && (
                        <td className="px-3 py-2 text-center">
                          <AllocationCell value={row.otherDays} />
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-1.5 w-full min-w-[3rem] max-w-[7rem] overflow-hidden rounded-full bg-muted"
                            aria-hidden
                          >
                            <span
                              className={cn('block h-full rounded-full', BAND_BAR_CLASS[band])}
                              style={{
                                width: `${Math.min(100, Math.max(0, row.loadPercent ?? 0))}%`,
                              }}
                            />
                          </span>
                          <span
                            className={cn(
                              'shrink-0 text-xs font-bold tabular-nums',
                              BAND_TEXT_CLASS[band],
                            )}
                          >
                            {row.loadPercent == null ? '—' : `${row.loadPercent} %`}
                          </span>
                        </span>
                        <span className="sr-only">
                          {`${days(row.allocatedDays)} jours alloués sur ${days(row.capacityDays)} jours de capacité`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
