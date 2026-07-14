'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProjectListItem } from '../types/project.types';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import {
  PROJECT_KIND_LABEL,
  PROJECT_STATUS_LABEL,
} from '../constants/project-enum-labels';
import { ProjectTableHealthPill, ProjectTableStatusPill, getProjectHealthTableLabel } from './project-table-pills';
import { ProjectTrjBadges, ProjectPortfolioSignalIcon } from './project-portfolio-trj-signaux';
import { ProjectPilotageCellTooltip } from './project-pilotage-cell-tooltip';
import {
  PROJECTS_TABLE_HEADER_TOOLTIPS,
  buildProjectBudgetCellTooltip,
  buildProjectDueDateCellTooltip,
  buildProjectHealthCellTooltip,
  buildProjectProgressCellTooltip,
  buildProjectTagsCellTooltip,
  projectsTableSignalsHeaderTooltip,
  projectsTableTrjHeaderTooltip,
} from './projects-table-tooltips';
import { cn } from '@/lib/utils';
import {
  projectKindBadgeClass,
  type ProjectKindBadgeKey,
} from '@/lib/ui/badge-registry';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';
import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listAssignableUsers } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { projectTagBadgeStyle } from '../lib/project-tag-badge-style';
import { ProjectTagsFilter } from './project-tags-filter';
import { ProjectProgressRow } from './project-progress-row';
import type { ProjectsTableColumnDensity } from '../lib/projects-table-column-density';
import {
  formatProjectDateLong,
  projectListProgressPercent,
  projectOwnerInitials,
  projectOwnerShortLabel,
  projectPortfolioCategoryIcon,
  projectPortfolioCategoryIconPresentation,
  projectPortfolioCategoryLabel,
} from '../lib/projects-list-display';
import { ProjectsListRowActionsMenu } from './projects-list-row-actions-menu';
import { ProjectsListBudgetSummary } from './projects-list-budget-summary';

const EXTENDED_COLUMN_COUNT = 11;
const BASIC_COLUMN_COUNT = 9;

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

const TOOLTIP_CONTENT_CLASS =
  'max-w-[14rem] px-2.5 py-2 !block text-left leading-snug [&]:items-start';

function HeaderTip({
  children,
  tip,
  triggerClassName,
  contentAlign = 'start',
}: {
  children: ReactNode;
  tip: ReactNode;
  triggerClassName?: string;
  contentAlign?: 'start' | 'center' | 'end';
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              'inline-flex max-w-full cursor-help border-b border-dotted border-muted-foreground/45',
              triggerClassName,
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom" align={contentAlign} className={TOOLTIP_CONTENT_CLASS}>
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

function SortHeaderButton({
  label,
  sortKey,
  filters,
  setFilters,
}: {
  label: string;
  sortKey: ProjectsListFilters['sortBy'];
  filters: ProjectsListFilters;
  setFilters: (updates: Partial<ProjectsListFilters>) => void;
}) {
  const isActive = filters.sortBy === sortKey;
  const nextOrder =
    isActive && filters.sortOrder === 'asc'
      ? ('desc' as const)
      : ('asc' as const);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 hover:text-foreground"
      onClick={() => setFilters({ sortBy: sortKey, sortOrder: nextOrder })}
      title={`Trier par ${label}`}
    >
      <span>{label}</span>
      {isActive ? (
        filters.sortOrder === 'asc' ? (
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

function CellTip({
  tip,
  children,
  className,
  wrap = false,
  align = 'start',
}: {
  tip: ReactNode;
  children: ReactNode;
  className?: string;
  wrap?: boolean;
  align?: 'start' | 'center' | 'end';
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              'max-w-full cursor-help',
              wrap ? 'block w-full whitespace-normal' : 'inline-flex',
              className,
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" align={align} className={TOOLTIP_CONTENT_CLASS}>
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

function FilterDash() {
  return (
    <TableHead className="h-auto min-h-0 border-b border-border bg-card px-2 !pt-0 pb-2 text-center normal-case text-muted-foreground">
      —
    </TableHead>
  );
}

function BasicProjectCell({ project }: { project: ProjectListItem }) {
  const CategoryIcon = projectPortfolioCategoryIcon(project);
  const categoryLabel = projectPortfolioCategoryLabel(project);
  const iconPresentation = projectPortfolioCategoryIconPresentation(project);

  return (
    <div className="flex items-start gap-3">
      <div {...iconPresentation} aria-hidden>
        <CategoryIcon className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <Link href={`/projects/${project.id}`} className="starium-proj-name block truncate">
          {project.name}
        </Link>
        {categoryLabel ? (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{categoryLabel}</div>
        ) : null}
      </div>
    </div>
  );
}

function MyRoleCell({ project }: { project: ProjectListItem }) {
  const roles = project.myRoles ?? (project.myRole ? [project.myRole] : []);
  if (roles.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return <span className="block truncate text-sm text-foreground">{roles.join(', ')}</span>;
}

export function ProjectsListTableDesktop({
  items,
  filters,
  setFilters,
  columnDensity,
}: {
  items: ProjectListItem[];
  filters: ProjectsListFilters;
  setFilters: (updates: Partial<ProjectsListFilters>) => void;
  columnDensity: ProjectsTableColumnDensity;
}) {
  const isExtended = columnDensity === 'extended';
  const columnCount = isExtended ? EXTENDED_COLUMN_COUNT : BASIC_COLUMN_COUNT;

  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const assignableUsersQuery = useQuery({
    queryKey: projectQueryKeys.assignableUsers(clientId),
    queryFn: () => listAssignableUsers(authFetch),
    enabled: Boolean(clientId),
  });
  const { merged: badgeMerged } = useClientUiBadgeConfig();
  const ownerOptions = (assignableUsersQuery.data?.users ?? [])
    .map((user) => {
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
      return { id: user.id, label: name || user.email };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'fr-FR'));
  const kindKey = filters.kind ?? '__all__';
  const statusKey = filters.status ?? '__all__';
  const healthKey = filters.computedHealth ?? '__all__';
  const myRoleKey = filters.myRole ?? '__all__';
  const ownerKey = filters.ownerUserId ?? '__all__';
  const myRoleOptions = Array.from(
    new Set(
      items
        .flatMap((item) => item.myRoles ?? (item.myRole ? [item.myRole] : []))
        .map((role) => role.trim())
        .filter((value): value is string => Boolean(value && value.length > 0)),
    ),
  ).sort((a, b) => a.localeCompare(b, 'fr'));

  const projectHeadClass =
    'sticky left-0 z-[52] min-w-[14rem] bg-card starium-table-sticky-edge';
  const projectCellClass =
    'sticky left-0 z-20 align-top bg-card py-3 pl-4 starium-table-sticky-edge min-w-[14rem] max-w-[18rem]';

  return (
    <TooltipProvider delay={250}>
      <Table
        noWrapper
        className={cn(
          'starium-projects-table text-[12.5px]',
          isExtended ? 'min-w-[54rem]' : 'min-w-[48rem]',
        )}
      >
        <TableHeader className="sticky top-0 z-50 [&_tr]:border-b-0">
          <TableRow className="starium-projects-table-label-row border-0 hover:bg-transparent">
            <TableHead
              rowSpan={2}
              className={cn(
                projectHeadClass,
                'starium-projects-table-project-head align-top !py-0 normal-case',
              )}
            >
              <div className="starium-projects-table-project-head__inner flex h-full min-h-full flex-col">
                <div className="starium-projects-table-project-head__label py-[var(--ds-table-head-py)] pl-4 pr-2">
                  <HeaderTip tip={PROJECTS_TABLE_HEADER_TOOLTIPS.project}>
                    <SortHeaderButton
                      label="Projet"
                      sortKey="name"
                      filters={filters}
                      setFilters={setFilters}
                    />
                  </HeaderTip>
                </div>
                <div
                  className="starium-projects-table-project-head__filter-slot flex-1 pl-4 pr-2"
                  aria-label="Filtre par étiquettes"
                >
                  <ProjectTagsFilter
                    compact
                    value={filters.tagIds ?? []}
                    matchMode={filters.tagIdsMatch ?? 'any'}
                    onMatchModeChange={(tagIdsMatch) => setFilters({ tagIdsMatch })}
                    onChange={(tagIds) =>
                      setFilters({ tagIds: tagIds.length > 0 ? tagIds : undefined })
                    }
                  />
                </div>
              </div>
            </TableHead>
            {isExtended ? (
              <TableHead className="w-[5.5rem]">
                <HeaderTip tip={PROJECTS_TABLE_HEADER_TOOLTIPS.kind}>
                  Nature
                </HeaderTip>
              </TableHead>
            ) : null}
            <TableHead className="w-[6.5rem]">
              <HeaderTip tip={PROJECTS_TABLE_HEADER_TOOLTIPS.health}>
                <SortHeaderButton
                  label="Santé"
                  sortKey="computedHealth"
                  filters={filters}
                  setFilters={setFilters}
                />
              </HeaderTip>
            </TableHead>
            <TableHead className="min-w-[7rem]">
              <HeaderTip tip={PROJECTS_TABLE_HEADER_TOOLTIPS.status}>
                <SortHeaderButton
                  label="Statut"
                  sortKey="status"
                  filters={filters}
                  setFilters={setFilters}
                />
              </HeaderTip>
            </TableHead>
            <TableHead className="min-w-[9rem]">
              <HeaderTip tip={PROJECTS_TABLE_HEADER_TOOLTIPS.myRole}>Mon rôle</HeaderTip>
            </TableHead>
            {isExtended ? (
              <TableHead className="min-w-[10rem]">
                <HeaderTip tip={PROJECTS_TABLE_HEADER_TOOLTIPS.owner}>
                  <SortHeaderButton
                    label="Chef de projets"
                    sortKey="owner"
                    filters={filters}
                    setFilters={setFilters}
                  />
                </HeaderTip>
              </TableHead>
            ) : null}
            <TableHead className={cn('text-right', isExtended ? 'w-[7.5rem]' : 'min-w-[8rem]')}>
              <div className="flex w-full justify-end">
                <HeaderTip
                  tip={PROJECTS_TABLE_HEADER_TOOLTIPS.progress}
                  triggerClassName="flex flex-col items-end text-right"
                  contentAlign="end"
                >
                  <span className="block">
                    <SortHeaderButton
                      label="Avancement"
                      sortKey="progressPercent"
                      filters={filters}
                      setFilters={setFilters}
                    />
                  </span>
                  {isExtended ? (
                    <span className="block font-normal normal-case tracking-normal text-[0.6rem] text-muted-foreground/90">
                      manuel / dérivé
                    </span>
                  ) : null}
                </HeaderTip>
              </div>
            </TableHead>
            <TableHead className="w-[6.5rem]">
              <HeaderTip tip={PROJECTS_TABLE_HEADER_TOOLTIPS.dueDate}>
                <SortHeaderButton
                  label="Échéance"
                  sortKey="targetEndDate"
                  filters={filters}
                  setFilters={setFilters}
                />
              </HeaderTip>
            </TableHead>
            {!isExtended ? (
              <>
                <TableHead className="min-w-[7.5rem]">
                  <HeaderTip tip={PROJECTS_TABLE_HEADER_TOOLTIPS.budget}>
                    Budget
                  </HeaderTip>
                </TableHead>
                <TableHead className="min-w-[8rem]">
                  <HeaderTip tip={PROJECTS_TABLE_HEADER_TOOLTIPS.responsible}>
                    <SortHeaderButton
                      label="Responsable projet"
                      sortKey="owner"
                      filters={filters}
                      setFilters={setFilters}
                    />
                  </HeaderTip>
                </TableHead>
                <TableHead className="w-[3rem] pr-4 text-center">
                  <HeaderTip tip={PROJECTS_TABLE_HEADER_TOOLTIPS.actions} contentAlign="center">
                    <span className="sr-only">Actions</span>
                    <span aria-hidden>⋯</span>
                  </HeaderTip>
                </TableHead>
              </>
            ) : (
              <>
                <TableHead className="w-[5rem] text-center">
                  <div className="flex justify-center">
                    <HeaderTip
                      tip={projectsTableTrjHeaderTooltip()}
                      triggerClassName="items-center"
                      contentAlign="center"
                    >
                      T · R · J
                    </HeaderTip>
                  </div>
                </TableHead>
                <TableHead className="w-[5.5rem] text-center pr-4">
                  <div className="flex justify-center">
                    <HeaderTip
                      tip={projectsTableSignalsHeaderTooltip()}
                      triggerClassName="items-center"
                      contentAlign="center"
                    >
                      Signaux
                    </HeaderTip>
                  </div>
                </TableHead>
                <TableHead className="min-w-[10rem] pr-4">
                  <HeaderTip tip={PROJECTS_TABLE_HEADER_TOOLTIPS.tags}>Étiquettes</HeaderTip>
                </TableHead>
              </>
            )}
          </TableRow>

          <TableRow className="starium-projects-table-filter-row border-0 border-b border-border bg-card pt-0 hover:bg-card">
            {isExtended ? (
              <TableHead className="h-auto min-h-0 px-2 !pt-0 pb-2">
                <Select
                  value={kindKey}
                  onValueChange={(v) =>
                    setFilters({ kind: !v || v === '__all__' ? undefined : v })
                  }
                >
                  <SelectTrigger size="sm" className="starium-col-filter h-6 w-full text-[10px]">
                    <SelectValue>
                      {kindKey === '__all__'
                        ? 'Toutes'
                        : PROJECT_KIND_LABEL[kindKey] ?? kindKey}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Toutes</SelectItem>
                    <SelectItem value="PROJECT">{PROJECT_KIND_LABEL.PROJECT}</SelectItem>
                    <SelectItem value="ACTIVITY">{PROJECT_KIND_LABEL.ACTIVITY}</SelectItem>
                  </SelectContent>
                </Select>
              </TableHead>
            ) : null}
            <TableHead className="h-auto min-h-0 px-2 !pt-0 pb-2">
              <Select
                value={healthKey}
                onValueChange={(v) =>
                  setFilters({
                    computedHealth:
                      !v || v === '__all__' ? undefined : (v as 'GREEN' | 'ORANGE' | 'RED'),
                  })
                }
              >
                <SelectTrigger size="sm" className="starium-col-filter h-6 w-full text-[10px]">
                  <SelectValue>
                    {healthKey === '__all__'
                      ? 'Toutes'
                      : healthKey === 'GREEN'
                        ? 'Bon'
                        : healthKey === 'ORANGE'
                          ? 'Attention'
                          : 'Critique'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes</SelectItem>
                  <SelectItem value="GREEN">Bon</SelectItem>
                  <SelectItem value="ORANGE">Attention</SelectItem>
                  <SelectItem value="RED">Critique</SelectItem>
                </SelectContent>
              </Select>
            </TableHead>
            <TableHead className="h-auto min-h-0 px-2 !pt-0 pb-2">
              <Select
                value={statusKey}
                onValueChange={(v) => setFilters({ status: !v || v === '__all__' ? undefined : v })}
              >
                <SelectTrigger size="sm" className="starium-col-filter h-6 w-full text-[10px]">
                  <SelectValue>
                    {statusKey === '__all__' ? 'Tous' : PROJECT_STATUS_LABEL[statusKey] ?? statusKey}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous</SelectItem>
                  {Object.entries(PROJECT_STATUS_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableHead>
            <TableHead className="h-auto min-h-0 px-2 !pt-0 pb-2">
              <Select
                value={myRoleKey}
                onValueChange={(v) =>
                  setFilters({ myRole: !v || v === '__all__' ? undefined : v })
                }
              >
                <SelectTrigger size="sm" className="starium-col-filter h-6 w-full text-[10px]">
                  <SelectValue>{myRoleKey === '__all__' ? 'Tous rôles' : myRoleKey}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous rôles</SelectItem>
                  {myRoleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableHead>
            {isExtended ? (
              <TableHead className="h-auto min-h-0 px-2 !pt-0 pb-2">
                <Select
                  value={ownerKey}
                  onValueChange={(v) =>
                    setFilters({ ownerUserId: !v || v === '__all__' ? undefined : v })
                  }
                >
                  <SelectTrigger size="sm" className="starium-col-filter h-6 w-full text-[10px]">
                    <SelectValue>
                      {ownerKey === '__all__'
                        ? 'Tous chefs'
                        : ownerOptions.find((option) => option.id === ownerKey)?.label ?? 'Chef'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tous chefs</SelectItem>
                    {ownerOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableHead>
            ) : null}
            <FilterDash />
            <FilterDash />
            {!isExtended ? (
              <>
                <FilterDash />
                <TableHead className="h-auto min-h-0 px-2 !pt-0 pb-2">
                  <Select
                    value={ownerKey}
                    onValueChange={(v) =>
                      setFilters({ ownerUserId: !v || v === '__all__' ? undefined : v })
                    }
                  >
                    <SelectTrigger size="sm" className="starium-col-filter h-6 w-full text-[10px]">
                      <SelectValue>
                        {ownerKey === '__all__'
                          ? 'Tous'
                          : ownerOptions.find((option) => option.id === ownerKey)?.label ??
                            'Responsable projet'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Tous</SelectItem>
                      {ownerOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableHead>
                <FilterDash />
              </>
            ) : (
              <>
                <FilterDash />
                <FilterDash />
              </>
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                Aucun projet ne correspond à ce périmètre. Élargissez les filtres ou créez un nouveau
                projet.
              </TableCell>
            </TableRow>
          ) : null}
          {items.map((p) => {
            const progress = projectListProgressPercent(p);

            return (
              <TableRow key={p.id} className="group">
                <TableCell className={projectCellClass}>
                  <BasicProjectCell project={p} />
                </TableCell>
                {isExtended ? (
                  <TableCell className="align-middle py-3">
                    <RegistryBadge
                      className={cn('text-xs', projectKindBadgeClass(badgeMerged, p.kind))}
                    >
                      {badgeMerged.projectKind[p.kind as ProjectKindBadgeKey].label}
                    </RegistryBadge>
                  </TableCell>
                ) : null}
                <TableCell className="align-middle py-3">
                  <CellTip
                    tip={buildProjectHealthCellTooltip(
                      p,
                      getProjectHealthTableLabel(p.computedHealth, badgeMerged),
                    )}
                  >
                    <ProjectTableHealthPill health={p.computedHealth} badgeMerged={badgeMerged} />
                  </CellTip>
                </TableCell>
                <TableCell className="align-middle py-3">
                  <ProjectTableStatusPill project={p} badgeMerged={badgeMerged} />
                </TableCell>
                <TableCell className="align-middle py-3 text-sm">
                  <MyRoleCell project={p} />
                </TableCell>
                {isExtended ? (
                  <TableCell className="align-middle py-3 text-sm font-semibold text-foreground">
                    {p.ownerDisplayName ? (
                      <span className="block truncate">{p.ownerDisplayName}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                ) : null}
                <TableCell className="align-middle py-3">
                  {isExtended ? (
                    <CellTip
                      className="flex w-full flex-col items-end"
                      tip={buildProjectProgressCellTooltip(p, isExtended)}
                    >
                      <div className="inline-flex w-full flex-col items-end gap-0.5">
                        <ProjectProgressRow
                          percent={p.progressPercent}
                          health={p.computedHealth}
                          variant="manual"
                        />
                        <ProjectProgressRow
                          percent={p.derivedProgressPercent}
                          health={p.computedHealth}
                          variant="derived"
                        />
                      </div>
                    </CellTip>
                  ) : (
                    <CellTip tip={buildProjectProgressCellTooltip(p, false)}>
                      <ProjectProgressRow
                        percent={progress}
                        health={p.computedHealth}
                        variant="manual"
                      />
                    </CellTip>
                  )}
                </TableCell>
                <TableCell className="align-middle py-3 tabular-nums">
                  <CellTip tip={buildProjectDueDateCellTooltip(p)}>
                    {isExtended ? (
                      <span
                        className={cn(
                          'text-xs text-muted-foreground',
                          p.signals.isLate && 'font-semibold text-destructive',
                        )}
                      >
                        {formatDate(p.targetEndDate)}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 text-xs',
                          p.signals.isLate ? 'font-semibold text-destructive' : 'text-muted-foreground',
                        )}
                      >
                        <Calendar className="size-3.5 shrink-0 opacity-70" aria-hidden />
                        {formatProjectDateLong(p.targetEndDate)}
                      </span>
                    )}
                  </CellTip>
                </TableCell>
                {!isExtended ? (
                  <>
                    <TableCell className="align-middle py-3 text-sm">
                      <CellTip tip={buildProjectBudgetCellTooltip(p)}>
                        <ProjectsListBudgetSummary project={p} className="min-w-[6.5rem]" />
                      </CellTip>
                    </TableCell>
                    <TableCell className="align-middle py-3 text-sm">
                      {p.ownerDisplayName ? (
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground"
                            aria-hidden
                          >
                            {projectOwnerInitials(p.ownerDisplayName)}
                          </span>
                          <span
                            className="truncate font-medium text-foreground"
                            title={p.ownerDisplayName}
                          >
                            {projectOwnerShortLabel(p.ownerDisplayName)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-middle py-3 pr-4 text-center">
                      <div className="flex justify-center">
                        <ProjectsListRowActionsMenu project={p} />
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="align-middle py-3 text-center">
                      <ProjectPilotageCellTooltip
                        project={p}
                        variant="trj"
                        className="justify-center"
                        align="center"
                      >
                        <ProjectTrjBadges project={p} />
                      </ProjectPilotageCellTooltip>
                    </TableCell>
                    <TableCell className="align-middle w-[5.5rem] py-3 text-center pr-4">
                      <ProjectPilotageCellTooltip
                        project={p}
                        variant="signals"
                        className="justify-center"
                        align="center"
                      >
                        <ProjectPortfolioSignalIcon signals={p.signals} />
                      </ProjectPilotageCellTooltip>
                    </TableCell>
                    <TableCell className="align-middle py-3 pr-4">
                      <CellTip tip={buildProjectTagsCellTooltip(p)} wrap>
                        {(p.tags ?? []).length > 0 ? (
                          <div className="flex max-w-[18rem] flex-wrap gap-1">
                            {(p.tags ?? []).map((tag) => (
                              <RegistryBadge
                                key={tag.id}
                                className="text-[0.65rem]"
                                style={projectTagBadgeStyle(tag.color)}
                              >
                                {tag.name}
                              </RegistryBadge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </CellTip>
                    </TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
