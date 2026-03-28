'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PaginationSummary } from '@/features/budgets/components/pagination-summary';
import type { ProjectListItem, RiskTaxonomyDomainApi } from '../../types/project.types';
import { PROJECT_RISK_CRITICALITY_LABEL, RISK_STATUS_LABEL } from '../../constants/project-enum-labels';
import type { ProjectRiskRegistryRow } from '../hooks/use-project-risks-registry-query';
import type { RisksRegistryFiltersState } from './risk-filters';
import type { RisksRegistrySortKey } from '../lib/risks-registry-table-sort';
import { cn } from '@/lib/utils';
import { RiskLevelBadge } from './risk-level-badge';
import { RiskStatusBadge } from './risk-status-badge';

const ALL = 'all';

const STATUS_KEYS = Object.keys(RISK_STATUS_LABEL) as (keyof typeof RISK_STATUS_LABEL)[];
const CRIT_KEYS = Object.keys(PROJECT_RISK_CRITICALITY_LABEL) as (keyof typeof PROJECT_RISK_CRITICALITY_LABEL)[];

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

const PAGE_SIZE = 25;

export function risksRegistryPageSize(): number {
  return PAGE_SIZE;
}

/** Plage paginée + métadonnées pour le pied de carte. */
export function sliceRisksRegistryPage(rows: ProjectRiskRegistryRow[], page: number) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);
  return { total, totalPages, safePage, start, pageRows };
}

export function RisksRegistryPagination({
  total,
  safePage,
  totalPages,
  start,
  onPageChange,
}: {
  total: number;
  safePage: number;
  totalPages: number;
  start: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="pagination-summary">
        0 résultat
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <PaginationSummary offset={start} limit={PAGE_SIZE} total={total} />
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Précédent
          </Button>
          <span className="tabular-nums text-sm text-muted-foreground">
            Page {safePage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
          >
            Suivant
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SortHeader({
  label,
  columnKey,
  activeKey,
  order,
  onSort,
}: {
  label: string;
  columnKey: RisksRegistrySortKey;
  activeKey: RisksRegistrySortKey;
  order: 'asc' | 'desc';
  onSort: (key: RisksRegistrySortKey) => void;
}) {
  const isActive = activeKey === columnKey;
  return (
    <button
      type="button"
      className="inline-flex max-w-full items-center gap-1 text-left font-medium hover:text-foreground"
      onClick={() => onSort(columnKey)}
      title={`Trier par ${label}`}
    >
      <span className="min-w-0 truncate">{label}</span>
      {isActive ? (
        order === 'asc' ? (
          <ArrowUp className="size-3 shrink-0" aria-hidden />
        ) : (
          <ArrowDown className="size-3 shrink-0" aria-hidden />
        )
      ) : (
        <ArrowUpDown className="size-3 shrink-0 opacity-60" aria-hidden />
      )}
    </button>
  );
}

type TableProps = {
  pageRows: ProjectRiskRegistryRow[];
  canEdit?: boolean;
  onEditRisk?: (row: ProjectRiskRegistryRow) => void;
  sortKey: RisksRegistrySortKey;
  sortOrder: 'asc' | 'desc';
  onSort: (key: RisksRegistrySortKey) => void;
  filters: RisksRegistryFiltersState;
  onFiltersPatch: (patch: Partial<RisksRegistryFiltersState>) => void;
  projectItems: ProjectListItem[];
  ownerOptions: { userId: string; label: string }[];
  taxonomyDomains: RiskTaxonomyDomainApi[];
  filtersDisabled?: boolean;
};

export function RisksRegistryTable({
  pageRows,
  canEdit = false,
  onEditRisk,
  sortKey,
  sortOrder,
  onSort,
  filters,
  onFiltersPatch,
  projectItems,
  ownerOptions,
  taxonomyDomains,
  filtersDisabled,
}: TableProps) {
  const typesForSelectedDomain =
    filters.domainId === ALL
      ? []
      : taxonomyDomains.find((d) => d.id === filters.domainId)?.types ?? [];

  const selectTriggerClass = 'h-8 w-full max-w-[11rem] text-xs';

  return (
    <Table className="min-w-[68rem]">
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[10rem]">
            <SortHeader
              label="Titre"
              columnKey="title"
              activeKey={sortKey}
              order={sortOrder}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="min-w-[9rem]">
            <SortHeader
              label="Projet"
              columnKey="projectName"
              activeKey={sortKey}
              order={sortOrder}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="min-w-[9rem]">
            <SortHeader
              label="Domaine"
              columnKey="domain"
              activeKey={sortKey}
              order={sortOrder}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="min-w-[9rem]">
            <SortHeader
              label="Type"
              columnKey="riskType"
              activeKey={sortKey}
              order={sortOrder}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="min-w-[7rem]">
            <SortHeader
              label="Statut"
              columnKey="status"
              activeKey={sortKey}
              order={sortOrder}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="min-w-[7rem]">
            <SortHeader
              label="Criticité"
              columnKey="criticality"
              activeKey={sortKey}
              order={sortOrder}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="min-w-[8rem]">
            <SortHeader
              label="Propriétaire"
              columnKey="owner"
              activeKey={sortKey}
              order={sortOrder}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="min-w-[6rem]">
            <SortHeader
              label="Revue"
              columnKey="reviewDate"
              activeKey={sortKey}
              order={sortOrder}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="min-w-[6rem]">
            <SortHeader
              label="Échéance"
              columnKey="dueDate"
              activeKey={sortKey}
              order={sortOrder}
              onSort={onSort}
            />
          </TableHead>
        </TableRow>
        <TableRow className="border-b border-border/60 bg-muted/40 hover:bg-muted/40 [&_tr]:border-b-0">
          <TableHead className="min-w-[10rem] p-1.5 align-top">
            <div className="relative w-full max-w-[14rem]">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                className="h-8 pl-8 text-xs"
                placeholder="Titre ou code…"
                value={filters.search}
                onChange={(e) => onFiltersPatch({ search: e.target.value })}
                disabled={filtersDisabled}
                autoComplete="off"
                aria-label="Filtrer par titre ou code"
              />
            </div>
          </TableHead>
          <TableHead className="p-1.5 align-top">
            <Select
              value={filters.projectId}
              onValueChange={(v) =>
                onFiltersPatch({ projectId: v as RisksRegistryFiltersState['projectId'] })
              }
              disabled={filtersDisabled}
            >
              <SelectTrigger className={selectTriggerClass} aria-label="Filtrer par projet">
                <SelectValue placeholder="Tous les projets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les projets</SelectItem>
                {projectItems.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableHead>
          <TableHead className="min-w-[9rem] p-1.5 align-top">
            <Select
              value={filters.domainId}
              onValueChange={(v) =>
                onFiltersPatch({
                  domainId: v as RisksRegistryFiltersState['domainId'],
                  riskTypeId: ALL,
                })
              }
              disabled={filtersDisabled}
            >
              <SelectTrigger className={selectTriggerClass} aria-label="Filtrer par domaine">
                <SelectValue placeholder="Domaine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les domaines</SelectItem>
                {taxonomyDomains.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableHead>
          <TableHead className="min-w-[9rem] p-1.5 align-top">
            <Select
              value={filters.riskTypeId}
              onValueChange={(v) =>
                onFiltersPatch({ riskTypeId: v as RisksRegistryFiltersState['riskTypeId'] })
              }
              disabled={filtersDisabled}
            >
              <SelectTrigger className={selectTriggerClass} aria-label="Filtrer par type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les types</SelectItem>
                {filters.domainId === ALL
                  ? taxonomyDomains.flatMap((d) =>
                      d.types.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {d.name} — {t.name}
                        </SelectItem>
                      )),
                    )
                  : typesForSelectedDomain.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </TableHead>
          <TableHead className="p-1.5 align-top">
            <Select
              value={filters.status}
              onValueChange={(v) =>
                onFiltersPatch({ status: v as RisksRegistryFiltersState['status'] })
              }
              disabled={filtersDisabled}
            >
              <SelectTrigger className={selectTriggerClass} aria-label="Filtrer par statut">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                {STATUS_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {RISK_STATUS_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableHead>
          <TableHead className="p-1.5 align-top">
            <Select
              value={filters.criticality}
              onValueChange={(v) =>
                onFiltersPatch({ criticality: v as RisksRegistryFiltersState['criticality'] })
              }
              disabled={filtersDisabled}
            >
              <SelectTrigger className={selectTriggerClass} aria-label="Filtrer par criticité">
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes</SelectItem>
                {CRIT_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {PROJECT_RISK_CRITICALITY_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableHead>
          <TableHead className="p-1.5 align-top">
            <Select
              value={filters.ownerUserId}
              onValueChange={(v) =>
                onFiltersPatch({ ownerUserId: v as RisksRegistryFiltersState['ownerUserId'] })
              }
              disabled={filtersDisabled}
            >
              <SelectTrigger className={selectTriggerClass} aria-label="Filtrer par propriétaire">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous</SelectItem>
                {ownerOptions.map((o) => (
                  <SelectItem key={o.userId} value={o.userId}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableHead>
          <TableHead className="p-1.5 align-top text-[0.65rem] text-muted-foreground">—</TableHead>
          <TableHead className="p-1.5 align-top text-[0.65rem] text-muted-foreground">—</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pageRows.map((r) => (
          <TableRow key={`${r.projectId}-${r.id}`}>
            <TableCell className="max-w-[min(100%,280px)] font-medium">
              {canEdit && onEditRisk ? (
                <button
                  type="button"
                  onClick={() => onEditRisk(r)}
                  className={cn(
                    'w-full rounded-sm text-left transition-colors',
                    'hover:bg-muted/60 hover:text-primary',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  <span className="line-clamp-2 block" title={r.title}>
                    {r.title}
                  </span>
                </button>
              ) : (
                <span className="line-clamp-2" title={r.title}>
                  {r.title}
                </span>
              )}
              <div className="mt-0.5 font-mono text-[0.65rem] text-muted-foreground">{r.code}</div>
            </TableCell>
            <TableCell className="max-w-[200px]">
              <span className="line-clamp-2" title={r.projectName}>
                {r.projectName}
              </span>
            </TableCell>
            <TableCell className="max-w-[10rem] text-sm text-muted-foreground">
              {r.riskType?.domain?.name ? (
                <span
                  className="line-clamp-2"
                  title={
                    r.riskType.domain.name +
                    (!r.riskType.domain.isActive ? ' (domaine inactif)' : '')
                  }
                >
                  {r.riskType.domain.name}
                  {!r.riskType.domain.isActive ? (
                    <span className="text-muted-foreground/90"> (inactif)</span>
                  ) : null}
                </span>
              ) : (
                '—'
              )}
            </TableCell>
            <TableCell className="max-w-[10rem] text-sm text-muted-foreground">
              {r.riskType?.name || r.category?.trim() ? (
                <span
                  className="line-clamp-2"
                  title={
                    (r.riskType?.name ?? r.category ?? '') +
                    (r.riskType && !r.riskType.isActive ? ' (type inactif)' : '')
                  }
                >
                  {r.riskType?.name ?? r.category?.trim()}
                  {r.riskType && !r.riskType.isActive ? (
                    <span className="text-muted-foreground/90"> (inactif)</span>
                  ) : null}
                </span>
              ) : (
                '—'
              )}
            </TableCell>
            <TableCell>
              <RiskStatusBadge status={r.status} />
            </TableCell>
            <TableCell>
              <RiskLevelBadge level={r.criticalityLevel} />
            </TableCell>
            <TableCell className="max-w-[160px]">
              <span className="line-clamp-2" title={r.ownerDisplayLabel}>
                {r.ownerDisplayLabel}
              </span>
            </TableCell>
            <TableCell className="whitespace-nowrap text-sm tabular-nums">
              {formatDate(r.reviewDate)}
            </TableCell>
            <TableCell className="whitespace-nowrap text-sm tabular-nums">
              {formatDate(r.dueDate)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
