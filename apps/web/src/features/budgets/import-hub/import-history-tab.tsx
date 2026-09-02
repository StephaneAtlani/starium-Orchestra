'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/feedback/loading-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { budgetQueryKeys } from '../lib/budget-query-keys';
import { budgetImportJobDetail, budgetDetail } from '../constants/budget-routes';
import { listBudgetImportJobs } from '../api/budget-imports.api';
import type { BudgetImportJobStatus } from '../types/budget-imports.types';
import { displayLabel } from '@/lib/display-label';
import { EMPTY_SELECT_VALUE } from '../budget-import/budget-import-field-labels';
import { ImportJobStatusBadge } from './import-job-status-badge';

const PAGE_SIZE = 20;

function resultCompact(job: {
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
}): string {
  const parts: string[] = [];
  if (job.createdRows) parts.push(`+${job.createdRows}`);
  if (job.updatedRows) parts.push(`↻${job.updatedRows}`);
  if (job.skippedRows) parts.push(`~${job.skippedRows}`);
  if (job.errorRows) parts.push(`!${job.errorRows}`);
  return parts.length ? parts.join(' / ') : '—';
}

export function ImportHistoryTab() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const [status, setStatus] = useState<string>(EMPTY_SELECT_VALUE);
  const [page, setPage] = useState(0);

  const filters = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      status:
        status === EMPTY_SELECT_VALUE
          ? undefined
          : (status as BudgetImportJobStatus),
    }),
    [status, page],
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: budgetQueryKeys.budgetImportJobsList(clientId, filters),
    queryFn: () => listBudgetImportJobs(authFetch, filters),
    enabled: !!clientId,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const canPrev = page > 0;
  const canNext = (page + 1) * PAGE_SIZE < total;

  return (
    <div className="space-y-4">
      <FilterBar aria-label="Filtres historique imports">
        <FilterBarField id="import-jobs-status" label="Statut">
          {({ controlId }) => (
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v ?? EMPTY_SELECT_VALUE);
                setPage(0);
              }}
            >
              <SelectTrigger id={controlId} className="min-h-11 w-full sm:min-h-9">
                <SelectValue>
                  {status === EMPTY_SELECT_VALUE
                    ? 'Tous'
                    : status === 'COMPLETED'
                      ? 'Terminé'
                      : status === 'FAILED'
                        ? 'Échec'
                        : status === 'RUNNING'
                          ? 'En cours'
                          : status}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Tous</SelectItem>
                <SelectItem value="COMPLETED">Terminé</SelectItem>
                <SelectItem value="FAILED">Échec</SelectItem>
                <SelectItem value="RUNNING">En cours</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FilterBarField>
      </FilterBar>

      {isLoading ? <LoadingState rows={4} /> : null}
      {error ? (
        <ErrorState
          message="Impossible de charger l’historique. Réessayez plus tard."
          onRetry={() => void refetch()}
        />
      ) : null}
      {!isLoading && !error && items.length === 0 ? (
        <EmptyState
          title="Aucun import"
          description="Les exécutions apparaîtront ici après un import réussi ou en échec."
        />
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <>
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Profil</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Résultat</TableHead>
                  <TableHead>Auteur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="tabular-nums text-sm whitespace-nowrap">
                      <Link
                        href={budgetImportJobDetail(job.id)}
                        className="text-foreground underline-offset-2 hover:underline"
                      >
                        {new Date(job.createdAt).toLocaleString('fr-FR')}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={budgetDetail(job.budgetId)}
                        className="underline-offset-2 hover:underline"
                      >
                        {displayLabel(job.budgetLabel, 'Budget')}
                      </Link>
                      {job.exerciseLabel ? (
                        <div className="text-xs text-muted-foreground">
                          {job.exerciseLabel}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate">
                      {displayLabel(job.fileName, 'Fichier')}
                    </TableCell>
                    <TableCell>
                      {displayLabel(job.mappingName, 'Sans profil')}
                    </TableCell>
                    <TableCell>
                      <ImportJobStatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {resultCompact(job)}
                    </TableCell>
                    <TableCell>
                      {displayLabel(job.createdByLabel, 'Utilisateur')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="md:hidden space-y-3" aria-label="Historique des imports">
            {items.map((job) => (
              <li key={job.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={budgetImportJobDetail(job.id)}
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    {displayLabel(job.fileName, 'Fichier')}
                  </Link>
                  <ImportJobStatusBadge status={job.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {displayLabel(job.budgetLabel, 'Budget')} ·{' '}
                  {new Date(job.createdAt).toLocaleString('fr-FR')}
                </p>
                <p className="text-sm tabular-nums">{resultCompact(job)}</p>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground tabular-nums">
              {total} import{total > 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-9"
                disabled={!canPrev}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Précédent
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-9"
                disabled={!canNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
