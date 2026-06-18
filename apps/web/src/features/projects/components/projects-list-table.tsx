'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
import type { ComputedHealth, ProjectListItem } from '../types/project.types';
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

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

function progressFillTone(
  percent: number | null,
  health: ComputedHealth,
  variant: 'manual' | 'derived',
): 'ok' | 'warn' | 'danger' | 'muted' {
  if (percent == null) return 'muted';
  if (variant === 'derived') return percent >= 100 ? 'ok' : 'muted';
  if (percent >= 100) return 'ok';
  if (health === 'RED') return 'danger';
  if (health === 'ORANGE') return 'warn';
  return 'ok';
}

function ProjectProgressRow({
  percent,
  health,
  variant,
}: {
  percent: number | null;
  health: ComputedHealth;
  variant: 'manual' | 'derived';
}) {
  if (percent == null) {
    return <span className="text-sm text-muted-foreground/50">—</span>;
  }
  const tone = progressFillTone(percent, health, variant);
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="flex items-center gap-1.5">
      <div className="starium-progress-track">
        <div
          className={cn('starium-progress-fill', `starium-progress-fill--${tone}`)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span
        className={cn(
          'text-[11.5px] font-semibold tabular-nums',
          variant === 'derived' && 'font-normal text-muted-foreground',
          variant === 'manual' && tone === 'ok' && 'text-[color:var(--state-success)]',
          variant === 'manual' && tone === 'warn' && 'text-[color:var(--state-warning)]',
          variant === 'manual' && tone === 'danger' && 'text-destructive',
        )}
      >
        {percent} %
      </span>
    </div>
  );
}

const PROJECT_LIST_COLUMN_COUNT = 12;
const SORT_LABEL: Record<ProjectsListFilters['sortBy'], string> = {
  name: 'Nom',
  targetEndDate: 'Échéance',
  status: 'Statut',
  priority: 'Priorité',
  criticality: 'Criticité',
  computedHealth: 'Santé',
  progressPercent: 'Avancement',
  owner: 'Chef de projets',
};

function HeaderTip({
  children,
  tip,
  triggerClassName,
  contentAlign = 'start',
}: {
  children: ReactNode;
  tip: string;
  /** Alignement du soulignement (ex. droite pour « Avancement »). */
  triggerClassName?: string;
  /** Alignement du popup sous l’en-tête. */
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

/** Infobulle sur une cellule (ligne de données). */
function CellTip({
  tip,
  children,
  className,
  /** Texte long : retours à la ligne dans la cellule (évite une seule ligne très large). */
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

/**
 * Liste projets portefeuille — table dense (colonnes sticky, filtres en-tête).
 * RFC-FE-MOB-003 Lot 1 : exception documentée — scroll horizontal conservé sur mobile,
 * pas de FilterBar ni cartes DataTable (cf. RFC-FE-MOB-002 §4.5).
 */
export function ProjectsListTable({
  items,
  filters,
  setFilters,
}: {
  items: ProjectListItem[];
  filters: ProjectsListFilters;
  setFilters: (updates: Partial<ProjectsListFilters>) => void;
}) {
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
  ).sort((a, b) => a.localeCompare(b));
  return (
    <TooltipProvider delay={250}>
      <Table noWrapper className="starium-projects-table min-w-[64rem] text-[12.5px]">
      <TableHeader className="sticky top-0 z-50 [&_tr]:border-b-0">
        <TableRow className="border-0 hover:bg-transparent">
          <TableHead
            className="sticky left-0 z-[52] min-w-[11rem] bg-muted pl-4 starium-table-sticky-edge"
          >
            <HeaderTip tip="Categorie portefeuille rattachee au projet (racine / sous-categorie).">
              Categorie
            </HeaderTip>
          </TableHead>
          <TableHead
            className="sticky left-[11rem] z-[52] min-w-[12rem] bg-muted pl-4 starium-table-sticky-edge"
          >
            <HeaderTip tip="Nom du projet, code interne, criticité et responsable. Cliquez sur le nom pour ouvrir la fiche.">
              <SortHeaderButton
                label="Projet"
                sortKey="name"
                filters={filters}
                setFilters={setFilters}
              />
            </HeaderTip>
          </TableHead>
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
          <TableHead className="min-w-[7rem]">
            <HeaderTip tip="Statut métier du projet dans son cycle de vie (ex. brouillon, en cours, terminé).">
              <SortHeaderButton
                label="Statut"
                sortKey="status"
                filters={filters}
                setFilters={setFilters}
              />
            </HeaderTip>
          </TableHead>
          <TableHead className="min-w-[9rem]">
            <HeaderTip tip="Rôle de l'utilisateur connecté sur ce projet.">
              Mon rôle
            </HeaderTip>
          </TableHead>
          <TableHead className="min-w-[10rem]">
            <HeaderTip tip="Responsable du projet (chef de projet) — utilisateur client ou identité nom libre.">
              <SortHeaderButton
                label="Chef de projets"
                sortKey="owner"
                filters={filters}
                setFilters={setFilters}
              />
            </HeaderTip>
          </TableHead>
          <TableHead className="w-[7.5rem] text-right">
            <div className="flex w-full justify-end">
              <HeaderTip
                tip="Premier pourcentage : avancement saisi manuellement. Second : avancement dérivé des tâches."
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
                <span className="block font-normal normal-case tracking-normal text-[0.6rem] text-muted-foreground/90">
                  manuel / dérivé
                </span>
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
            <HeaderTip tip="Pastilles de pilotage : retard, bloqué, critique, absence de risque enregistré, etc.">
              Signaux
            </HeaderTip>
          </TableHead>
          <TableHead className="min-w-[10rem] pr-4">
            <HeaderTip tip="Etiquettes associees au projet.">
              Etiquettes
            </HeaderTip>
          </TableHead>
        </TableRow>
        <TableRow className="border-t border-border bg-neutral-50 pt-0 hover:bg-neutral-50">
          {/* CATEGORIE */}
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
                    : categoryOptions.find((option) => option.id === categoryKey)?.label ?? 'Catégorie'}
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
          {/* PROJET */}
          <TableHead className="sticky left-[11rem] z-[52] h-auto min-h-0 bg-neutral-50 px-2 pb-2 pt-0 starium-table-sticky-edge">
            <Input
              value={filters.search ?? ''}
              onChange={(e) => setFilters({ search: e.target.value || undefined })}
              placeholder="Rechercher…"
              className="starium-col-filter h-7"
            />
          </TableHead>
          {/* NATURE */}
          <TableHead className="h-auto min-h-0 px-2 pb-2 pt-0">
            <Select
              value={kindKey}
              onValueChange={(v) => setFilters({ kind: !v || v === '__all__' ? undefined : v })}
            >
              <SelectTrigger size="sm" className="starium-col-filter h-7 w-full">
                <SelectValue>
                  {kindKey === '__all__' ? 'Toutes' : PROJECT_KIND_LABEL[kindKey] ?? kindKey}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes</SelectItem>
                <SelectItem value="PROJECT">{PROJECT_KIND_LABEL.PROJECT}</SelectItem>
                <SelectItem value="ACTIVITY">{PROJECT_KIND_LABEL.ACTIVITY}</SelectItem>
              </SelectContent>
            </Select>
          </TableHead>
          {/* SANTE */}
          <TableHead className="h-auto min-h-0 px-2 pb-2 pt-0">
            <Select
              value={healthKey}
              onValueChange={(v) =>
                setFilters({
                  computedHealth: !v || v === '__all__' ? undefined : (v as 'GREEN' | 'ORANGE' | 'RED'),
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
          {/* STATUT */}
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
          {/* MON ROLE */}
          <TableHead className="h-auto min-h-0 px-2 pb-2 pt-0">
            <Select
              value={myRoleKey}
              onValueChange={(v) => setFilters({ myRole: !v || v === '__all__' ? undefined : v })}
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
          {/* CHEF DE PROJETS */}
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
          {/* AVANCEMENT / ECHEANCE / T·R·J / SIGNAUX / ETIQUETTES */}
          <TableHead className="h-auto min-h-0 px-2 pb-2 pt-0 text-center text-muted-foreground">
            —
          </TableHead>
          <TableHead className="h-auto min-h-0 px-2 pb-2 pt-0 text-center text-muted-foreground">
            —
          </TableHead>
          <TableHead className="h-auto min-h-0 px-2 pb-2 pt-0 text-center text-muted-foreground">
            —
          </TableHead>
          <TableHead className="h-auto min-h-0 px-2 pb-2 pt-0 text-center text-muted-foreground">
            —
          </TableHead>
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
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={PROJECT_LIST_COLUMN_COUNT}
              className="py-10 text-center text-sm text-muted-foreground"
            >
              Aucun projet ne correspond à ce périmètre. Élargissez les filtres ou créez un nouveau
              projet.
            </TableCell>
          </TableRow>
        ) : null}
        {items.map((p) => (
          <TableRow key={p.id} className="group">
            <TableCell className="sticky left-0 z-20 align-top bg-card py-3 pl-4 starium-table-sticky-edge whitespace-normal break-words min-w-[11rem] max-w-[15rem]">
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
                        <div className="starium-cell-category-sub">{p.portfolioCategory.name}</div>
                      </>
                    ) : (
                      <div className="starium-cell-category-group">{p.portfolioCategory.name}</div>
                    )}
                  </div>
                </CellTip>
              ) : (
                <span className="text-sm text-muted-foreground/50">—</span>
              )}
            </TableCell>
            <TableCell className="sticky left-[11rem] z-20 align-top bg-card py-3 pl-4 starium-table-sticky-edge">
              <Link href={`/projects/${p.id}`} className="starium-proj-name">
                {p.name}
              </Link>
              {p.code && <div className="starium-proj-code">{p.code}</div>}
              <div className="starium-proj-priority">
                {PROJECT_CRITICALITY_LABEL[p.criticality] ?? p.criticality}
              </div>
            </TableCell>
            <TableCell className="align-top py-3">
              <CellTip
                tip={
                  p.kind === 'ACTIVITY'
                    ? 'Activité de suivi : périmètre réduit, même outillage que les projets.'
                    : 'Projet structuré : livrables, jalons et risques suivis dans la fiche.'
                }
              >
                <RegistryBadge
                  className={cn(
                    'text-xs',
                    projectKindBadgeClass(badgeMerged, p.kind),
                  )}
                >
                  {
                    badgeMerged.projectKind[p.kind as ProjectKindBadgeKey]
                      .label
                  }
                </RegistryBadge>
              </CellTip>
            </TableCell>
            <TableCell className="align-top py-3">
              <HealthBadge health={p.computedHealth} compact merged={badgeMerged} />
            </TableCell>
            <TableCell className="align-top py-3 text-sm">
              {(() => {
                const ls =
                  badgeMerged.projectLifecycleStatus[
                    p.status as ProjectLifecycleStatusKey
                  ];
                return ls ? (
                  <RegistryBadge className={cn('text-sm', ls.className)}>
                    {ls.label}
                  </RegistryBadge>
                ) : (
                  <span>{PROJECT_STATUS_LABEL[p.status] ?? p.status}</span>
                );
              })()}
            </TableCell>
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
            <TableCell className="align-top py-3">
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
            </TableCell>
            <TableCell className="align-top py-3 tabular-nums">
              <span
                className={cn(
                  'text-xs text-muted-foreground',
                  p.signals.isLate && 'font-semibold text-destructive',
                )}
              >
                {formatDate(p.targetEndDate)}
              </span>
            </TableCell>
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </TooltipProvider>
  );
}
