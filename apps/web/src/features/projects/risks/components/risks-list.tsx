'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumTableWrap, useStariumTablePan } from '@/components/ui/starium-table-wrap';
import { PaginationSummary } from '@/features/budgets/components/pagination-summary';
import { RISK_PI_SCALE_LABEL } from '../../constants/project-enum-labels';
import type { ProjectRiskRegistryRow } from '../hooks/use-project-risks-registry-query';
import type { RisksRegistrySortKey } from '../lib/risks-registry-table-sort';
import {
  riskCriticalityDsBadgeClass,
  riskCriticalityLabel,
  riskPiShortLabel,
  riskPiTone,
  riskPiToneClass,
} from '../../lib/project-risk-display';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

export function risksRegistryPageSize(): number {
  return PAGE_SIZE;
}

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
            className="min-h-11 md:min-h-0"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
            Précédent
          </Button>
          <span className="tabular-nums text-sm text-muted-foreground">
            Page {safePage} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 md:min-h-0"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
          >
            Suivant
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
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
      className="inline-flex max-w-full items-center gap-1 text-left hover:text-foreground"
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

function RegistryCellText({ value }: { value: string | null | undefined }) {
  const text = value?.trim();
  const display = text && text !== '—' ? text : '—';
  return (
    <span className="line-clamp-3" title={display}>
      {display}
    </span>
  );
}

type TableProps = {
  pageRows: ProjectRiskRegistryRow[];
  canEdit?: boolean;
  onEditRisk?: (row: ProjectRiskRegistryRow) => void;
  sortKey: RisksRegistrySortKey;
  sortOrder: 'asc' | 'desc';
  onSort: (key: RisksRegistrySortKey) => void;
};

export function RisksRegistryTable({
  pageRows,
  canEdit = false,
  onEditRisk,
  sortKey,
  sortOrder,
  onSort,
}: TableProps) {
  return (
    <StariumTableWrap scrollLabel="Registre EBIOS RM — glisser pour faire défiler">
      <table className="starium-dt min-w-[96rem]">
          <caption className="sr-only">Registre des risques EBIOS RM</caption>
          <thead>
            <tr>
              <th scope="col">
                <SortHeader label="Domaine" columnKey="domain" activeKey={sortKey} order={sortOrder} onSort={onSort} />
              </th>
              <th scope="col">
                <SortHeader
                  label="Événement redouté"
                  columnKey="fearedEvent"
                  activeKey={sortKey}
                  order={sortOrder}
                  onSort={onSort}
                />
              </th>
              <th scope="col">
                <SortHeader
                  label="Source de risque"
                  columnKey="threatSource"
                  activeKey={sortKey}
                  order={sortOrder}
                  onSort={onSort}
                />
              </th>
              <th scope="col">
                <SortHeader label="Scénario de risque" columnKey="scenario" activeKey={sortKey} order={sortOrder} onSort={onSort} />
              </th>
              <th scope="col">
                <SortHeader label="Gravité" columnKey="impact" activeKey={sortKey} order={sortOrder} onSort={onSort} />
              </th>
              <th scope="col">
                <SortHeader label="Vraisemblance" columnKey="probability" activeKey={sortKey} order={sortOrder} onSort={onSort} />
              </th>
              <th scope="col">
                <SortHeader label="Risque initial" columnKey="initialRisk" activeKey={sortKey} order={sortOrder} onSort={onSort} />
              </th>
              <th scope="col">
                <SortHeader
                  label="Mesures existantes / préventives"
                  columnKey="existingMeasures"
                  activeKey={sortKey}
                  order={sortOrder}
                  onSort={onSort}
                />
              </th>
              <th scope="col">
                <SortHeader
                  label="Traitement / mesures complémentaires"
                  columnKey="complementaryTreatment"
                  activeKey={sortKey}
                  order={sortOrder}
                  onSort={onSort}
                />
              </th>
              <th scope="col">
                <SortHeader
                  label="Risque résiduel cible"
                  columnKey="residualTarget"
                  activeKey={sortKey}
                  order={sortOrder}
                  onSort={onSort}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <RiskRegistryRow
                key={r.id}
                row={r}
                canEdit={canEdit}
                onEditRisk={onEditRisk}
              />
            ))}
          </tbody>
        </table>
    </StariumTableWrap>
  );
}

function RiskRegistryRow({
  row: r,
  canEdit,
  onEditRisk,
}: {
  row: ProjectRiskRegistryRow;
  canEdit: boolean;
  onEditRisk?: (row: ProjectRiskRegistryRow) => void;
}) {
  const { shouldSuppressClick } = useStariumTablePan();
  const openEdit = canEdit && onEditRisk ? () => onEditRisk(r) : undefined;
  const fearedLabel = r.fearedEvent?.trim() && r.fearedEvent !== '—' ? r.fearedEvent : r.title;

  return (
    <tr
      className={cn(openEdit && 'cursor-pointer')}
      onClick={() => {
        if (shouldSuppressClick()) return;
        openEdit?.();
      }}
      onKeyDown={(event) => {
        if (!openEdit) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openEdit();
        }
      }}
      tabIndex={openEdit ? 0 : undefined}
    >
      <td className="max-w-[10rem] text-muted-foreground">
        {r.riskType?.domain?.name ? (
          <span className="line-clamp-2" title={r.riskType.domain.name}>
            {r.riskType.domain.name}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="max-w-[14rem]">
        <div className="starium-dt-cell-strong line-clamp-2">{fearedLabel}</div>
        <div className="starium-dt-cell-sub font-mono">{r.code}</div>
      </td>
      <td className="max-w-[11rem]">
        <RegistryCellText value={r.threatSource} />
      </td>
      <td className="max-w-[14rem]">
        <RegistryCellText value={r.description} />
      </td>
      <td
        className={cn('whitespace-nowrap tabular-nums', riskPiToneClass(riskPiTone(r.impact)))}
        title={RISK_PI_SCALE_LABEL[String(r.impact)]}
      >
        {r.impact} — {riskPiShortLabel(r.impact)}
      </td>
      <td
        className={cn('whitespace-nowrap tabular-nums', riskPiToneClass(riskPiTone(r.probability)))}
        title={RISK_PI_SCALE_LABEL[String(r.probability)]}
      >
        {r.probability} — {riskPiShortLabel(r.probability)}
      </td>
      <td>
        <div className="flex flex-col gap-1">
          <span className="tabular-nums text-sm font-semibold">{r.criticalityScore}</span>
          <span className={cn('starium-ds-badge w-fit', riskCriticalityDsBadgeClass(r.criticalityLevel))}>
            {riskCriticalityLabel(r.criticalityLevel)}
          </span>
        </div>
      </td>
      <td className="max-w-[12rem]">
        <RegistryCellText value={r.existingSecurityMeasures} />
      </td>
      <td className="max-w-[12rem]">
        <RegistryCellText value={r.complementaryTreatmentMeasures} />
      </td>
      <td>
        {r.residualRiskLevel ? (
          <span className={cn('starium-ds-badge', riskCriticalityDsBadgeClass(r.residualRiskLevel))}>
            {riskCriticalityLabel(r.residualRiskLevel)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
