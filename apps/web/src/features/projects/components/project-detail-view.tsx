'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState } from '@/components/feedback/loading-state';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { useProjectRisksQuery } from '../hooks/use-project-risks-query';
import {
  PROJECT_KIND_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
  RISK_STATUS_LABEL,
  WARNING_CODE_LABEL,
} from '../constants/project-enum-labels';
import { HealthBadge, ProjectPortfolioBadges } from './project-badges';
import { riskCriticalityForRisk } from '../lib/risk-criticality';
import { projectsList, projectPlanning } from '../constants/project-routes';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, CalendarRange, ChevronLeft, LayoutDashboard } from 'lucide-react';
import { ProjectBudgetSection } from './project-budget-section';
import { ProjectReviewsTab } from './project-reviews-tab';
import { ProjectWorkspaceTabs } from './project-workspace-tabs';
import type { ProjectDetail } from '../types/project.types';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listProjectPortfolioCategories,
  listProjectTags,
  replaceProjectTags,
  updateProject,
} from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';

function tagBadgeStyle(color: string | null | undefined) {
  const background = color ?? '#64748B';
  return {
    backgroundColor: background,
    borderColor: background,
    color: '#FFFFFF',
  } as const;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

function ProjectDetailTabbedContent({
  projectId,
  project,
  risks,
}: {
  projectId: string;
  project: ProjectDetail;
  risks: ReturnType<typeof useProjectRisksQuery>;
}) {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagToAdd, setTagToAdd] = useState<string>('');
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [editableType, setEditableType] = useState(project.type);
  const [editableStatus, setEditableStatus] = useState(project.status);
  const [editablePortfolioCategoryId, setEditablePortfolioCategoryId] = useState<string>(
    project.portfolioCategory?.id ?? '__none__',
  );
  const [activeInlineEdit, setActiveInlineEdit] = useState<
    'type' | 'status' | 'portfolioCategory' | null
  >(null);
  useEffect(() => {
    setSelectedTagIds(project.tags.map((tag) => tag.id));
  }, [project.tags]);
  useEffect(() => {
    setEditableType(project.type);
    setEditableStatus(project.status);
    setEditablePortfolioCategoryId(project.portfolioCategory?.id ?? '__none__');
  }, [project.type, project.status, project.portfolioCategory?.id]);

  const optionsTagsQuery = useQuery({
    queryKey: projectQueryKeys.optionsTags(clientId),
    queryFn: () => listProjectTags(authFetch),
    enabled: Boolean(clientId),
  });
  const optionsPortfolioCategoriesQuery = useQuery({
    queryKey: projectQueryKeys.optionsPortfolioCategories(clientId),
    queryFn: () => listProjectPortfolioCategories(authFetch),
    enabled: Boolean(clientId),
  });

  const replaceTagsMutation = useMutation({
    mutationFn: (tagIds: string[]) => replaceProjectTags(authFetch, projectId, tagIds),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: projectQueryKeys.detail(clientId, projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: projectQueryKeys.list(clientId, {}),
        }),
        queryClient.invalidateQueries({
          queryKey: projectQueryKeys.projectTags(clientId, projectId),
        }),
      ]);
    },
  });
  const updateProjectMetaMutation = useMutation({
    mutationFn: (payload: {
      type?: string;
      status?: string;
      portfolioCategoryId?: string | null;
    }) => updateProject(authFetch, projectId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: projectQueryKeys.detail(clientId, projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: projectQueryKeys.list(clientId, {}),
        }),
      ]);
    },
  });

  const availableTags = (optionsTagsQuery.data ?? []).filter(
    (tag) => !selectedTagIds.includes(tag.id),
  );
  const categoryGroups = (optionsPortfolioCategoriesQuery.data ?? []).map((root) => ({
    rootId: root.id,
    rootName: root.name,
    children: (root.children ?? [])
      .filter((child) => child.isActive || child.id === project.portfolioCategory?.id)
      .map((child) => ({
        id: child.id,
        label: child.name,
        fullLabel: `${root.name} / ${child.name}`,
      })),
  }));
  const categoryOptions = categoryGroups.flatMap((group) =>
    group.children.map((child) => ({ id: child.id, label: child.fullLabel })),
  );
  const selectedCategoryLabel =
    editablePortfolioCategoryId === '__none__'
      ? 'Non definie'
      : categoryOptions.find((option) => option.id === editablePortfolioCategoryId)?.label ??
        (project.portfolioCategory?.parentName
          ? `${project.portfolioCategory.parentName} / ${project.portfolioCategory.name}`
          : project.portfolioCategory?.name ?? 'Non definie');
  const selectedTypeLabel = PROJECT_TYPE_LABEL[editableType] ?? editableType;
  const selectedStatusLabel = PROJECT_STATUS_LABEL[editableStatus] ?? editableStatus;

  const saveTags = (nextTagIds: string[]) => {
    setSelectedTagIds(nextTagIds);
    replaceTagsMutation.mutate(nextTagIds);
  };

  const searchParams = useSearchParams();
  const showPoints = searchParams.get('tab') === 'points';

  return (
    <Card size="sm" className="min-w-0 overflow-hidden py-0 shadow-sm">
      <CardHeader className="space-y-0 border-b border-border/60 bg-gradient-to-b from-muted/50 to-muted/20 px-3 py-3.5 sm:px-5">
        <ProjectWorkspaceTabs projectId={projectId} />
      </CardHeader>
      <CardContent
        className={
          showPoints
            ? 'p-4 sm:p-6'
            : 'flex w-full min-w-0 flex-col gap-6 p-4 sm:p-6'
        }
      >
        {showPoints ? (
          <ProjectReviewsTab projectId={projectId} />
        ) : (
          <>
        <div className="grid gap-4 lg:grid-cols-3">
          <section
            className={cn(
              'min-w-0 rounded-xl border border-border/70 bg-card p-4 shadow-sm lg:col-span-2',
              'border-l-[3px] border-l-sky-500/70',
            )}
            aria-labelledby="project-detail-info-heading"
          >
            <div className="mb-3 flex items-center gap-2.5">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-sky-500/10 text-sky-800 shadow-inner dark:text-sky-300"
                aria-hidden
              >
                <LayoutDashboard className="size-4" />
              </div>
              <h2
                id="project-detail-info-heading"
                className="text-sm font-semibold tracking-tight text-foreground"
              >
                Informations
              </h2>
            </div>
            <div className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                <div className="min-w-0">
                  <span className="text-muted-foreground">Nature : </span>
                  {PROJECT_KIND_LABEL[project.kind as keyof typeof PROJECT_KIND_LABEL] ??
                    project.kind}
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Type : </span>
                  {activeInlineEdit === 'type' ? (
                    <div className="mt-1 flex items-center gap-1.5">
                      <Select value={editableType} onValueChange={(value) => setEditableType(value ?? '')}>
                        <SelectTrigger className="h-7 w-[180px] text-xs">
                          <SelectValue>{selectedTypeLabel}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PROJECT_TYPE_LABEL).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          updateProjectMetaMutation.mutate(
                            { type: editableType },
                            { onSuccess: () => setActiveInlineEdit(null) },
                          );
                        }}
                        disabled={updateProjectMetaMutation.isPending}
                      >
                        OK
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setEditableType(project.type);
                          setActiveInlineEdit(null);
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="rounded px-1 py-0.5 text-left hover:bg-muted"
                      onClick={() => setActiveInlineEdit('type')}
                    >
                      {PROJECT_TYPE_LABEL[project.type] ?? project.type}
                    </button>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Statut : </span>
                  {activeInlineEdit === 'status' ? (
                    <div className="mt-1 flex items-center gap-1.5">
                      <Select value={editableStatus} onValueChange={(value) => setEditableStatus(value ?? '')}>
                        <SelectTrigger className="h-7 w-[180px] text-xs">
                          <SelectValue>{selectedStatusLabel}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PROJECT_STATUS_LABEL).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          updateProjectMetaMutation.mutate(
                            { status: editableStatus },
                            { onSuccess: () => setActiveInlineEdit(null) },
                          );
                        }}
                        disabled={updateProjectMetaMutation.isPending}
                      >
                        OK
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setEditableStatus(project.status);
                          setActiveInlineEdit(null);
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="rounded px-1 py-0.5 text-left hover:bg-muted"
                      onClick={() => setActiveInlineEdit('status')}
                    >
                      {PROJECT_STATUS_LABEL[project.status] ?? project.status}
                    </button>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Avancement manuel / dérivé : </span>
                  {project.progressPercent != null ? `${project.progressPercent} %` : '—'}
                  {' / '}
                  {project.derivedProgressPercent != null
                    ? `${project.derivedProgressPercent} %`
                    : '—'}
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Échéance cible : </span>
                  {formatDate(project.targetEndDate)}
                </div>
                <div className="min-w-0">
                  <span className="text-muted-foreground">Responsable projet / activité : </span>
                  {project.ownerDisplayName ?? '—'}
                </div>
                <div className="sm:col-span-2 border-t pt-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-muted-foreground">Categorie portefeuille :</span>
                    {activeInlineEdit === 'portfolioCategory' ? (
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={editablePortfolioCategoryId}
                          onValueChange={(value) => setEditablePortfolioCategoryId(value ?? '')}
                        >
                          <SelectTrigger className="h-7 w-[260px] text-xs">
                            <SelectValue>{selectedCategoryLabel}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Non definie</SelectItem>
                            <SelectSeparator />
                            {categoryGroups.map((group) => (
                              <SelectGroup key={group.rootId}>
                                <SelectLabel>{group.rootName}</SelectLabel>
                                {group.children.length === 0 ? (
                                  <SelectItem value={`__empty__${group.rootId}`} disabled>
                                    Aucune sous-categorie active
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
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            updateProjectMetaMutation.mutate(
                              {
                                portfolioCategoryId:
                                  editablePortfolioCategoryId === '__none__'
                                    ? null
                                    : editablePortfolioCategoryId,
                              },
                              { onSuccess: () => setActiveInlineEdit(null) },
                            );
                          }}
                          disabled={updateProjectMetaMutation.isPending}
                        >
                          OK
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setEditablePortfolioCategoryId(project.portfolioCategory?.id ?? '__none__');
                            setActiveInlineEdit(null);
                          }}
                        >
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="rounded px-1 py-0.5 text-left hover:bg-muted"
                        onClick={() => setActiveInlineEdit('portfolioCategory')}
                      >
                        {project.portfolioCategory?.parentName
                          ? `${project.portfolioCategory.parentName} / ${project.portfolioCategory.name}`
                          : project.portfolioCategory?.name ?? 'Non definie'}
                      </button>
                    )}
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-muted-foreground">Etiquettes :</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setShowTagPicker((prev) => !prev)}
                      title="Ajouter une etiquette"
                    >
                      +
                    </Button>
                    {showTagPicker ? (
                      <Select
                        value={tagToAdd}
                        onValueChange={(value) => {
                          if (!value) return;
                          setTagToAdd('');
                          if (selectedTagIds.includes(value)) return;
                          saveTags([...selectedTagIds, value]);
                          setShowTagPicker(false);
                        }}
                      >
                        <SelectTrigger className="h-8 w-[220px]">
                          <SelectValue placeholder="Ajouter une etiquette" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTags.length === 0 ? (
                            <SelectItem value="__none__" disabled>
                              Aucune etiquette disponible
                            </SelectItem>
                          ) : (
                            availableTags.map((tag) => (
                              <SelectItem key={tag.id} value={tag.id}>
                                {tag.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    ) : project.tags.length === 0 ? (
                      <span className="text-sm text-muted-foreground">Ajouter une etiquette</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {project.tags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() =>
                              saveTags(selectedTagIds.filter((id) => id !== tag.id))
                            }
                            title="Retirer cette etiquette"
                          >
                            <Badge variant="secondary" style={tagBadgeStyle(tag.color)}>
                              {tag.name} ×
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {project.pilotNotes && (
                  <p className="sm:col-span-2 mt-1 whitespace-pre-wrap border-t pt-3 text-muted-foreground">
                    <span className="font-medium text-foreground">Notes pilotage : </span>
                    {project.pilotNotes}
                  </p>
                )}
                {project.targetBudgetAmount && (
                  <div className="sm:col-span-2 border-t pt-3">
                    <span className="text-muted-foreground">Budget cible : </span>
                    {project.targetBudgetAmount}
                  </div>
                )}
            </div>
          </section>

          <section
            className="min-w-0 rounded-lg border border-border bg-transparent px-3 py-2.5 lg:col-span-1"
            aria-labelledby="project-detail-kpi-heading"
          >
            <h2
              id="project-detail-kpi-heading"
              className="mb-2 border-b border-border/70 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Compteurs
            </h2>
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-2 sm:justify-end lg:flex-col lg:items-stretch lg:gap-3">
                <span
                  className="inline-flex items-baseline gap-1.5 tabular-nums"
                  title="Tâches ouvertes"
                >
                  <span className="text-lg font-semibold leading-none">
                    {project.openTasksCount}
                  </span>
                  <span className="text-xs text-muted-foreground">Tâches</span>
                </span>
                <span
                  className="inline-flex items-baseline gap-1.5 tabular-nums"
                  title="Risques ouverts"
                >
                  <span className="text-lg font-semibold leading-none">
                    {project.openRisksCount}
                  </span>
                  <span className="text-xs text-muted-foreground">Risques</span>
                </span>
                <span
                  className="inline-flex items-baseline gap-1.5 tabular-nums"
                  title="Jalons en retard"
                >
                  <span className="text-lg font-semibold leading-none">
                    {project.delayedMilestonesCount}
                  </span>
                  <span className="text-xs text-muted-foreground">Jalons ret.</span>
                </span>
              </div>
          </section>
        </div>

        <ProjectBudgetSection projectId={projectId} />

        <Card size="sm" className="overflow-hidden shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-medium">Planning</CardTitle>
            <Link
              href={projectPlanning(projectId)}
              className={cn(
                buttonVariants({ variant: 'default', size: 'sm' }),
                'gap-2',
              )}
            >
              <CalendarRange className="size-4" aria-hidden />
              Ouvrir le planning
            </Link>
          </CardHeader>
          <CardContent className="px-4 py-4 text-sm text-muted-foreground">
            <p>
              Tâches, jalons et Gantt sont gérés dans l’onglet{' '}
              <span className="font-medium text-foreground">Planning</span> (création, édition,
              vue temporelle).
            </p>
          </CardContent>
        </Card>

        <Card size="sm" className="overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-medium">Risques</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {risks.isLoading ? (
              <div className="p-4">
                <LoadingState rows={2} />
              </div>
            ) : !risks.data?.length ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun risque.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Criticité (calc.)</TableHead>
                    <TableHead>P / I</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {risks.data.map((r) => {
                    const crit = riskCriticalityForRisk(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{r.title}</TableCell>
                        <TableCell>{RISK_STATUS_LABEL[r.status] ?? r.status}</TableCell>
                        <TableCell>{crit}</TableCell>
                        <TableCell className="text-xs">
                          {r.probability} / {r.impact}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const { data: project, isLoading, error } = useProjectDetailQuery(projectId);
  const risks = useProjectRisksQuery(projectId);

  if (!projectId) {
    return (
      <p className="text-sm text-destructive">Identifiant de projet manquant.</p>
    );
  }

  if (isLoading) {
    return <LoadingState rows={6} />;
  }

  if (error || !project) {
    return (
      <Alert variant="destructive" className="border-destructive/40">
        <AlertCircle aria-hidden />
        <AlertTitle>Projet introuvable</AlertTitle>
        <AlertDescription>
          Vous n’avez pas accès à ce projet ou il n’existe plus.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <header className="flex flex-col gap-5">
        <div className="space-y-3">
          <Link
            href={projectsList()}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              '-ml-2 w-fit gap-1 text-muted-foreground hover:text-foreground',
            )}
          >
            <ChevronLeft className="size-4" />
            Portefeuille projets
          </Link>
          <PageHeader
            title={project.name}
            description={project.code ? `Code : ${project.code}` : undefined}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <HealthBadge health={project.computedHealth} />
              </div>
            }
          />
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Signaux portefeuille</p>
          <div className="flex flex-wrap gap-2">
            <ProjectPortfolioBadges signals={project.signals} />
          </div>
        </div>

        {project.warnings.length > 0 && (
          <Alert
            className="border-amber-500/35 bg-amber-500/5 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-600"
            role="status"
          >
            <AlertTriangle className="text-amber-800 dark:text-amber-600" aria-hidden />
            <AlertTitle className="font-semibold text-amber-950 dark:text-amber-600">
              Alertes projet
            </AlertTitle>
            <AlertDescription className="text-amber-950/95 dark:text-amber-600/95">
              {project.warnings.map((w) => WARNING_CODE_LABEL[w] ?? w).join(' · ')}
            </AlertDescription>
          </Alert>
        )}
      </header>

      <Suspense
        fallback={
          <Card size="sm" className="min-w-0 overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/60 bg-gradient-to-b from-muted/50 to-muted/20 px-3 py-3.5 sm:px-5">
              <LoadingState rows={1} />
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <LoadingState rows={6} />
            </CardContent>
          </Card>
        }
      >
        <ProjectDetailTabbedContent
          projectId={projectId}
          project={project}
          risks={risks}
        />
      </Suspense>
    </>
  );
}
