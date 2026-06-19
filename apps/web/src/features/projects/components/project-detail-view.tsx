'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { RegistryBadge } from '@/lib/ui/registry-badge';
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
import { LoadingState } from '@/components/feedback/loading-state';
import { useProjectDetailQuery } from '../hooks/use-project-detail-query';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { useProjectRisksQuery } from '../hooks/use-project-risks-query';
import {
  MILESTONE_STATUS_LABEL,
  PROJECT_CRITICALITY_LABEL,
  PROJECT_KIND_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_TYPE_LABEL,
  RISK_STATUS_LABEL,
  RISK_TIER_LABEL,
  WARNING_CODE_LABEL,
} from '../constants/project-enum-labels';
import { ProjectPortfolioBadges } from './project-badges';
import type { MergedUiBadges } from '@/lib/ui/badge-registry';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';
import { riskCriticalityForRisk } from '../lib/risk-criticality';
import { projectPlanning, projectSheet } from '../constants/project-routes';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CalendarRange,
  Flag,
  GanttChart,
  Kanban,
  LayoutDashboard,
  ListTodo,
} from 'lucide-react';
import { ProjectBudgetSection } from './project-budget-section';
import { ProjectGovernanceCyclesPresenceBlock } from '@/features/governance-cycles/components/project-governance-cycles-presence-block';
import { ProjectReviewsTab } from './project-reviews-tab';
import { ProjectSynthesisOverviewCards } from './project-synthesis-overview-cards';
import { ProjectWorkspaceShell } from './project-workspace-shell';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listProjectPortfolioCategories,
  listProjectTags,
  replaceProjectTags,
  updateProject,
} from '../api/projects.api';
import {
  addStrategicObjectiveLink,
  removeStrategicObjectiveLink,
} from '@/features/strategic-vision/api/strategic-vision.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { formatCurrencyAmountFr } from '@/lib/currency-format';
import { usePermissions } from '@/hooks/use-permissions';
import { projectTagBadgeStyle } from '../lib/project-tag-badge-style';
import { useStrategicObjectivesQuery } from '@/features/strategic-vision/hooks/use-strategic-vision-queries';
import { strategicVisionKeys } from '@/features/strategic-vision/lib/strategic-vision-query-keys';
import { useStrategicVisionQuery } from '@/features/strategic-vision/hooks/use-strategic-vision-queries';
import { OwnerOrgUnitSelect } from '@/features/organization/components/owner-org-unit-select';
import type { OwnerOrgUnitSummary } from '@/features/organization/types/owner-org-unit-summary';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

function formatTargetBudgetDisplay(raw: string): string {
  const n = Number(raw);
  return Number.isFinite(n) ? formatCurrencyAmountFr(n, 'EUR') : raw;
}

function formatOwnerOrgSummary(summary: OwnerOrgUnitSummary | undefined): string {
  if (!summary) return '—';
  const code = summary.code ? ` (${summary.code})` : '';
  return `${summary.name}${code}`;
}

function ProjectDetailTabbedContent({
  projectId,
  risks,
  badgeMerged,
  canReadStrategicVision,
  canManageStrategicLinks,
  canUpdateProject,
}: {
  projectId: string;
  risks: ReturnType<typeof useProjectRisksQuery>;
  badgeMerged: MergedUiBadges;
  canReadStrategicVision: boolean;
  canManageStrategicLinks: boolean;
  canUpdateProject: boolean;
}) {
  const { data: project } = useProjectDetailQuery(projectId);
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagToAdd, setTagToAdd] = useState<string>('');
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [editableType, setEditableType] = useState('');
  const [editableStatus, setEditableStatus] = useState('');
  const [editablePortfolioCategoryId, setEditablePortfolioCategoryId] = useState<string>('__none__');
  const [editableStrategicObjectiveId, setEditableStrategicObjectiveId] = useState<string>('__none__');
  const [editableOwnerOrgUnitId, setEditableOwnerOrgUnitId] = useState<string | null>(null);
  const [activeInlineEdit, setActiveInlineEdit] = useState<
    'type' | 'status' | 'portfolioCategory' | 'strategicObjective' | 'ownerOrgUnit' | null
  >(null);
  const searchParams = useSearchParams();
  const showPoints = searchParams.get('tab') === 'points';
  const strategicObjectivesQuery = useStrategicObjectivesQuery({
    enabled: canReadStrategicVision,
  });
  const strategicVisionQuery = useStrategicVisionQuery({
    enabled: canReadStrategicVision,
  });
  useEffect(() => {
    if (!project) return;
    setSelectedTagIds(project.tags.map((tag) => tag.id));
  }, [project]);
  useEffect(() => {
    if (!project) return;
    setEditableType(project.type);
    setEditableStatus(project.status);
    setEditablePortfolioCategoryId(project.portfolioCategory?.id ?? '__none__');
    setEditableOwnerOrgUnitId(project.ownerOrgUnitId ?? null);
  }, [project]);

  useEffect(() => {
    if (searchParams.get('focus') === 'ownership' && canUpdateProject) {
      setActiveInlineEdit('ownerOrgUnit');
    }
  }, [searchParams, canUpdateProject]);

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
  const milestonesQuery = useProjectMilestonesQuery(projectId);

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
      ownerOrgUnitId?: string | null;
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
  const updateStrategicObjectiveLinkMutation = useMutation({
    mutationFn: async (nextObjectiveId: string) => {
      const objectives = strategicObjectivesQuery.data ?? [];
      const projectLinks = objectives.flatMap((objective) =>
        (objective.links ?? [])
          .filter((link) => link.linkType === 'PROJECT' && link.targetId === projectId)
          .map((link) => ({ objectiveId: objective.id, linkId: link.id })),
      );
      const linksToRemove =
        nextObjectiveId === '__none__'
          ? projectLinks
          : projectLinks.filter((link) => link.objectiveId !== nextObjectiveId);
      if (linksToRemove.length > 0) {
        await Promise.all(
          linksToRemove.map((link) =>
            removeStrategicObjectiveLink(authFetch, link.objectiveId, link.linkId),
          ),
        );
      }
      if (nextObjectiveId !== '__none__') {
        const alreadyLinked = projectLinks.some((link) => link.objectiveId === nextObjectiveId);
        if (!alreadyLinked) {
          await addStrategicObjectiveLink(authFetch, nextObjectiveId, {
            linkType: 'PROJECT',
            targetId: projectId,
            targetLabelSnapshot: project?.code
              ? `${project.code} - ${project.name}`
              : project?.name ?? '',
          });
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: strategicVisionKeys.root(clientId),
      });
      setActiveInlineEdit(null);
    },
  });

  const availableTags = (optionsTagsQuery.data ?? []).filter(
    (tag) => !selectedTagIds.includes(tag.id),
  );
  const categoryGroups = (optionsPortfolioCategoriesQuery.data ?? []).map((root) => ({
    rootId: root.id,
    rootName: root.name,
    children: (root.children ?? [])
      .filter((child) => child.isActive || child.id === project?.portfolioCategory?.id)
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
        (project?.portfolioCategory?.parentName
          ? `${project.portfolioCategory.parentName} / ${project.portfolioCategory.name}`
          : project?.portfolioCategory?.name ?? 'Non definie');
  const selectedTypeLabel = PROJECT_TYPE_LABEL[editableType] ?? editableType;
  const selectedStatusLabel = PROJECT_STATUS_LABEL[editableStatus] ?? editableStatus;

  const saveTags = (nextTagIds: string[]) => {
    setSelectedTagIds(nextTagIds);
    replaceTagsMutation.mutate(nextTagIds);
  };

  const planningProgressPct =
    project?.derivedProgressPercent ?? project?.progressPercent ?? null;
  const planningSignalChips: {
    show: boolean;
    label: string;
    className: string;
  }[] = [
    {
      show: project?.signals.hasNoTasks ?? false,
      label: 'Aucune tâche',
      className: 'border-border bg-muted/60 text-muted-foreground',
    },
    {
      show: project?.signals.hasNoMilestones ?? false,
      label: 'Aucun jalon',
      className: 'border-border bg-muted/60 text-muted-foreground',
    },
    {
      show: project?.signals.hasPlanningDrift ?? false,
      label: 'Dérive planning',
      className:
        'border-amber-300/80 bg-amber-50 text-foreground dark:border-amber-400/40 dark:bg-amber-100/90',
    },
  ];
  const visiblePlanningSignals = planningSignalChips.filter((s) => s.show);

  const milestonesSorted = useMemo(() => {
    const items = milestonesQuery.data?.items ?? [];
    return [...items].sort(
      (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
    );
  }, [milestonesQuery.data]);

  const risksSorted = useMemo(() => {
    const list = risks.data ?? [];
    const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return [...list].sort((a, b) => {
      const ca = riskCriticalityForRisk(a);
      const cb = riskCriticalityForRisk(b);
      const oa = order[ca] ?? 99;
      const ob = order[cb] ?? 99;
      if (oa !== ob) return oa - ob;
      return a.title.localeCompare(b.title, 'fr');
    });
  }, [risks.data]);

  const criticalRisksCount = useMemo(
    () => (risks.data ?? []).filter((r) => riskCriticalityForRisk(r) === 'HIGH').length,
    [risks.data],
  );

  const strategicObjectivesForProject = useMemo(() => {
    const objectives = strategicObjectivesQuery.data ?? [];
    return objectives.filter((objective) =>
      (objective.links ?? []).some(
        (link) => link.linkType === 'PROJECT' && link.targetId === projectId,
      ),
    );
  }, [projectId, strategicObjectivesQuery.data]);
  const strategicAxisNameById = useMemo(() => {
    const visions = strategicVisionQuery.data ?? [];
    const map = new Map<string, string>();
    for (const vision of visions) {
      for (const axis of vision.axes ?? []) {
        if (!map.has(axis.id)) map.set(axis.id, axis.name);
      }
    }
    return map;
  }, [strategicVisionQuery.data]);
  const strategicObjectiveOptions = useMemo(() => {
    const objectives = strategicObjectivesQuery.data ?? [];
    return [...objectives].sort((a, b) => {
      const axisA = strategicAxisNameById.get(a.axisId) ?? 'Sans axe';
      const axisB = strategicAxisNameById.get(b.axisId) ?? 'Sans axe';
      const axisCmp = axisA.localeCompare(axisB, 'fr');
      if (axisCmp !== 0) return axisCmp;
      return a.title.localeCompare(b.title, 'fr');
    });
  }, [strategicAxisNameById, strategicObjectivesQuery.data]);
  const strategicObjectiveGroups = useMemo(() => {
    const grouped = new Map<
      string,
      Array<(typeof strategicObjectiveOptions)[number]>
    >();
    for (const objective of strategicObjectiveOptions) {
      const axisName = strategicAxisNameById.get(objective.axisId) ?? 'Sans axe';
      const current = grouped.get(axisName) ?? [];
      current.push(objective);
      grouped.set(axisName, current);
    }
    return Array.from(grouped.entries()).map(([axisName, objectives]) => ({
      axisName,
      objectives,
    }));
  }, [strategicAxisNameById, strategicObjectiveOptions]);
  const selectedStrategicObjectiveLabel =
    editableStrategicObjectiveId === '__none__'
      ? 'Aucun objectif'
      : strategicObjectiveOptions.find((objective) => objective.id === editableStrategicObjectiveId)
          ?.title ?? 'Aucun objectif';
  useEffect(() => {
    setEditableStrategicObjectiveId(strategicObjectivesForProject[0]?.id ?? '__none__');
  }, [strategicObjectivesForProject]);

  if (!project) {
    return <LoadingState rows={6} />;
  }

  return (
    <>
      {showPoints ? (
        <Card size="sm" className="min-w-0 overflow-hidden shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <Suspense fallback={<LoadingState rows={4} />}>
              <ProjectReviewsTab projectId={projectId} projectStatus={project.status} />
            </Suspense>
          </CardContent>
        </Card>
      ) : (
        <div className="flex w-full min-w-0 flex-col gap-6">
          <ProjectSynthesisOverviewCards
            projectId={projectId}
            project={project}
            badgeMerged={badgeMerged}
          />

          <section
            className={cn(
              'min-w-0 rounded-xl border border-border/70 bg-card p-4 shadow-sm',
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
                <div className="min-w-0">
                  <span className="text-muted-foreground">Objectif stratégique : </span>
                  {canReadStrategicVision ? (
                    activeInlineEdit === 'strategicObjective' && canManageStrategicLinks ? (
                      <div className="mt-1 flex items-center gap-1.5">
                        <Select
                          value={editableStrategicObjectiveId}
                          onValueChange={(value) =>
                            setEditableStrategicObjectiveId(value ?? '__none__')
                          }
                        >
                          <SelectTrigger className="h-7 w-[420px] max-w-full text-xs">
                            <SelectValue>{selectedStrategicObjectiveLabel}</SelectValue>
                          </SelectTrigger>
                          <SelectContent className="min-w-[420px]">
                            <SelectItem value="__none__">Aucun objectif</SelectItem>
                            <SelectSeparator />
                            {strategicObjectiveGroups.map((group) => (
                              <SelectGroup key={group.axisName}>
                                <SelectLabel>{group.axisName}</SelectLabel>
                                {group.objectives.map((objective) => (
                                  <SelectItem key={objective.id} value={objective.id}>
                                    {objective.title}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            updateStrategicObjectiveLinkMutation.mutate(
                              editableStrategicObjectiveId,
                            )
                          }
                          disabled={updateStrategicObjectiveLinkMutation.isPending}
                        >
                          OK
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setEditableStrategicObjectiveId(
                              strategicObjectivesForProject[0]?.id ?? '__none__',
                            );
                            setActiveInlineEdit(null);
                          }}
                          disabled={updateStrategicObjectiveLinkMutation.isPending}
                        >
                          Annuler
                        </Button>
                      </div>
                    ) : (
                    strategicObjectivesQuery.isLoading ? (
                      <span className="text-muted-foreground">Chargement...</span>
                    ) : strategicObjectivesForProject.length > 0 ? (
                      <button
                        type="button"
                        className="rounded px-1 py-0.5 text-left hover:bg-muted"
                        onClick={() => {
                          if (canManageStrategicLinks) {
                            setActiveInlineEdit('strategicObjective');
                          }
                        }}
                        disabled={!canManageStrategicLinks}
                      >
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          {strategicObjectivesForProject.slice(0, 2).map((objective) => (
                            <Link
                              key={objective.id}
                              href="/strategic-vision"
                              className="underline decoration-dotted underline-offset-2 hover:text-foreground"
                            >
                              {objective.title}
                            </Link>
                          ))}
                          {strategicObjectivesForProject.length > 2 ? (
                            <span className="text-muted-foreground">
                              +{strategicObjectivesForProject.length - 2}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded px-1 py-0.5 text-left text-muted-foreground hover:bg-muted"
                        onClick={() => {
                          if (canManageStrategicLinks) {
                            setActiveInlineEdit('strategicObjective');
                          }
                        }}
                        disabled={!canManageStrategicLinks}
                      >
                        —
                      </button>
                    )
                    )
                  ) : (
                    '—'
                  )}
                </div>
                <div className="sm:col-span-2 border-t pt-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">Direction propriétaire :</span>
                    {activeInlineEdit === 'ownerOrgUnit' ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <OwnerOrgUnitSelect
                          value={editableOwnerOrgUnitId}
                          onChange={(v) => setEditableOwnerOrgUnitId(v)}
                          triggerClassName="h-7 w-[min(100%,300px)] text-xs"
                          placeholder="Aucune unité"
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            updateProjectMetaMutation.mutate(
                              { ownerOrgUnitId: editableOwnerOrgUnitId },
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
                            setEditableOwnerOrgUnitId(project.ownerOrgUnitId ?? null);
                            setActiveInlineEdit(null);
                          }}
                        >
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="rounded px-1 py-0.5 text-left hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                        onClick={() => {
                          if (canUpdateProject) setActiveInlineEdit('ownerOrgUnit');
                        }}
                        disabled={!canUpdateProject}
                      >
                        {formatOwnerOrgSummary(project.ownerOrgUnitSummary)}
                      </button>
                    )}
                  </div>
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
                            <RegistryBadge style={projectTagBadgeStyle(tag.color)}>
                              {tag.name} ×
                            </RegistryBadge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {project.pilotNotes && (
                  <div className="sm:col-span-2 mt-1 border-t border-border/60 pt-3">
                    <div
                      className={cn(
                        'rounded-r-md border-l-[3px] border-sky-500/60 py-3 pl-4 pr-2',
                        'bg-sky-500/[0.09] dark:bg-sky-400/[0.12]',
                      )}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-600/90 dark:text-sky-800/95">
                        Notes pilotage
                      </p>
                      <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-7 text-foreground/95">
                        {project.pilotNotes}
                      </p>
                    </div>
                  </div>
                )}
                {project.targetBudgetAmount && (
                  <div className="sm:col-span-2 border-t pt-3">
                    <span className="text-muted-foreground">Budget cible : </span>
                    <span className="font-medium tabular-nums text-foreground">
                      {formatTargetBudgetDisplay(project.targetBudgetAmount)}
                    </span>
                  </div>
                )}
            </div>
          </section>

        <div id="project-budget" className="scroll-mt-24">
          <ProjectBudgetSection projectId={projectId} />
        </div>

        <ProjectGovernanceCyclesPresenceBlock projectId={projectId} />

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
          <CardContent className="space-y-4 px-4 py-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="min-w-0 rounded-md border border-border/80 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Début</p>
                <p className="truncate font-medium tabular-nums text-foreground">
                  {formatDate(project.startDate)}
                </p>
              </div>
              <div className="min-w-0 rounded-md border border-border/80 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Fin cible</p>
                <p className="truncate font-medium tabular-nums text-foreground">
                  {formatDate(project.targetEndDate)}
                </p>
              </div>
              <div className="min-w-0 rounded-md border border-border/80 bg-muted/30 px-3 py-2 sm:col-span-1">
                <p className="text-xs font-medium text-muted-foreground">Avancement</p>
                {planningProgressPct != null ? (
                  <div className="mt-1.5 space-y-1.5">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{
                          width: `${Math.min(100, Math.max(0, planningProgressPct))}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs font-semibold tabular-nums text-foreground">
                      {Math.round(planningProgressPct)}&nbsp;%
                    </p>
                  </div>
                ) : (
                  <p className="mt-0.5 font-medium text-muted-foreground">—</p>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Jalons
                </p>
                <Link
                  href={projectPlanning(projectId, 'milestones')}
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Voir tout
                </Link>
              </div>
              {milestonesQuery.isLoading ? (
                <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-3">
                  <LoadingState rows={2} />
                </div>
              ) : milestonesSorted.length === 0 ? (
                <p className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                  Aucun jalon. Ajoutez-en depuis l’onglet Planning → Jalons.
                </p>
              ) : (
                <ul
                  className="max-h-48 divide-y divide-border/60 overflow-y-auto rounded-md border border-border/80 bg-muted/20"
                  aria-label="Liste des jalons et dates cibles"
                >
                  {milestonesSorted.map((m) => {
                    const statusLabel =
                      MILESTONE_STATUS_LABEL[m.status] ?? m.status;
                    return (
                      <li
                        key={m.id}
                        className="flex flex-col gap-0.5 px-3 py-2 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
                      >
                        <span className="min-w-0 truncate font-medium text-foreground" title={m.name}>
                          {m.name}
                        </span>
                        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs tabular-nums text-muted-foreground sm:text-sm">
                          <span title="Date cible">
                            Cible :{' '}
                            <span className="font-medium text-foreground">
                              {formatDate(m.targetDate)}
                            </span>
                          </span>
                          {m.achievedDate ? (
                            <span title="Date de réalisation">
                              Réalisé :{' '}
                              <span className="font-medium text-foreground">
                                {formatDate(m.achievedDate)}
                              </span>
                            </span>
                          ) : null}
                          <span
                            className="rounded border border-border/80 bg-background/80 px-1.5 py-0.5 text-[0.65rem] font-medium text-foreground"
                            title="Statut"
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {visiblePlanningSignals.length > 0 && (
              <div className="flex flex-wrap gap-1.5" role="status" aria-label="Signaux planning">
                {visiblePlanningSignals.map((s) => (
                  <span
                    key={s.label}
                    className={cn(
                      'inline-flex min-h-[1.375rem] items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-none',
                      s.className,
                    )}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Accès rapide
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { sub: 'tasks' as const, label: 'Tâches', Icon: ListTodo },
                    { sub: 'milestones' as const, label: 'Jalons', Icon: Flag },
                    { sub: 'gantt' as const, label: 'Gantt', Icon: GanttChart },
                    { sub: 'kanban' as const, label: 'Kanban', Icon: Kanban },
                  ] as const
                ).map(({ sub, label, Icon }) => (
                  <Link
                    key={sub}
                    href={projectPlanning(projectId, sub)}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'h-8 gap-1.5 border-border/80 text-xs font-medium',
                    )}
                  >
                    <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <p className="border-t border-border/60 pt-3 text-muted-foreground">
              Création et édition des tâches et jalons, vue temporelle et pilotage visuel dans
              l’onglet <span className="font-medium text-foreground">Planning</span>.
            </p>
          </CardContent>
        </Card>

        <Card size="sm" className="overflow-hidden shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <CardTitle className="text-sm font-medium">Risques</CardTitle>
            <Link
              href={`${projectSheet(projectId)}#risques-projet`}
              className={cn(
                buttonVariants({ variant: 'default', size: 'sm' }),
                'gap-2',
              )}
            >
              <AlertTriangle className="size-4" aria-hidden />
              Gérer les risques
            </Link>
          </CardHeader>
          <CardContent className="space-y-4 px-4 py-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 rounded-md border border-border/80 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Risques ouverts</p>
                <p className="text-lg font-semibold tabular-nums leading-none text-foreground">
                  {project.openRisksCount}
                </p>
              </div>
              <div className="min-w-0 rounded-md border border-border/80 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Critiques (P×I)</p>
                <p
                  className={cn(
                    'text-lg font-semibold tabular-nums leading-none',
                    criticalRisksCount > 0
                      ? 'text-amber-950 dark:text-amber-500'
                      : 'text-foreground',
                  )}
                >
                  {risks.isLoading ? '—' : criticalRisksCount}
                </p>
              </div>
            </div>

            {project.signals.hasNoRisks ? (
              <div
                className="flex flex-wrap gap-1.5"
                role="status"
                aria-label="Signal portefeuille risques"
              >
                <span
                  className={cn(
                    'inline-flex min-h-[1.375rem] items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-none',
                    'border-amber-300/80 bg-amber-50 text-foreground dark:border-amber-400/40 dark:bg-amber-100/90',
                  )}
                >
                  Sans étude de risque enregistrée
                </span>
              </div>
            ) : null}

            <div>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Détail
                </p>
                <Link
                  href={`${projectSheet(projectId)}#risques-projet`}
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Voir tout
                </Link>
              </div>
              {risks.isLoading ? (
                <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-3">
                  <LoadingState rows={2} />
                </div>
              ) : risks.isError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
                  Impossible de charger les risques. Réessayez ou ouvrez la fiche projet.
                </p>
              ) : risksSorted.length === 0 ? (
                <p className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                  Aucun risque enregistré. Ajoutez des risques métier (probabilité × impact, plan
                  d’action) dans la{' '}
                  <Link
                    href={`${projectSheet(projectId)}#risques-projet`}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    fiche projet — section Risques
                  </Link>
                  .
                </p>
              ) : (
                <ul
                  className="max-h-48 divide-y divide-border/60 overflow-y-auto rounded-md border border-border/80 bg-muted/20"
                  aria-label="Liste des risques"
                >
                  {risksSorted.map((r) => {
                    const crit = riskCriticalityForRisk(r);
                    const critLabel = PROJECT_CRITICALITY_LABEL[crit] ?? crit;
                    const pLabel = RISK_TIER_LABEL[r.probability] ?? r.probability;
                    const iLabel = RISK_TIER_LABEL[r.impact] ?? r.impact;
                    const statusLabel = RISK_STATUS_LABEL[r.status] ?? r.status;
                    return (
                      <li
                        key={r.id}
                        className="flex flex-col gap-1.5 px-3 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground" title={r.title}>
                            {r.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            <span
                              className="rounded border border-border/80 bg-background/80 px-1.5 py-0.5 text-[0.65rem] font-medium text-foreground"
                              title="Statut"
                            >
                              {statusLabel}
                            </span>
                            <span title="Criticité calculée (P×I)">
                              Crit. :{' '}
                              <span className="font-medium text-foreground">{critLabel}</span>
                            </span>
                            <span title="Probabilité / impact">
                              P / I :{' '}
                              <span className="font-medium text-foreground">
                                {pLabel} / {iLabel}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-xs tabular-nums text-muted-foreground sm:text-right">
                          {r.reviewDate ? (
                            <span title="Prochaine revue">
                              Revue :{' '}
                              <span className="font-medium text-foreground">
                                {formatDate(r.reviewDate)}
                              </span>
                            </span>
                          ) : (
                            <span className="italic">Revue non planifiée</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <p className="border-t border-border/60 pt-3 text-muted-foreground">
              Les risques métier sont saisis et suivis dans la{' '}
              <span className="font-medium text-foreground">fiche projet</span> (grille
              probabilité × impact, statut, échéances de revue).
            </p>
          </CardContent>
        </Card>

        </div>
      )}
    </>
  );
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const risks = useProjectRisksQuery(projectId);
  const { merged: badgeMerged } = useClientUiBadgeConfig();
  const { has } = usePermissions();
  const canUpdateProject = has('projects.update');
  const canReadStrategicVision = has('strategic_vision.read');
  const canManageStrategicLinks = has('strategic_vision.manage_links');

  return (
    <ProjectWorkspaceShell projectId={projectId}>
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <LoadingState rows={2} />
            <Card size="sm" className="overflow-hidden shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <LoadingState rows={6} />
              </CardContent>
            </Card>
          </div>
        }
      >
        <ProjectDetailTabbedContent
          projectId={projectId}
          risks={risks}
          badgeMerged={badgeMerged}
          canReadStrategicVision={canReadStrategicVision}
          canManageStrategicLinks={canManageStrategicLinks}
          canUpdateProject={canUpdateProject}
        />
      </Suspense>
    </ProjectWorkspaceShell>
  );
}
