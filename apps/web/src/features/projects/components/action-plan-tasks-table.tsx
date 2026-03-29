'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ActionPlanTaskApi } from '@/features/projects/types/project.types';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';
import {
  PROJECT_TASK_PRIORITIES,
  PROJECT_TASK_STATUSES,
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
  search: string;
  onSearchChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  priority: string;
  onPriorityChange: (v: string) => void;
  projectId: string;
  onProjectIdChange: (v: string) => void;
  riskId: string;
  onRiskIdChange: (v: string) => void;
  ownerUserId: string;
  onOwnerUserIdChange: (v: string) => void;
  projectOptions: { id: string; label: string }[];
  riskOptions: { id: string; label: string }[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (key: ActionPlanTaskSortField) => void;
  onRowClick: (taskId: string) => void;
};

export function ActionPlanTasksTable({
  items,
  users,
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  projectId,
  onProjectIdChange,
  riskId,
  onRiskIdChange,
  ownerUserId,
  onOwnerUserIdChange,
  projectOptions,
  riskOptions,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
}: ActionPlanTasksTableProps) {
  const { merged } = useClientUiBadgeConfig();
  const statusKey = status || '__all';
  const priorityKey = priority || '__all';
  const projectKey = projectId || '__all';
  const riskKey = riskId || '__all';
  const ownerKey = ownerUserId || '__all';

  return (
    <TooltipProvider delay={250}>
      <Table className="min-w-[72rem] text-sm">
        <TableHeader className="bg-muted/50 [&_tr]:border-b-0">
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className={cn(th, 'min-w-[11rem]')}>
              <HeaderTip tip="Nom de la tâche — recherche partielle sur le libellé.">
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
          <TableRow className="border-t border-border/50 bg-muted/35 hover:bg-muted/35">
            <TableHead className="p-2">
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher…"
                className="h-7 text-xs"
                aria-label="Filtrer par nom de tâche"
              />
            </TableHead>
            <TableHead className="p-2">
              <Select
                value={statusKey}
                onValueChange={(v) => onStatusChange(!v || v === '__all' ? '' : v)}
              >
                <SelectTrigger size="sm" className="h-7 w-full text-xs">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Tous</SelectItem>
                  {PROJECT_TASK_STATUSES.map((k) => (
                    <SelectItem key={k} value={k}>
                      {merged.projectTaskStatus[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableHead>
            <TableHead className="p-2">
              <Select
                value={priorityKey}
                onValueChange={(v) => onPriorityChange(!v || v === '__all' ? '' : v)}
              >
                <SelectTrigger size="sm" className="h-7 w-full text-xs">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Toutes</SelectItem>
                  {PROJECT_TASK_PRIORITIES.map((k) => (
                    <SelectItem key={k} value={k}>
                      {merged.projectTaskPriority[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableHead>
            <TableHead className="p-2">
              <Select
                value={projectKey}
                onValueChange={(v) => onProjectIdChange(!v || v === '__all' ? '' : v)}
              >
                <SelectTrigger size="sm" className="h-7 w-full text-xs">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Tous projets</SelectItem>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableHead>
            <TableHead className="p-2">
              <Select
                value={riskKey}
                onValueChange={(v) => onRiskIdChange(!v || v === '__all' ? '' : v)}
              >
                <SelectTrigger size="sm" className="h-7 w-full text-xs">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Tous risques</SelectItem>
                  {riskOptions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableHead>
            <TableHead className="p-2 text-center text-[0.65rem] text-muted-foreground">
              —
            </TableHead>
            <TableHead className="p-2 text-center text-[0.65rem] text-muted-foreground">
              —
            </TableHead>
            <TableHead className="p-2 text-center text-[0.65rem] text-muted-foreground">
              —
            </TableHead>
            <TableHead className="p-2 text-center text-[0.65rem] text-muted-foreground">
              —
            </TableHead>
            <TableHead className="p-2">
              <Select
                value={ownerKey}
                onValueChange={(v) => onOwnerUserIdChange(!v || v === '__all' ? '' : v)}
              >
                <SelectTrigger size="sm" className="h-7 w-full text-xs">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Tous</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Badge
                  variant="outline"
                  className={cn('font-normal', taskStatusBadgeClass(merged, row.status))}
                >
                  {taskStatusLabel(merged, row.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn('font-normal', taskPriorityBadgeClass(merged, row.priority))}
                >
                  {taskPriorityLabel(merged, row.priority)}
                </Badge>
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
