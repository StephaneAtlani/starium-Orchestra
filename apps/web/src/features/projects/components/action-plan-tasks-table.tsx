'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ActionPlanTaskApi } from '@/features/projects/types/project.types';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';
import {
  taskPriorityBadgeClass,
  taskPriorityLabel,
  taskStatusBadgeClass,
  taskStatusLabel,
} from '@/lib/ui/badge-registry';
import { cn } from '@/lib/utils';

const th = 'text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground';

/** Champs alignés sur l’API `GET .../tasks?sortBy=` */
export type ActionPlanTaskSortField =
  | 'name'
  | 'status'
  | 'priority'
  | 'plannedStartDate'
  | 'plannedEndDate'
  | 'estimatedHours'
  | 'ownerUserId'
  | 'createdAt'
  | 'sortOrder';

function HeaderTip({ children, tip }: { children: ReactNode; tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex max-w-full cursor-help flex-col border-b border-dotted border-muted-foreground/45" />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="max-w-xs text-left leading-snug">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

function SortHeaderButton({
  label,
  sortKey,
  sortBy,
  sortOrder,
  onSort,
}: {
  label: string;
  sortKey: ActionPlanTaskSortField;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (key: ActionPlanTaskSortField) => void;
}) {
  const isActive = sortBy === sortKey;
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 hover:text-foreground"
      onClick={() => onSort(sortKey)}
      title={`Trier par ${label}`}
    >
      <span>{label}</span>
      {isActive ? (
        sortOrder === 'asc' ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ArrowUpDown className="size-3 opacity-60" />
      )}
    </button>
  );
}

function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(new Date(iso));
  } catch {
    return '—';
  }
}

function formatUser(
  id: string | null | undefined,
  users: { id: string; firstName: string | null; lastName: string | null; email: string }[],
): string {
  if (!id) return '—';
  const u = users.find((x) => x.id === id);
  if (!u) return '—';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

function formatResourcePerson(r: {
  firstName: string | null;
  name: string;
  code: string | null;
}): string {
  const label = [r.firstName, r.name].filter(Boolean).join(' ').trim();
  return label || r.code || '—';
}

function formatTagsCell(tags: unknown): string {
  if (tags == null) return '—';
  if (Array.isArray(tags) && tags.every((x) => typeof x === 'string')) {
    return tags.length ? tags.join(', ') : '—';
  }
  return '—';
}

export type ActionPlanTasksTableProps = {
  items: ActionPlanTaskApi[];
  users: { id: string; firstName: string | null; lastName: string | null; email: string }[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (key: ActionPlanTaskSortField) => void;
  onRowClick: (taskId: string) => void;
};

export function ActionPlanTasksTable({
  items,
  users,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
}: ActionPlanTasksTableProps) {
  const { merged } = useClientUiBadgeConfig();

  return (
    <TooltipProvider delay={250}>
      <Table className="min-w-[72rem] text-sm">
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(th, 'min-w-[11rem]')}>
              <HeaderTip tip="Nom de la tâche. Cliquez pour trier.">
                <SortHeaderButton
                  label="Tâche"
                  sortKey="name"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSort}
                />
              </HeaderTip>
            </TableHead>
            <TableHead className={cn(th, 'w-[7rem]')}>
              <HeaderTip tip="Statut d’exécution de la tâche.">
                <SortHeaderButton
                  label="Statut"
                  sortKey="status"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSort}
                />
              </HeaderTip>
            </TableHead>
            <TableHead className={cn(th, 'w-[7rem]')}>
              <HeaderTip tip="Priorité.">
                <SortHeaderButton
                  label="Priorité"
                  sortKey="priority"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSort}
                />
              </HeaderTip>
            </TableHead>
            <TableHead className={cn(th, 'min-w-[10rem]')}>
              <HeaderTip tip="Projet Starium rattaché (s’il existe).">Projet</HeaderTip>
            </TableHead>
            <TableHead className={cn(th, 'min-w-[10rem]')}>
              <HeaderTip tip="Risque EBIOS lié (s’il existe).">Risque</HeaderTip>
            </TableHead>
            <TableHead className={cn(th, 'w-[6.5rem]')}>
              <HeaderTip tip="Date de début planifiée.">
                <SortHeaderButton
                  label="Début"
                  sortKey="plannedStartDate"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSort}
                />
              </HeaderTip>
            </TableHead>
            <TableHead className={cn(th, 'w-[6.5rem]')}>
              <HeaderTip tip="Date de fin planifiée.">
                <SortHeaderButton
                  label="Échéance"
                  sortKey="plannedEndDate"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSort}
                />
              </HeaderTip>
            </TableHead>
            <TableHead className={cn(th, 'w-[5rem] text-right')}>
              <div className="flex w-full justify-end">
                <HeaderTip tip="Charge estimée (heures).">
                  <SortHeaderButton
                    label="Charge (h)"
                    sortKey="estimatedHours"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={onSort}
                  />
                </HeaderTip>
              </div>
            </TableHead>
            <TableHead className={cn(th, 'min-w-[8rem]')}>
              <HeaderTip tip="Tags libres — pas de tri serveur.">Tags</HeaderTip>
            </TableHead>
            <TableHead className={cn(th, 'min-w-[9rem]')}>
              <HeaderTip tip="Compte utilisateur responsable (tri sur l’identifiant).">
                <SortHeaderButton
                  label="Responsable"
                  sortKey="ownerUserId"
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSort}
                />
              </HeaderTip>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              tabIndex={0}
              onClick={() => onRowClick(row.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(row.id);
                }
              }}
            >
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>
                <RegistryBadge className={taskStatusBadgeClass(merged, row.status)}>
                  {taskStatusLabel(merged, row.status)}
                </RegistryBadge>
              </TableCell>
              <TableCell>
                <RegistryBadge className={taskPriorityBadgeClass(merged, row.priority)}>
                  {taskPriorityLabel(merged, row.priority)}
                </RegistryBadge>
              </TableCell>
              <TableCell>
                {row.project ? `${row.project.code} — ${row.project.name}` : '—'}
              </TableCell>
              <TableCell>
                {row.risk ? `${row.risk.code} — ${row.risk.title}` : '—'}
              </TableCell>
              <TableCell className="tabular-nums">{fmtShortDate(row.plannedStartDate)}</TableCell>
              <TableCell className="tabular-nums">{fmtShortDate(row.plannedEndDate)}</TableCell>
              <TableCell className="tabular-nums text-right">
                {row.estimatedHours != null && !Number.isNaN(Number(row.estimatedHours))
                  ? String(row.estimatedHours)
                  : '—'}
              </TableCell>
              <TableCell className="max-w-[140px] truncate text-muted-foreground">
                {formatTagsCell(row.tags)}
              </TableCell>
              <TableCell>
                {row.responsibleResource
                  ? formatResourcePerson(row.responsibleResource)
                  : formatUser(row.ownerUserId, users)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
