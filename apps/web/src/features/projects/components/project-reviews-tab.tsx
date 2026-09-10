'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectReviewsQuery } from '../hooks/use-project-reviews-query';
import { useProjectReviewsSummaryQuery } from '../hooks/use-project-reviews-summary-query';
import { useProjectReviewSeriesQuery } from '../hooks/use-project-review-series';
import type { ProjectReviewType } from '../types/project.types';
import {
  findDraftPostMortemReview,
  hasFinalizedPostMortemReview,
  isPostMortemEligibleProjectStatus,
  REVIEW_TYPES_PILOTAGE,
} from '../lib/project-review-post-mortem';
import { projectReviewConduct } from '../constants/project-routes';
import { ProjectReviewCreateDialog } from './project-review-create-dialog';
import { ProjectReviewsContextBanner } from './project-reviews-context-banner';
import { ProjectReviewsKpiRow } from './project-reviews-kpi-row';
import { ProjectReviewsStateTabs } from './project-reviews-state-tabs';
import { ProjectReviewsTable } from './project-reviews-table';
import { ProjectReviewCreateSplitButton } from './project-review-create-split-button';
import { ProjectReviewSeriesPanel } from './project-review-series-panel';
import {
  parsePointsStateParam,
  resolveReviewUiState,
  type ProjectReviewsTabState,
  type ProjectReviewUiState,
} from '../lib/project-review-ui-state';
import type { ProjectReviewCreateMenuType } from '../lib/project-review-create-defaults';
import { Plus } from 'lucide-react';

export function ProjectReviewsTab({
  projectId,
  projectStatus,
}: {
  projectId: string;
  projectStatus: string;
}) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const postMortemEligible = isPostMortemEligibleProjectStatus(projectStatus);
  const createTypeOptions: ProjectReviewType[] = postMortemEligible
    ? ['POST_MORTEM']
    : [...REVIEW_TYPES_PILOTAGE];

  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefillType, setCreatePrefillType] =
    useState<ProjectReviewCreateMenuType | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  const list = useProjectReviewsQuery(projectId);
  const summary = useProjectReviewsSummaryQuery(projectId, {
    enabled: !postMortemEligible,
  });
  const series = useProjectReviewSeriesQuery(projectId, {
    enabled: !postMortemEligible,
  });

  const draftPostMortem = useMemo(
    () => findDraftPostMortemReview(list.data),
    [list.data],
  );
  const finalizedPostMortem = useMemo(
    () => hasFinalizedPostMortemReview(list.data),
    [list.data],
  );

  const openedPostMortemFromQueryRef = useRef(false);
  const openedOpenReviewRef = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const activeTab = parsePointsStateParam(searchParams.get('pointsState'));

  const setPointsState = useCallback(
    (next: ProjectReviewsTabState, flash?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'points');
      params.set('pointsState', next);
      if (flash) params.set('pointsFlash', flash);
      else params.delete('pointsFlash');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openEditor = useCallback(
    (id: string) => {
      router.push(projectReviewConduct(projectId, id));
    },
    [projectId, router],
  );

  /** Flash création 1,6 s */
  useEffect(() => {
    const id = searchParams.get('pointsFlash');
    if (!id?.trim()) return;
    setFlashId(id);
    const timer = window.setTimeout(() => {
      setFlashId(null);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('pointsFlash');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [searchParams, pathname, router]);

  /** Synthèse projet : `?createRetourExperience=1` */
  useEffect(() => {
    if (searchParams.get('createRetourExperience') !== '1') {
      openedPostMortemFromQueryRef.current = false;
      return;
    }
    if (!postMortemEligible || !canEdit) return;
    if (list.isLoading) return;
    if (openedPostMortemFromQueryRef.current) return;

    const stripCreateParam = () => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('createRetourExperience');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    const draft = findDraftPostMortemReview(list.data);
    if (draft) {
      openedPostMortemFromQueryRef.current = true;
      openEditor(draft.id);
      stripCreateParam();
      return;
    }

    if (
      hasFinalizedPostMortemReview(list.data) &&
      !findDraftPostMortemReview(list.data)
    ) {
      openedPostMortemFromQueryRef.current = true;
      stripCreateParam();
      return;
    }

    openedPostMortemFromQueryRef.current = true;
    setCreateOpen(true);
    stripCreateParam();
  }, [
    searchParams,
    pathname,
    router,
    postMortemEligible,
    canEdit,
    list.isLoading,
    list.data,
    openEditor,
  ]);

  useEffect(() => {
    const id = searchParams.get('openReview');
    if (!id?.trim()) {
      openedOpenReviewRef.current = null;
      return;
    }
    if (openedOpenReviewRef.current === id) return;
    openedOpenReviewRef.current = id;
    router.replace(projectReviewConduct(projectId, id));
  }, [searchParams, projectId, router]);

  const filteredRows = useMemo(() => {
    if (activeTab === 'series' || !list.data) return [];
    return list.data.filter((row) => {
      const state =
        row.uiState ??
        resolveReviewUiState({
          status: row.status,
          agendaLockedAt: row.agendaLockedAt,
          conductClosedAt: row.conductClosedAt,
        });
      return state === activeTab;
    });
  }, [activeTab, list.data]);

  const tabCounts = useMemo(() => {
    const fromSummary = summary.data?.countsByUiState;
    const counts: Partial<Record<ProjectReviewUiState, number>> & {
      series?: number;
    } = {
      ...(fromSummary ?? {}),
      series: series.data?.length ?? 0,
    };
    if (!fromSummary && list.data) {
      const local: Record<ProjectReviewUiState, number> = {
        to_prepare: 0,
        upcoming: 0,
        in_progress: 0,
        to_finalize: 0,
        history: 0,
      };
      for (const row of list.data) {
        const state =
          row.uiState ??
          resolveReviewUiState({
            status: row.status,
            agendaLockedAt: row.agendaLockedAt,
            conductClosedAt: row.conductClosedAt,
          });
        if (state) local[state] += 1;
      }
      Object.assign(counts, local);
    }
    return counts;
  }, [summary.data, list.data, series.data]);

  const onPrimaryReviewAction = () => {
    if (postMortemEligible && draftPostMortem) {
      openEditor(draftPostMortem.id);
    } else {
      setCreatePrefillType(null);
      setCreateOpen(true);
    }
  };

  const primaryReviewLabel = postMortemEligible
    ? draftPostMortem
      ? "Continuer le retour d'expérience"
      : "Créer un retour d'expérience"
    : 'Nouveau point projet';

  const showPrimaryCta =
    canEdit && !(postMortemEligible && finalizedPostMortem && !draftPostMortem);

  const emptyTitle: Record<ProjectReviewUiState, string> = {
    to_prepare: 'Aucun point à préparer',
    upcoming: 'Aucun point à venir',
    in_progress: 'Aucun point en cours',
    to_finalize: 'Aucun point à finaliser',
    history: 'Aucun historique',
  };

  return (
    <div className="flex flex-col gap-4">
      {!postMortemEligible ? (
        <ProjectReviewsContextBanner
          postMortemEligible={false}
          finalizedPostMortem={false}
          draftPostMortem={null}
          canEdit={canEdit}
          onPrimaryAction={onPrimaryReviewAction}
          variant="tab"
        />
      ) : null}

      {!postMortemEligible ? (
        <ProjectReviewsKpiRow
          summary={summary.data}
          isLoading={summary.isLoading}
          isError={summary.isError}
        />
      ) : null}

      {!postMortemEligible ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ProjectReviewsStateTabs
            active={activeTab}
            counts={tabCounts}
            onChange={(next) => setPointsState(next)}
          />
          {canEdit && activeTab !== 'series' ? (
            <ProjectReviewCreateSplitButton
              onCreateType={(type) => {
                setCreatePrefillType(type);
                setCreateOpen(true);
              }}
            />
          ) : null}
        </div>
      ) : null}

      {postMortemEligible && showPrimaryCta ? (
        <div className="flex items-center justify-end">
          <button
            type="button"
            className="starium-btn starium-btn-primary min-h-11"
            onClick={onPrimaryReviewAction}
          >
            <Plus strokeWidth={2.5} aria-hidden />
            {primaryReviewLabel}
          </button>
        </div>
      ) : null}

      <div className="starium-tablecard">
        {postMortemEligible ? (
          list.isLoading ? (
            <div className="p-6">
              <LoadingState rows={4} />
            </div>
          ) : list.error ? (
            <div className="p-6" role="alert">
              <p className="text-sm text-destructive">
                Impossible de charger les points projet.
              </p>
            </div>
          ) : !list.data?.length ? (
            <EmptyState
              title="Aucun retour d'expérience"
              description="Créez le bilan de clôture pour capitaliser objectifs, écarts et leçons apprises."
              action={
                canEdit ? (
                  <button
                    type="button"
                    className="starium-btn starium-btn-primary"
                    onClick={onPrimaryReviewAction}
                  >
                    <Plus strokeWidth={2.5} aria-hidden />
                    Créer un retour d&apos;expérience
                  </button>
                ) : undefined
              }
              className="py-14"
            />
          ) : (
            <ProjectReviewsTable
              uiState="history"
              rows={list.data}
              flashId={flashId}
              onOpen={openEditor}
            />
          )
        ) : activeTab === 'series' ? (
          <div className="p-4">
            <ProjectReviewSeriesPanel projectId={projectId} canEdit={canEdit} />
          </div>
        ) : list.isLoading ? (
          <div className="p-6">
            <LoadingState rows={4} />
          </div>
        ) : list.error ? (
          <div className="p-6" role="alert">
            <p className="text-sm text-destructive">
              Impossible de charger les points projet.
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title={emptyTitle[activeTab]}
            description="Changez d’onglet ou créez un nouveau point."
            action={
              canEdit ? (
                <ProjectReviewCreateSplitButton
                  onCreateType={(type) => {
                    setCreatePrefillType(type);
                    setCreateOpen(true);
                  }}
                />
              ) : undefined
            }
            className="py-14"
          />
        ) : (
          <ProjectReviewsTable
            uiState={activeTab}
            rows={filteredRows}
            flashId={flashId}
            onOpen={openEditor}
          />
        )}
      </div>

      <ProjectReviewCreateDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreatePrefillType(null);
        }}
        projectId={projectId}
        postMortemEligible={postMortemEligible}
        createTypeOptions={createTypeOptions}
        initialReviewType={createPrefillType ?? undefined}
        onCreated={(reviewId, openEditorAfterCreate) => {
          if (openEditorAfterCreate) {
            openEditor(reviewId);
            return;
          }
          setPointsState('to_prepare', reviewId);
        }}
      />
    </div>
  );
}
