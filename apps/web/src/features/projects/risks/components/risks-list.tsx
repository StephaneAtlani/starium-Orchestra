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
import { PROJECT_RISK_CRITICALITY_LABEL, RISK_PI_SCALE_LABEL } from '../../constants/project-enum-labels';
import type { ProjectRiskRegistryRow } from '../hooks/use-project-risks-registry-query';
import { RISKS_REGISTRY_HORS_PROJET, type RisksRegistryFiltersState } from './risk-filters';
import type { RisksRegistrySortKey } from '../lib/risks-registry-table-sort';
import { cn } from '@/lib/utils';
import { RiskLevelBadge } from './risk-level-badge';

const ALL = 'all';

const CRIT_KEYS = Object.keys(PROJECT_RISK_CRITICALITY_LABEL) as (keyof typeof PROJECT_RISK_CRITICALITY_LABEL)[];

function piScaleShort(n: number): string {
  const full = RISK_PI_SCALE_LABEL[String(n)];
  if (!full) return String(n);
  const dash = full.indexOf('—');
  return dash >= 0 ? full.slice(dash + 2).trim() : full;
}

function RegistryTextCell({
  value,
  canEdit,
  onEdit,
}: {
  value: string | null | undefined;
  canEdit: boolean;
  onEdit?: () => void;
}) {
  const text = value?.trim();
  const display = text && text !== '—' ? text : '—';
  if (canEdit && onEdit) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className={cn(
          'w-full rounded-sm text-left text-sm transition-colors',
          'hover:bg-muted/60 hover:text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        <span className="line-clamp-3 block" title={display}>
          {display}
        </span>
      </button>
    );
  }
  return (
    <span className="line-clamp-3 text-sm" title={display}>
      {display}
    </span>
  );
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
  ownerOptions: _ownerOptions,
  taxonomyDomains,
  filtersDisabled,
}: TableProps) {
  const selectTriggerClass = 'h-8 w-full max-w-[11rem] text-xs';

  return (
    <Table className="min-w-[96rem]">
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[8rem]">
            <SortHeader label="Domaine" columnKey="domain" activeKey={sortKey} order={sortOrder} onSort={onSort} />
          </TableHead>
          <TableHead className="min-w-[11rem]">
            <SortHeader
              label="Événement redouté"
              columnKey="fearedEvent"
              activeKey={sortKey}
              order={sortOrder}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="min-w-[9rem]">
            <SortHeader
              label="Source de risque"
              columnKey="threatSource"
              activeKey={sortKey}
              order={sortOrder}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="min-w-[12rem]">
            <SortHeader label="Scénario de risque" columnKey="scenario" activeKey={sortKey} order={sortOrder} onSort={onSort} />
          </TableHead>
          <TableHead className="min-w-[6rem]">
            <SortHeader label="Gravité" columnKey="impact" activeKey={sortKey} order={sortOrder} onSort={onSort} />
          </TableHead>
          <TableHead className="min-w-[6rem]">
            <SortHeader label="Vraisemblance" columnKey="probability" activeKey={sortKey} order={sortOrder} onSort={onSort} />
          </TableHead>
          <TableHead className="min-w-[7rem]">
            <SortHeader label="Risque initial" columnKey="initialRisk" activeKey={sortKey} order={sortOrder} onSort={onSort} />
          </TableHead>
          <TableHead className="min-w-[11rem]">
            <SortHeader
              label="Mesures existantes / préventives"
              columnKey="existingMeasures"
              activeKey={sortKey}
              order={sortOrder}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="min-w-[11rem]">
            <SortHeader
              label="Traitement / mesures complémentaires"
              columnKey="complementaryTreatment"
              activeKey={sortKey}
              order={sortOrder}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="min-w-[7rem]">
            <SortHeader
              label="Risque résiduel cible"
              columnKey="residualTarget"
              activeKey={sortKey}
              order={sortOrder}
              onSort={onSort}
            />
          </TableHead>
        </TableRow>
        <TableRow className="border-b border-border/60 bg-muted/40 hover:bg-muted/40 [&_tr]:border-b-0">
          <TableHead className="p-1.5 align-top" colSpan={4}>
            <div className="relative w-full max-w-md">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                className="h-8 pl-8 text-xs"
                placeholder="Événement, source, scénario, titre ou code…"
                value={filters.search}
                onChange={(e) => onFiltersPatch({ search: e.target.value })}
                disabled={filtersDisabled}
                autoComplete="off"
                aria-label="Filtrer le registre EBIOS"
              />
            </div>
          </TableHead>
          <TableHead className="p-1.5 align-top" colSpan={2}>
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
                    {d.familyLabel ? `${d.familyLabel} — ${d.name}` : d.name}
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
              <SelectTrigger className={selectTriggerClass} aria-label="Filtrer par risque initial">
                <SelectValue placeholder="Tous niveaux" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous niveaux</SelectItem>
                {CRIT_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {PROJECT_RISK_CRITICALITY_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableHead>
          <TableHead className="p-1.5 align-top" colSpan={3}>
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
                <SelectItem value={RISKS_REGISTRY_HORS_PROJET}>Hors projet</SelectItem>
                {projectItems.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pageRows.map((r) => {
          const openEdit = canEdit && onEditRisk ? () => onEditRisk(r) : undefined;
          const fearedLabel = r.fearedEvent?.trim() && r.fearedEvent !== '—' ? r.fearedEvent : r.title;
          return (
            <TableRow key={r.id}>
              <TableCell className="max-w-[10rem] text-sm text-muted-foreground">
                {r.riskType?.domain?.name ? (
                  <span className="line-clamp-2" title={r.riskType.domain.name}>
                    {r.riskType.domain.name}
                  </span>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell className="max-w-[14rem] font-medium">
                <RegistryTextCell value={fearedLabel} canEdit={Boolean(openEdit)} onEdit={openEdit} />
                <div className="mt-0.5 font-mono text-[0.65rem] text-muted-foreground">{r.code}</div>
              </TableCell>
              <TableCell className="max-w-[11rem]">
                <RegistryTextCell value={r.threatSource} canEdit={Boolean(openEdit)} onEdit={openEdit} />
              </TableCell>
              <TableCell className="max-w-[14rem]">
                <RegistryTextCell value={r.description} canEdit={Boolean(openEdit)} onEdit={openEdit} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm tabular-nums" title={RISK_PI_SCALE_LABEL[String(r.impact)]}>
                {r.impact} — {piScaleShort(r.impact)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm tabular-nums" title={RISK_PI_SCALE_LABEL[String(r.probability)]}>
                {r.probability} — {piScaleShort(r.probability)}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="tabular-nums text-sm font-medium">{r.criticalityScore}</span>
                  <RiskLevelBadge level={r.criticalityLevel} />
                </div>
              </TableCell>
              <TableCell className="max-w-[12rem]">
                <RegistryTextCell value={r.existingSecurityMeasures} canEdit={Boolean(openEdit)} onEdit={openEdit} />
              </TableCell>
              <TableCell className="max-w-[12rem]">
                <RegistryTextCell
                  value={r.complementaryTreatmentMeasures}
                  canEdit={Boolean(openEdit)}
                  onEdit={openEdit}
                />
              </TableCell>
              <TableCell>
                {r.residualRiskLevel ? (
                  <RiskLevelBadge level={r.residualRiskLevel} />
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
