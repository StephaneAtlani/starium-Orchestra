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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProjectListItem } from '../types/project.types';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import {
  PROJECT_KIND_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_CRITICALITY_LABEL,
} from '../constants/project-enum-labels';
import { HealthBadge, ProjectPortfolioBadges } from './project-badges';
import { cn } from '@/lib/utils';
import {
  projectKindBadgeClass,
  type MergedUiBadges,
  type ProjectKindBadgeKey,
  type ProjectLifecycleStatusKey,
} from '@/lib/ui/badge-registry';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';
import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectPortfolioCategories, listAssignableUsers } from '../api/projects.api';
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
  projectPortfolioCategoryLabel,
} from '../lib/projects-list-display';
import { ProjectsListRowActionsMenu } from './projects-list-row-actions-menu';
import { ProjectsListBudgetSummary } from './projects-list-budget-summary';

const EXTENDED_COLUMN_COUNT = 12;
const BASIC_COLUMN_COUNT = 7;

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

function HeaderTip({
  children,
  tip,
  triggerClassName,
  contentAlign = 'start',
}: {
  children: ReactNode;
  tip: string;
  triggerClassName?: string;
  contentAlign?: 'start' | 'center' | 'end';
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              'inline-flex max-w-full cursor-help flex-col border-b border-dotted border-muted-foreground/45',
              triggerClassName,
            )}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align={contentAlign}
        className="max-w-xs text-left leading-snug"
      >
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
}: {
  tip: string;
  children: ReactNode;
  className?: string;
  wrap?: boolean;
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
      <TooltipContent side="top" align="start" className="max-w-xs text-left leading-snug">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

function FilterDash() {
  return (
    <TableHead className="h-auto min-h-0 px-2 pb-2 pt-0 text-center text-muted-foreground">
      —
    </TableHead>
  );
}

function BasicProjectCell({ project }: { project: ProjectListItem }) {
  const CategoryIcon = projectPortfolioCategoryIcon(project);
  const categoryLabel = projectPortfolioCategoryLabel(project);

  return (
    <div className="flex items-start gap-3">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground"
        aria-hidden
      >
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

function ExtendedProjectCell({ project }: { project: ProjectListItem }) {
  return (
    <>
      <Link href={`/projects/${project.id}`} className="starium-proj-name">
        {project.name}
      </Link>
      {project.code ? <div className="starium-proj-code">{project.code}</div> : null}
      <div className="starium-proj-priority">
        {PROJECT_CRITICALITY_LABEL[project.criticality] ?? project.criticality}
      </div>
    </>
  );
}

function StatusCell({
  project,
  badgeMerged,
}: {
  project: ProjectListItem;
  badgeMerged: MergedUiBadges;
}) {
  const lifecycle =
    badgeMerged.projectLifecycleStatus[project.status as ProjectLifecycleStatusKey];
  return lifecycle ? (
    <RegistryBadge className={cn('text-sm', lifecycle.className)}>
      {lifecycle.label}
    </RegistryBadge>
  ) : (
    <span>{PROJECT_STATUS_LABEL[project.status] ?? project.status}</span>
  );
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
  const categoriesQuery = useQuery({
    queryKey: projectQueryKeys.optionsPortfolioCategories(clientId),
    queryFn: () => listProjectPortfolioCategories(authFetch),
    enabled: Boolean(clientId),
  });
  const assignableUsersQuery = useQuery({
    queryKey: projectQueryKeys.assignableUsers(clientId),
    queryFn: () => listAssignableUsers(authFetch),
    enabled: Boolean(clientId),
  });
  const categoryGroups = (categoriesQuery.data ?? []).map((root) => ({
    rootId: root.id,
    rootName: root.name,
    children: (root.children ?? []).map((child) => ({
      id: child.id,
      label: child.name,
      fullLabel: `${root.name} / ${child.name}`,
    })),
  }));
  const { merged: badgeMerged } = useClientUiBadgeConfig();
  const categoryOptions = categoryGroups.flatMap((group) =>
    group.children.map((child) => ({ id: child.id, label: child.fullLabel })),
  );
  const ownerOptions = (assignableUsersQuery.data?.users ?? [])
    .map((user) => {
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
      return { id: user.id, label: name || user.email };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'fr-FR'));
  const categoryKey = filters.portfolioCategoryId ?? '__all__';
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

  const projectHeadClass = isExtended
    ? 'sticky left-[11rem] z-[52] min-w-[12rem] bg-muted pl-4 starium-table-sticky-edge'
    : 'sticky left-0 z-[52] min-w-[14rem] bg-muted pl-4 starium-table-sticky-edge';
  const projectCellClass = isExtended
    ? 'sticky left-[11rem] z-20 align-top bg-card py-3 pl-4 starium-table-sticky-edge'
    : 'sticky left-0 z-20 align-top bg-card py-3 pl-4 starium-table-sticky-edge min-w-[14rem] max-w-[18rem]';

  return (
    <TooltipProvider delay={250}>
      <Table
        noWrapper
        className={cn(
          'starium-projects-table text-[12.5px]',
          isExtended ? 'min-w-[64rem]' : 'min-w-[48rem]',
        )}
      >
        <TableHeader className="sticky top-0 z-50 [&_tr]:border-b-0">
          <TableRow className="border-0 hover:bg-transparent">
            {isExtended ? (
              <TableHead className="sticky left-0 z-[52] min-w-[11rem] bg-muted pl-4 starium-table-sticky-edge">
                <HeaderTip tip="Catégorie portefeuille rattachée au projet (racine / sous-catégorie).">
                  Catégorie
                </HeaderTip>
              </TableHead>
            ) : null}
            <TableHead className={projectHeadClass}>
              <HeaderTip tip="Nom du projet et catégorie portefeuille. Cliquez sur le nom pour ouvrir la fiche.">
                <SortHeaderButton
                  label="Projet"
                  sortKey="name"
                  filters={filters}
                  setFilters={setFilters}
                />
              </HeaderTip>
            </TableHead>
            {isExtended ? (
              <>
                <TableHead className="w-[5.5rem]">
                  <HeaderTip tip="Projet structuré (livrables, jalons) ou activité de suivi plus léger.">
                    Nature
                  </HeaderTip>
                </TableHead>
                <TableHead className="w-[6.5rem]">
                  <HeaderTip tip="Indicateur de santé calculé (retards, risques, jalons, blocages…).">
                    <SortHeaderButton
                      label="Santé"
                      sortKey="computedHealth"
                      filters={filters}
                      setFilters={setFilters}
                    />
                  </HeaderTip>
                </TableHead>
              </>
            ) : null}
            <TableHead className="min-w-[7rem]">
              <HeaderTip tip="Statut métier du projet dans son cycle de vie.">
                <SortHeaderButton
                  label="Statut"
                  sortKey="status"
                  filters={filters}
                  setFilters={setFilters}
                />
              </HeaderTip>
            </TableHead>
            {isExtended ? (
              <>
                <TableHead className="min-w-[9rem]">
                  <HeaderTip tip="Rôle de l'utilisateur connecté sur ce projet.">
                    Mon rôle
                  </HeaderTip>
                </TableHead>
                <TableHead className="min-w-[10rem]">
                  <HeaderTip tip="Responsable du projet (chef de projet).">
                    <SortHeaderButton
                      label="Chef de projets"
                      sortKey="owner"
                      filters={filters}
                      setFilters={setFilters}
                    />
                  </HeaderTip>
                </TableHead>
              </>
            ) : null}
            <TableHead className={cn('text-right', isExtended ? 'w-[7.5rem]' : 'min-w-[8rem]')}>
              <div className="flex w-full justify-end">
                <HeaderTip
                  tip={
                    isExtended
                      ? 'Premier pourcentage : avancement saisi manuellement. Second : avancement dérivé des tâches.'
                      : 'Pourcentage d’avancement du projet.'
                  }
                  triggerClassName="items-end text-right"
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
              <HeaderTip tip="Date cible de fin du projet ou de l’activité.">
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
                  <HeaderTip tip="Budget cible (fiche projet) et montant consommé sur les lignes budgétaires liées (montants fixes).">
                    Budget
                  </HeaderTip>
                </TableHead>
                <TableHead className="min-w-[8rem]">
                  <HeaderTip tip="Chef de projet ou responsable désigné.">
                    <SortHeaderButton
                      label="Responsable projet"
                      sortKey="owner"
                      filters={filters}
                      setFilters={setFilters}
                    />
                  </HeaderTip>
                </TableHead>
                <TableHead className="w-[3rem] pr-4 text-center">
                  <HeaderTip tip="Actions rapides sur le projet." contentAlign="center">
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
                      tip="Tâches ouvertes / risques ouverts / jalons en retard."
                      triggerClassName="items-center"
                      contentAlign="center"
                    >
                      T · R · J
                    </HeaderTip>
                  </div>
                </TableHead>
                <TableHead className="min-w-[10rem] pr-4">
                  <HeaderTip tip="Pastilles de pilotage : retard, bloqué, critique, etc.">
                    Signaux
                  </HeaderTip>
                </TableHead>
                <TableHead className="min-w-[10rem] pr-4">
                  <HeaderTip tip="Étiquettes associées au projet.">Étiquettes</HeaderTip>
                </TableHead>
              </>
            )}
          </TableRow>

          <TableRow className="border-t border-border bg-neutral-50 pt-0 hover:bg-neutral-50">
            {isExtended ? (
              <TableHead className="sticky left-0 z-[52] h-auto min-h-0 bg-neutral-50 px-2 pb-2 pt-0 pl-3 starium-table-sticky-edge">
                <Select
                  value={categoryKey}
                  onValueChange={(v) =>
                    setFilters({ portfolioCategoryId: !v || v === '__all__' ? undefined : v })
                  }
                >
                  <SelectTrigger size="sm" className="starium-col-filter h-7 w-full">
                    <SelectValue>
                      {categoryKey === '__all__'
                        ? 'Toutes catégories'
                        : categoryOptions.find((option) => option.id === categoryKey)?.label ??
                          'Catégorie'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Toutes catégories</SelectItem>
                    <SelectSeparator />
                    {categoryGroups.map((group) => (
                      <SelectGroup key={group.rootId}>
                        <SelectLabel>{group.rootName}</SelectLabel>
                        {group.children.length === 0 ? (
                          <SelectItem value={`__empty__${group.rootId}`} disabled>
                            Aucune sous-catégorie
                          </SelectItem>
                        ) : (
                          group.children.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </TableHead>
            ) : null}
            <TableHead
              className={cn(
                'h-auto min-h-0 bg-neutral-50 px-2 pb-2 pt-0 starium-table-sticky-edge',
                isExtended ? 'sticky left-[11rem] z-[52]' : 'sticky left-0 z-[52]',
              )}
            >
              <Input
                value={filters.search ?? ''}
                onChange={(e) => setFilters({ search: e.target.value || undefined })}
                placeholder="Rechercher…"
                className="starium-col-filter h-7"
              />
            </TableHead>
            {isExtended ? (
              <>
                <TableHead className="h-auto min-h-0 px-2 pb-2 pt-0">
                  <Select
                    value={kindKey}
                    onValueChange={(v) =>
                      setFilters({ kind: !v || v === '__all__' ? undefined : v })
                    }
                  >
                    <SelectTrigger size="sm" className="starium-col-filter h-7 w-full">
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
                <TableHead className="h-auto min-h-0 px-2 pb-2 pt-0">
                  <Select
                    value={healthKey}
                    onValueChange={(v) =>
                      setFilters({
                        computedHealth:
                          !v || v === '__all__' ? undefined : (v as 'GREEN' | 'ORANGE' | 'RED'),
                      })
                    }
                  >
                    <SelectTrigger size="sm" className="starium-col-filter h-7 w-full">
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
              </>
            ) : null}
            <TableHead className="h-auto min-h-0 px-2 pb-2 pt-0">
              <Select
                value={statusKey}
                onValueChange={(v) => setFilters({ status: !v || v === '__all__' ? undefined : v })}
              >
                <SelectTrigger size="sm" className="starium-col-filter h-7 w-full">
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
            {isExtended ? (
              <>
                <TableHead className="h-auto min-h-0 px-2 pb-2 pt-0">
                  <Select
                    value={myRoleKey}
                    onValueChange={(v) =>
                      setFilters({ myRole: !v || v === '__all__' ? undefined : v })
                    }
                  >
                    <SelectTrigger size="sm" className="starium-col-filter h-7 w-full">
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
                <TableHead className="h-auto min-h-0 px-2 pb-2 pt-0">
                  <Select
                    value={ownerKey}
                    onValueChange={(v) =>
                      setFilters({ ownerUserId: !v || v === '__all__' ? undefined : v })
                    }
                  >
                    <SelectTrigger size="sm" className="starium-col-filter h-7 w-full">
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
              </>
            ) : null}
            <FilterDash />
            <FilterDash />
            {!isExtended ? (
              <>
                <FilterDash />
                <TableHead className="h-auto min-h-0 px-2 pb-2 pt-0">
                  <Select
                    value={ownerKey}
                    onValueChange={(v) =>
                      setFilters({ ownerUserId: !v || v === '__all__' ? undefined : v })
                    }
                  >
                    <SelectTrigger size="sm" className="starium-col-filter h-7 w-full">
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
                <TableHead className="h-auto min-h-0 px-2 pb-2 pt-0">
                  <ProjectTagsFilter
                    compact
                    value={filters.tagIds ?? []}
                    matchMode={filters.tagIdsMatch ?? 'any'}
                    onMatchModeChange={(tagIdsMatch) => setFilters({ tagIdsMatch })}
                    onChange={(tagIds) =>
                      setFilters({ tagIds: tagIds.length > 0 ? tagIds : undefined })
                    }
                  />
                </TableHead>
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
                {isExtended ? (
                  <TableCell className="sticky left-0 z-20 min-w-[11rem] max-w-[15rem] whitespace-normal break-words bg-card py-3 pl-4 align-top starium-table-sticky-edge">
                    {p.portfolioCategory ? (
                      <CellTip
                        wrap
                        tip={
                          p.portfolioCategory.parentName
                            ? `${p.portfolioCategory.parentName} / ${p.portfolioCategory.name}`
                            : p.portfolioCategory.name
                        }
                      >
                        <div>
                          {p.portfolioCategory.parentName ? (
                            <>
                              <div className="starium-cell-category-group">
                                {p.portfolioCategory.parentName}
                              </div>
                              <div className="starium-cell-category-sub">
                                {p.portfolioCategory.name}
                              </div>
                            </>
                          ) : (
                            <div className="starium-cell-category-group">
                              {p.portfolioCategory.name}
                            </div>
                          )}
                        </div>
                      </CellTip>
                    ) : (
                      <span className="text-sm text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                ) : null}
                <TableCell className={projectCellClass}>
                  {isExtended ? (
                    <ExtendedProjectCell project={p} />
                  ) : (
                    <BasicProjectCell project={p} />
                  )}
                </TableCell>
                {isExtended ? (
                  <>
                    <TableCell className="align-top py-3">
                      <CellTip
                        tip={
                          p.kind === 'ACTIVITY'
                            ? 'Activité de suivi : périmètre réduit, même outillage que les projets.'
                            : 'Projet structuré : livrables, jalons et risques suivis dans la fiche.'
                        }
                      >
                        <RegistryBadge
                          className={cn('text-xs', projectKindBadgeClass(badgeMerged, p.kind))}
                        >
                          {badgeMerged.projectKind[p.kind as ProjectKindBadgeKey].label}
                        </RegistryBadge>
                      </CellTip>
                    </TableCell>
                    <TableCell className="align-top py-3">
                      <HealthBadge health={p.computedHealth} compact merged={badgeMerged} />
                    </TableCell>
                  </>
                ) : null}
                <TableCell className="align-top py-3 text-sm">
                  <StatusCell project={p} badgeMerged={badgeMerged} />
                </TableCell>
                {isExtended ? (
                  <>
                    <TableCell className="align-top py-3 text-sm">
                      {(p.myRoles ?? (p.myRole ? [p.myRole] : [])).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(p.myRoles ?? (p.myRole ? [p.myRole] : [])).map((role) => (
                            <RegistryBadge
                              key={role}
                              className="border border-border/80 bg-muted/40 text-xs text-foreground"
                            >
                              {role}
                            </RegistryBadge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top py-3 text-sm font-semibold text-foreground">
                      {p.ownerDisplayName ? (
                        <CellTip wrap tip={p.ownerDisplayName}>
                          <span className="block truncate">{p.ownerDisplayName}</span>
                        </CellTip>
                      ) : (
                        <span className="text-sm text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                  </>
                ) : null}
                <TableCell className="align-top py-3">
                  {isExtended ? (
                    <CellTip
                      className="flex flex-col items-end"
                      tip="Ligne du haut : avancement saisi à la main. Ligne du bas : calculé à partir des tâches."
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
                    <ProjectProgressRow
                      percent={progress}
                      health={p.computedHealth}
                      variant="manual"
                    />
                  )}
                </TableCell>
                <TableCell className="align-top py-3 tabular-nums">
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
                </TableCell>
                {!isExtended ? (
                  <>
                    <TableCell className="align-top py-3 text-sm">
                      <ProjectsListBudgetSummary project={p} className="min-w-[6.5rem]" />
                    </TableCell>
                    <TableCell className="align-top py-3 text-sm">
                      {p.ownerDisplayName ? (
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground"
                            aria-hidden
                          >
                            {projectOwnerInitials(p.ownerDisplayName)}
                          </span>
                          <span className="truncate font-medium text-foreground">
                            {projectOwnerShortLabel(p.ownerDisplayName)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top py-3 pr-4 text-center">
                      <div className="flex justify-center">
                        <ProjectsListRowActionsMenu project={p} />
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="align-top py-3 text-center text-xs tabular-nums">
                      <CellTip
                        className="justify-center"
                        tip={`Tâches ouvertes : ${p.openTasksCount} · Risques ouverts : ${p.openRisksCount} · Jalons en retard : ${p.delayedMilestonesCount}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <span className="text-muted-foreground">{p.openTasksCount}</span>
                          <span className="text-[9px] text-muted-foreground/70">·</span>
                          <span
                            className={cn(
                              p.openRisksCount > 0 && 'font-semibold text-destructive',
                              p.openRisksCount === 0 && 'text-muted-foreground',
                            )}
                          >
                            {p.openRisksCount}
                          </span>
                          <span className="text-[9px] text-muted-foreground/70">·</span>
                          <span
                            className={cn(
                              p.delayedMilestonesCount > 0
                                ? 'font-semibold text-[color:var(--state-warning)]'
                                : 'text-muted-foreground/60',
                            )}
                          >
                            {p.delayedMilestonesCount}
                          </span>
                        </span>
                      </CellTip>
                    </TableCell>
                    <TableCell className="align-top py-3 pr-4">
                      <ProjectPortfolioBadges signals={p.signals} merged={badgeMerged} stacked />
                    </TableCell>
                    <TableCell className="align-top py-3 pr-4">
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
