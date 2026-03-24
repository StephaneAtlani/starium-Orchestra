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
import type { ProjectListItem } from '../types/project.types';
import { Badge } from '@/components/ui/badge';
import {
  PROJECT_KIND_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_CRITICALITY_LABEL,
} from '../constants/project-enum-labels';
import { HealthBadge, ProjectPortfolioBadges } from './project-badges';
import { cn } from '@/lib/utils';
import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listProjectPortfolioCategories } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

const th = 'text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground';
const SORT_LABEL: Record<ProjectsListFilters['sortBy'], string> = {
  name: 'Nom',
  targetEndDate: 'Échéance',
  status: 'Statut',
  priority: 'Priorité',
  criticality: 'Criticité',
  computedHealth: 'Santé',
  progressPercent: 'Avancement',
};

function tagBadgeStyle(color: string | null | undefined) {
  const background = color ?? '#64748B';
  return {
    backgroundColor: background,
    borderColor: background,
    color: '#FFFFFF',
  } as const;
}

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
}: {
  tip: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className={cn('inline-flex max-w-full cursor-help', className)} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-xs text-left leading-snug">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

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
  const categoryGroups = (categoriesQuery.data ?? []).map((root) => ({
    rootId: root.id,
    rootName: root.name,
    children: (root.children ?? []).map((child) => ({
      id: child.id,
      label: child.name,
      fullLabel: `${root.name} / ${child.name}`,
    })),
  }));
  const categoryOptions = categoryGroups.flatMap((group) =>
    group.children.map((child) => ({ id: child.id, label: child.fullLabel })),
  );
  const categoryKey = filters.portfolioCategoryId ?? '__all__';
  const kindKey = filters.kind ?? '__all__';
  const statusKey = filters.status ?? '__all__';
  return (
    <TooltipProvider delay={250}>
      <Table className="min-w-[56rem] text-sm">
      <TableHeader className="bg-muted/50 [&_tr]:border-b-0">
        <TableRow className="border-0 hover:bg-transparent">
          <TableHead
            className={cn(
              th,
              'sticky left-0 z-30 min-w-[11rem] bg-muted/50 pl-4 shadow-[1px_0_0_0_hsl(var(--border))]',
            )}
          >
            <HeaderTip tip="Categorie portefeuille rattachee au projet (racine / sous-categorie).">
              Categorie
            </HeaderTip>
          </TableHead>
          <TableHead
            className={cn(
              th,
              'sticky left-[11rem] z-30 min-w-[12rem] bg-muted/50 pl-4 shadow-[1px_0_0_0_hsl(var(--border))]',
            )}
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
          <TableHead className={cn(th, 'w-[5.5rem]')}>
            <HeaderTip tip="Projet structuré (livrables, jalons) ou activité de suivi plus léger.">
              Nature
            </HeaderTip>
          </TableHead>
          <TableHead className={cn(th, 'w-[6.5rem]')}>
            <HeaderTip tip="Indicateur de santé calculé (retards, risques, jalons, blocages…).">
              <SortHeaderButton
                label="Santé"
                sortKey="computedHealth"
                filters={filters}
                setFilters={setFilters}
              />
            </HeaderTip>
          </TableHead>
          <TableHead className={cn(th, 'min-w-[7rem]')}>
            <HeaderTip tip="Statut métier du projet dans son cycle de vie (ex. brouillon, en cours, terminé).">
              <SortHeaderButton
                label="Statut"
                sortKey="status"
                filters={filters}
                setFilters={setFilters}
              />
            </HeaderTip>
          </TableHead>
          <TableHead className={cn(th, 'w-[7.5rem] text-right')}>
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
          <TableHead className={cn(th, 'w-[6.5rem]')}>
            <HeaderTip tip="Date cible de fin du projet ou de l’activité.">
              <SortHeaderButton
                label="Échéance"
                sortKey="targetEndDate"
                filters={filters}
                setFilters={setFilters}
              />
            </HeaderTip>
          </TableHead>
          <TableHead className={cn(th, 'w-[5rem] text-center')}>
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
          <TableHead className={cn(th, 'min-w-[10rem] pr-4')}>
            <HeaderTip tip="Pastilles de pilotage : retard, bloqué, critique, absence de risque enregistré, etc.">
              Signaux
            </HeaderTip>
          </TableHead>
          <TableHead className={cn(th, 'min-w-[10rem] pr-4')}>
            <HeaderTip tip="Etiquettes associees au projet.">
              Etiquettes
            </HeaderTip>
          </TableHead>
        </TableRow>
        <TableRow className="border-t border-border/50 bg-muted/35 hover:bg-muted/35">
          <TableHead className="sticky left-0 z-30 bg-muted/35 p-2 pl-3 shadow-[1px_0_0_0_hsl(var(--border))]">
            <Select
              value={categoryKey}
              onValueChange={(v) =>
                setFilters({ portfolioCategoryId: v === '__all__' ? undefined : v })
              }
            >
              <SelectTrigger size="sm" className="h-7 w-full text-xs">
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
          <TableHead className="sticky left-[11rem] z-30 bg-muted/35 p-2 shadow-[1px_0_0_0_hsl(var(--border))]">
            <Input
              value={filters.search ?? ''}
              onChange={(e) => setFilters({ search: e.target.value || undefined })}
              placeholder="Rechercher..."
              className="h-7 text-xs"
            />
          </TableHead>
          <TableHead className="p-2">
            <Select value={kindKey} onValueChange={(v) => setFilters({ kind: v === '__all__' ? undefined : v })}>
              <SelectTrigger size="sm" className="h-7 w-full text-xs">
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
          <TableHead className="p-2" />
          <TableHead className="p-2">
            <Select
              value={statusKey}
              onValueChange={(v) => setFilters({ status: v === '__all__' ? undefined : v })}
            >
              <SelectTrigger size="sm" className="h-7 w-full text-xs">
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
          <TableHead className="p-2" />
          <TableHead className="p-2" />
          <TableHead className="p-2" />
          <TableHead className="p-2" />
          <TableHead className="p-2" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((p) => (
          <TableRow key={p.id} className="group">
            <TableCell className="sticky left-0 z-20 align-top bg-background py-3 pl-4 shadow-[1px_0_0_0_hsl(var(--border))]">
              {p.portfolioCategory ? (
                <CellTip
                  tip={
                    p.portfolioCategory.parentName
                      ? `${p.portfolioCategory.parentName} / ${p.portfolioCategory.name}`
                      : p.portfolioCategory.name
                  }
                >
                  <span className="text-xs text-foreground">
                    {p.portfolioCategory.parentName ? (
                      <>
                        <span className="text-muted-foreground">{p.portfolioCategory.parentName}</span>
                        <span className="mx-1 text-border">/</span>
                      </>
                    ) : null}
                    <span>{p.portfolioCategory.name}</span>
                  </span>
                </CellTip>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="sticky left-[11rem] z-20 align-top bg-background py-3 pl-4 shadow-[1px_0_0_0_hsl(var(--border))]">
              <Link
                href={`/projects/${p.id}`}
                className="font-medium text-primary hover:underline"
              >
                {p.name}
              </Link>
              {p.code && (
                <div className="mt-0.5 font-mono text-xs text-muted-foreground">{p.code}</div>
              )}
              <div className="mt-1.5 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[0.65rem] text-muted-foreground">
                <span>{PROJECT_CRITICALITY_LABEL[p.criticality] ?? p.criticality}</span>
                {p.ownerDisplayName ? (
                  <>
                    <span aria-hidden className="text-border">
                      ·
                    </span>
                    <span className="truncate">{p.ownerDisplayName}</span>
                  </>
                ) : null}
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
                <Badge variant="secondary" className="font-normal text-xs">
                  {PROJECT_KIND_LABEL[p.kind] ?? p.kind}
                </Badge>
              </CellTip>
            </TableCell>
            <TableCell className="align-top py-3">
              <HealthBadge health={p.computedHealth} compact />
            </TableCell>
            <TableCell className="align-top py-3 text-sm">
              {PROJECT_STATUS_LABEL[p.status] ?? p.status}
            </TableCell>
            <TableCell className="align-top py-3 text-right">
              <CellTip
                className="flex-col items-end justify-end"
                tip="Ligne du haut : avancement saisi à la main. Ligne du bas : calculé à partir des tâches."
              >
                <div className="inline-flex flex-col items-end gap-0.5 tabular-nums">
                  <span>
                    {p.progressPercent != null ? `${p.progressPercent} %` : '—'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.derivedProgressPercent != null ? `${p.derivedProgressPercent} %` : '—'}
                  </span>
                </div>
              </CellTip>
            </TableCell>
            <TableCell className="align-top py-3 tabular-nums text-sm">
              {formatDate(p.targetEndDate)}
            </TableCell>
            <TableCell className="align-top py-3 text-center text-xs tabular-nums text-muted-foreground">
              <CellTip
                className="justify-center"
                tip={`Tâches ouvertes : ${p.openTasksCount} · Risques ouverts : ${p.openRisksCount} · Jalons en retard : ${p.delayedMilestonesCount}`}
              >
                <span>
                  <span className="text-foreground">{p.openTasksCount}</span>
                  <span className="mx-0.5 text-border">/</span>
                  <span className="text-foreground">{p.openRisksCount}</span>
                  <span className="mx-0.5 text-border">/</span>
                  <span
                    className={cn(
                      p.delayedMilestonesCount > 0 && 'font-medium text-amber-800 dark:text-amber-300',
                    )}
                  >
                    {p.delayedMilestonesCount}
                  </span>
                </span>
              </CellTip>
            </TableCell>
            <TableCell className="align-top py-3 pr-4">
              <div className="max-w-[18rem]">
                <ProjectPortfolioBadges signals={p.signals} />
              </div>
            </TableCell>
            <TableCell className="align-top py-3 pr-4">
              {(p.tags ?? []).length > 0 ? (
                <div className="flex max-w-[18rem] flex-wrap gap-1">
                  {(p.tags ?? []).map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="text-[0.65rem]"
                      style={tagBadgeStyle(tag.color)}
                    >
                      {tag.name}
                    </Badge>
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
