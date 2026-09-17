'use client';

import { useMemo, useState } from 'react';
import { FilterBar } from '@/components/layout/filter-bar';
import { FilterBarField } from '@/components/layout/filter-bar-field';
import { DataTable } from '@/components/data-table/data-table';
import type { DataTableColumn } from '@/components/data-table/data-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { cn } from '@/lib/utils';
import type { ComplianceRequirementRowApi } from '../api/compliance.api';
import { frameworkDisplayLabel } from '../lib/compliance-labels';
import {
  COMPLIANCE_STATUS_FILTER_OPTIONS,
  ComplianceStatusDisplay,
  complianceStatusLabel,
  type ComplianceUiStatus,
} from './compliance-status-display';
import { ComplianceRequirementDetailModal } from './compliance-requirement-detail-modal';

export type RequirementsFrameworkOption = { id: string; label: string };

export { frameworkDisplayLabel };

export function requirementUiStatus(
  row: ComplianceRequirementRowApi,
): ComplianceUiStatus {
  return row.statuses[0]?.status ?? 'NOT_ASSESSED';
}

export function filterComplianceRequirements(
  rows: ComplianceRequirementRowApi[],
  opts: {
    search: string;
    frameworkId: string; // 'ALL' | id
    status: 'ALL' | ComplianceUiStatus;
  },
): ComplianceRequirementRowApi[] {
  const q = opts.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (opts.frameworkId !== 'ALL' && row.framework.id !== opts.frameworkId) {
      return false;
    }
    if (opts.status !== 'ALL' && requirementUiStatus(row) !== opts.status) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      row.code,
      row.title,
      row.category ?? '',
      row.framework.name,
      row.framework.version,
      complianceStatusLabel(requirementUiStatus(row)),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function buildFrameworkOptions(
  rows: ComplianceRequirementRowApi[],
): RequirementsFrameworkOption[] {
  const map = new Map<string, RequirementsFrameworkOption>();
  for (const row of rows) {
    if (map.has(row.framework.id)) continue;
    map.set(row.framework.id, {
      id: row.framework.id,
      label: frameworkDisplayLabel(row.framework),
    });
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

export function summarizeRequirements(rows: ComplianceRequirementRowApi[]) {
  let notAssessed = 0;
  let gaps = 0;
  let partial = 0;
  let compliant = 0;
  for (const row of rows) {
    const st = requirementUiStatus(row);
    if (st === 'NOT_ASSESSED') notAssessed += 1;
    else if (st === 'NON_COMPLIANT') gaps += 1;
    else if (st === 'PARTIALLY_COMPLIANT') partial += 1;
    else if (st === 'COMPLIANT') compliant += 1;
  }
  return { total: rows.length, notAssessed, gaps, partial, compliant };
}

export function ComplianceRequirementsList({
  rows,
  isLoading,
  error,
  onRetry,
}: {
  rows: ComplianceRequirementRowApi[] | undefined;
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [frameworkId, setFrameworkId] = useState('ALL');
  const [status, setStatus] = useState<'ALL' | ComplianceUiStatus>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allRows = rows ?? [];
  const frameworkOptions = useMemo(() => buildFrameworkOptions(allRows), [allRows]);
  const filtered = useMemo(
    () => filterComplianceRequirements(allRows, { search, frameworkId, status }),
    [allRows, search, frameworkId, status],
  );
  const summary = useMemo(() => summarizeRequirements(allRows), [allRows]);
  const selectedPreview = useMemo(
    () => allRows.find((r) => r.id === selectedId) ?? null,
    [allRows, selectedId],
  );

  const frameworkLabel =
    frameworkId === 'ALL'
      ? 'Tous les référentiels'
      : (frameworkOptions.find((f) => f.id === frameworkId)?.label ?? 'Référentiel');

  const statusLabel =
    status === 'ALL'
      ? 'Tous les états'
      : complianceStatusLabel(status);

  const columns = useMemo<DataTableColumn<ComplianceRequirementRowApi>[]>(
    () => [
      {
        key: 'requirement',
        header: 'Exigence',
        mobilePriority: 'primary',
        className: 'w-[42%] min-w-0 max-w-0',
        cell: (row) => (
          <div className="min-w-0">
            <div className="truncate font-semibold text-foreground" title={row.title}>
              {row.title}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {row.code}
              {row.category ? ` · ${row.category}` : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'framework',
        header: 'Référentiel',
        mobilePriority: 'secondary',
        className: 'w-[22%] min-w-0',
        cell: (row) => (
          <RegistryBadge className="max-w-full truncate border-border/70 bg-muted/40 text-foreground">
            {frameworkDisplayLabel(row.framework)}
          </RegistryBadge>
        ),
      },
      {
        key: 'evidences',
        header: 'Preuves',
        mobilePriority: 'secondary',
        className: 'w-[10%] text-center tabular-nums',
        headerClassName: 'w-[10%] text-center',
        cell: (row) => (
          <span className="text-sm text-muted-foreground">{row.evidences.length}</span>
        ),
      },
      {
        key: 'status',
        header: 'État',
        mobilePriority: 'secondary',
        className: 'w-[16%] min-w-0',
        cell: (row) => <ComplianceStatusDisplay status={requirementUiStatus(row)} />,
      },
      {
        key: 'actions',
        header: 'Action',
        mobilePriority: 'actions',
        className: 'w-[10%] text-right',
        headerClassName: 'w-[10%] text-right',
        cell: (row) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 sm:min-h-9"
            onClick={() => setSelectedId(row.id)}
          >
            Ouvrir
          </Button>
        ),
      },
    ],
    [],
  );

  const hasActiveFilters =
    search.trim() !== '' || frameworkId !== 'ALL' || status !== 'ALL';

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
      <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
        {summary.total} exigence{summary.total > 1 ? 's' : ''}
        {summary.notAssessed > 0
          ? ` · ${summary.notAssessed} à évaluer`
          : ''}
        {summary.gaps > 0 ? ` · ${summary.gaps} écart${summary.gaps > 1 ? 's' : ''}` : ''}
        {summary.partial > 0
          ? ` · ${summary.partial} partielle${summary.partial > 1 ? 's' : ''}`
          : ''}
        {filtered.length !== summary.total
          ? ` — ${filtered.length} affichée${filtered.length > 1 ? 's' : ''}`
          : ''}
      </p>

      <div className="w-full min-w-0 shrink-0">
        <FilterBar aria-label="Filtres des exigences" asSearch desktopColumns={3}>
          <FilterBarField id="req-framework" label="Référentiel">
            {({ controlId, labelId }) => (
              <Select
                value={frameworkId}
                onValueChange={(v) => setFrameworkId(v ?? 'ALL')}
              >
                <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
                  <SelectValue>{frameworkLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les référentiels</SelectItem>
                  {frameworkOptions.map((fw) => (
                    <SelectItem key={fw.id} value={fw.id}>
                      {fw.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FilterBarField>
          <FilterBarField id="req-status" label="État">
            {({ controlId, labelId }) => (
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus((v ?? 'ALL') as 'ALL' | ComplianceUiStatus)
                }
              >
                <SelectTrigger id={controlId} aria-labelledby={labelId} className="w-full">
                  <SelectValue>{statusLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les états</SelectItem>
                  {COMPLIANCE_STATUS_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FilterBarField>
          <FilterBarField id="req-search" label="Recherche">
            {({ controlId }) => (
              <Input
                id={controlId}
                className="w-full"
                placeholder="Code, titre, référentiel…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}
          </FilterBarField>
        </FilterBar>
      </div>

      <div
        className={cn(
          'starium-panel flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden',
          'rounded-[var(--radius-lg)] border border-border bg-card shadow-sm',
          'max-md:max-h-[min(70dvh,32rem)] max-md:border-0 max-md:bg-transparent max-md:shadow-none',
        )}
      >
        <div
          className={cn(
            'starium-scroll-hover min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain',
            /* Pleine largeur utile : colonnes réparties, pas de bande vide à droite */
            '[&_[data-slot=table]]:w-full [&_[data-slot=table]]:table-fixed',
            '[&_[data-slot=table-container]]:w-full',
          )}
        >
          <DataTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            error={error ?? null}
            onRetry={onRetry}
            getRowId={(row) => row.id}
            mobileCardsAriaLabel="Liste des exigences de conformité"
            emptyTitle={
              hasActiveFilters
                ? 'Aucune exigence pour ces filtres'
                : 'Aucune exigence'
            }
            emptyDescription={
              hasActiveFilters
                ? 'Élargissez la recherche ou changez de référentiel / état.'
                : 'Activez un référentiel pour charger ses contrôles.'
            }
          />
        </div>
      </div>

      <ComplianceRequirementDetailModal
        open={selectedId != null}
        onOpenChange={(next) => {
          if (!next) setSelectedId(null);
        }}
        requirementId={selectedId}
        preview={selectedPreview}
        navigationIds={filtered.map((r) => r.id)}
        onNavigate={(id) => setSelectedId(id)}
      />
    </div>
  );
}
