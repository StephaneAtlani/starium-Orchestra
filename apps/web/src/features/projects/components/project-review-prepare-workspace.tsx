'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/lib/toast';
import {
  blocksForTypeCode,
  defaultSelectedBlockIds,
  findStdBlock,
} from '../lib/prepare-workspace-blocks';
import {
  mergeContentPayloadWithPrep,
  parsePrepWorkspace,
  parsePwBlockIdFromNotes,
  pwBlockNotesMarker,
  reviewTypeToTypeCode,
  type PrepWorkspacePayload,
} from '../lib/prepare-workspace-types';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import { usePrepareTemplatesQuery } from '../hooks/use-prepare-templates-query';
import { useProjectGanttQuery } from '../hooks/use-project-gantt-query';
import type { ProjectReviewDetail } from '../types/project.types';
import { StariumScrollArea } from '@/components/layout/starium-scroll-area';
import { PrepareWorkspaceBanner } from './prepare-workspace-banner';
import { PrepareWorkspaceModelCard } from './prepare-workspace-model-card';
import { PrepareWorkspaceParticipants } from './prepare-workspace-participants';
import { PrepareWorkspaceOdj, type PrepareOdjPointTarget } from './prepare-workspace-odj';
import { PrepareWorkspaceReprise } from './prepare-workspace-reprise';
import { PrepareTemplateEditorDialog } from './prepare-template-editor-dialog';
import { PrepareWorkspacePointDialog } from './prepare-workspace-point-dialog';
import {
  buildPrepPlanModel,
  defaultPlanningSelection,
  planSummaryText,
  PreparePlanMiniBar,
} from './prepare-workspace-planning-panel';
import type { PrepPlanningPayload } from '../lib/prepare-workspace-types';
import type { PrepareLockIssue } from '../lib/project-review-prepare-guards';
import type { PrepareLockFocusTarget } from '../lib/project-review-prepare-guards';
import type { ProjectReviewAgendaItemApi } from '../types/project.types';
import '../styles/prepare-workspace.css';

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export type ProjectReviewPrepareWorkspaceProps = {
  projectId: string;
  detail: ProjectReviewDetail;
  canEdit: boolean;
  agendaLocked: boolean;
  previousDetail?: ProjectReviewDetail | null;
  previousLoading?: boolean;
  previousError?: boolean;
  lockIssues?: PrepareLockIssue[];
  revealLockIssues?: boolean;
  onFocusIssue?: (focus: PrepareLockFocusTarget) => void;
  agendaListRef?: React.RefObject<HTMLElement | null>;
  durationCounterRef?: React.RefObject<HTMLElement | null>;
  participantsRef?: React.RefObject<HTMLElement | null>;
  /** Exposé au dialog parent pour flush brouillon. */
  onRegisterFlush?: (flush: () => Promise<void>) => void;
};

export function ProjectReviewPrepareWorkspace({
  projectId,
  detail,
  canEdit,
  agendaLocked,
  previousDetail,
  previousLoading = false,
  previousError = false,
  lockIssues = [],
  revealLockIssues = false,
  onFocusIssue,
  agendaListRef,
  durationCounterRef,
  participantsRef,
  onRegisterFlush,
}: ProjectReviewPrepareWorkspaceProps) {
  const typeCode = reviewTypeToTypeCode(detail.reviewType);
  const blocks = useMemo(() => blocksForTypeCode(typeCode), [typeCode]);
  const fallbackIds = useMemo(
    () => defaultSelectedBlockIds(typeCode),
    [typeCode],
  );

  const [prep, setPrep] = useState<PrepWorkspacePayload>(() =>
    parsePrepWorkspace(detail.contentPayload, fallbackIds),
  );
  const prepRef = useRef(prep);
  prepRef.current = prep;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [pointOpen, setPointOpen] = useState(false);
  const [pointIndex, setPointIndex] = useState<number | null>(null);
  const [pointItem, setPointItem] = useState<ProjectReviewAgendaItemApi | null>(
    null,
  );

  const {
    update,
    createAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
    reorderAgendaItems,
  } = useProjectReviewMutations(projectId);

  const templatesQuery = usePrepareTemplatesQuery(projectId, typeCode, {
    enabled: true,
  });
  const templates = templatesQuery.data?.items ?? [];
  const ganttQuery = useProjectGanttQuery(projectId, { enabled: true });
  const planModel = useMemo(
    () => buildPrepPlanModel(ganttQuery.data),
    [ganttQuery.data],
  );

  useEffect(() => {
    setPrep(parsePrepWorkspace(detail.contentPayload, fallbackIds));
  }, [detail.id, detail.contentPayload, fallbackIds]);

  const persistPrep = useCallback(
    async (next: PrepWorkspacePayload) => {
      if (!canEdit || agendaLocked) return;
      setPrep(next);
      try {
        await update.mutateAsync({
          reviewId: detail.id,
          body: {
            contentPayload: mergeContentPayloadWithPrep(
              detail.contentPayload,
              next,
            ),
          },
        });
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Enregistrement impossible'));
      }
    },
    [agendaLocked, canEdit, detail.contentPayload, detail.id, update],
  );

  const flush = useCallback(async () => {
    await persistPrep(prepRef.current);
  }, [persistPrep]);

  useEffect(() => {
    onRegisterFlush?.(flush);
  }, [flush, onRegisterFlush]);

  const syncBlockAgenda = useCallback(
    async (blockId: string, selected: boolean) => {
      if (!canEdit || agendaLocked) return;
      const block = findStdBlock(blockId);
      if (!block) return;
      const marker = pwBlockNotesMarker(blockId);
      const existing = (detail.agendaItems ?? []).find(
        (i) => parsePwBlockIdFromNotes(i.notes) === blockId,
      );
      if (selected && !existing) {
        try {
          await createAgendaItem.mutateAsync({
            reviewId: detail.id,
            body: {
              title: block.title,
              itemType: 'INFORMATION',
              plannedDurationMinutes: block.defaultMin,
              notes: marker,
            },
          });
        } catch (err) {
          toast.error(apiErrorMessage(err, 'Impossible d’ajouter le bloc'));
        }
        return;
      }
      if (!selected && existing) {
        try {
          await deleteAgendaItem.mutateAsync({
            reviewId: detail.id,
            agendaItemId: existing.id,
          });
        } catch (err) {
          toast.error(apiErrorMessage(err, 'Impossible de retirer le bloc'));
        }
      }
    },
    [
      agendaLocked,
      canEdit,
      createAgendaItem,
      deleteAgendaItem,
      detail.agendaItems,
      detail.id,
    ],
  );

  const onToggleBlock = async (blockId: string) => {
    const on = prep.selectedBlockIds.includes(blockId);
    const nextIds = on
      ? prep.selectedBlockIds.filter((id) => id !== blockId)
      : [...prep.selectedBlockIds, blockId];
    const next = { ...prep, selectedBlockIds: nextIds };
    await persistPrep(next);
    await syncBlockAgenda(blockId, !on);
  };

  const syncAgendaOrderFromBlocks = useCallback(
    async (orderedBlockIds: string[]) => {
      const items = detail.agendaItems ?? [];
      const pwItems = orderedBlockIds
        .map((blockId) =>
          items.find((i) => parsePwBlockIdFromNotes(i.notes) === blockId),
        )
        .filter((i): i is ProjectReviewAgendaItemApi => !!i);
      const others = items.filter((i) => !parsePwBlockIdFromNotes(i.notes));
      const ordered = [...pwItems, ...others];
      if (ordered.length === 0) return;
      try {
        await reorderAgendaItems.mutateAsync({
          reviewId: detail.id,
          items: ordered.map((item, orderIndex) => ({
            id: item.id,
            orderIndex,
          })),
        });
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Réordonnancement impossible'));
      }
    },
    [detail.agendaItems, detail.id, reorderAgendaItems],
  );

  const onReorderSelectedBlocks = async (orderedIds: string[]) => {
    const next = { ...prep, selectedBlockIds: orderedIds };
    await persistPrep(next);
    await syncAgendaOrderFromBlocks(orderedIds);
  };

  const onReorderAgendaItems = async (orderedIds: string[]) => {
    try {
      await reorderAgendaItems.mutateAsync({
        reviewId: detail.id,
        items: orderedIds.map((id, orderIndex) => ({ id, orderIndex })),
      });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Réordonnancement impossible'));
    }
  };

  const onBlockDurationChange = async (blockId: string, minutes: number) => {
    const next = {
      ...prep,
      blockDurations: { ...(prep.blockDurations ?? {}), [blockId]: minutes },
    };
    await persistPrep(next);
    const existing = (detail.agendaItems ?? []).find(
      (i) => parsePwBlockIdFromNotes(i.notes) === blockId,
    );
    if (!existing) return;
    try {
      await updateAgendaItem.mutateAsync({
        reviewId: detail.id,
        agendaItemId: existing.id,
        body: { plannedDurationMinutes: minutes },
      });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Durée non enregistrée'));
    }
  };

  const goalPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onGoalChange = useCallback(
    (goal: string) => {
      const next = { ...prepRef.current, goal };
      setPrep(next);
      if (goalPersistTimer.current) clearTimeout(goalPersistTimer.current);
      goalPersistTimer.current = setTimeout(() => {
        void persistPrep({ ...prepRef.current, goal });
      }, 400);
    },
    [persistPrep],
  );

  const planningPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const onPlanningChange = useCallback(
    (planning: PrepPlanningPayload) => {
      const next = { ...prepRef.current, planning };
      setPrep(next);
      if (planningPersistTimer.current) clearTimeout(planningPersistTimer.current);
      planningPersistTimer.current = setTimeout(() => {
        void persistPrep({ ...prepRef.current, planning });
      }, 400);
    },
    [persistPrep],
  );

  const planningValue = useMemo(
    () => defaultPlanningSelection(planModel.milestones, prep.planning),
    [planModel.milestones, prep.planning],
  );

  const odjMeta = useMemo(
    () => {
      const sourceActions =
        previousDetail?.actionItems ?? detail.actionItems ?? [];
      const openActionsCount = sourceActions.filter(
        (a) => a.status !== 'DONE' && a.status !== 'CANCELLED',
      ).length;
      const openArbitrationCount = (
        previousDetail?.agendaItems ??
        detail.agendaItems ??
        []
      ).filter(
        (item) =>
          item.itemType === 'ARBITRATION' && !(item.decisionSummary?.trim()),
      ).length;
      const presentCount = planningValue.selectedMilestoneIds.length;
      return {
        participantCount: (detail.participants ?? []).length,
        openActionsCount,
        openArbitrationCount,
        openRisksCount: 0,
        goal: prep.goal ?? '',
        onGoalChange,
        planningMeta: (
          <span className="inline-flex flex-wrap items-center gap-x-1">
            <PreparePlanMiniBar phases={planModel.phases} />
            <span>
              {planSummaryText(
                planModel,
                planningValue.mode,
                presentCount,
              )}
            </span>
          </span>
        ),
      };
    },
    [
      detail.actionItems,
      detail.agendaItems,
      detail.participants,
      onGoalChange,
      planModel,
      planningValue.mode,
      planningValue.selectedMilestoneIds.length,
      prep.goal,
      previousDetail?.actionItems,
      previousDetail?.agendaItems,
    ],
  );

  const ensureAgendaForBlock = async (
    blockId: string,
  ): Promise<ProjectReviewAgendaItemApi | null> => {
    const existing = (detail.agendaItems ?? []).find(
      (i) => parsePwBlockIdFromNotes(i.notes) === blockId,
    );
    if (existing) return existing;
    const block = findStdBlock(blockId);
    if (!block) return null;
    try {
      const created = await createAgendaItem.mutateAsync({
        reviewId: detail.id,
        body: {
          title: block.title,
          itemType: 'INFORMATION',
          plannedDurationMinutes: block.defaultMin,
          notes: pwBlockNotesMarker(blockId),
        },
      });
      return created as ProjectReviewAgendaItemApi;
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Impossible d’ouvrir le point'));
      return null;
    }
  };

  const onOpenPoint = async (target: PrepareOdjPointTarget) => {
    setPointIndex(target.index);
    if (target.kind === 'agenda') {
      const item =
        (detail.agendaItems ?? []).find((i) => i.id === target.agendaItemId) ??
        null;
      setPointItem(item);
      setPointOpen(!!item);
      return;
    }
    let nextPrep = prep;
    if (!prep.selectedBlockIds.includes(target.blockId)) {
      nextPrep = {
        ...prep,
        selectedBlockIds: [...prep.selectedBlockIds, target.blockId],
      };
    }
    if (target.blockId === 'planning' && !nextPrep.planning) {
      nextPrep = {
        ...nextPrep,
        planning: defaultPlanningSelection(planModel.milestones, null),
      };
    }
    if (nextPrep !== prep) {
      await persistPrep(nextPrep);
    }
    const item = await ensureAgendaForBlock(target.blockId);
    setPointItem(item);
    setPointOpen(!!item);
  };

  const onModeChange = async (mode: PrepWorkspacePayload['mode']) => {
    const next = { ...prep, mode };
    await persistPrep(next);
    if (mode === 'sections') {
      for (const id of next.selectedBlockIds) {
        await syncBlockAgenda(id, true);
      }
    }
  };

  const onSelectTemplate = async (id: string | null) => {
    const tpl = id ? templates.find((t) => t.id === id) : null;
    if (!tpl) {
      await persistPrep({
        ...prep,
        templateId: null,
        selectedBlockIds: fallbackIds,
      });
      return;
    }
    const payload = tpl.payload;
    const selected =
      payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as PrepWorkspacePayload).selectedBlockIds)
        ? (payload as PrepWorkspacePayload).selectedBlockIds
        : fallbackIds;
    const mode =
      payload &&
      typeof payload === 'object' &&
      (payload as PrepWorkspacePayload).mode === 'sections'
        ? 'sections'
        : 'simple';
    await persistPrep({
      ...prep,
      templateId: id,
      selectedBlockIds: selected,
      mode,
      customBlocks:
        payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as PrepWorkspacePayload).customBlocks)
          ? (payload as PrepWorkspacePayload).customBlocks
          : [],
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {revealLockIssues && lockIssues.length > 0 ? (
        <div
          className="shrink-0 rounded-lg border border-destructive/40 bg-destructive/5 p-3"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm font-semibold text-destructive">
            Contrôles bloquants
          </p>
          <ul className="mt-1 list-inside list-disc text-sm text-destructive">
            {lockIssues.map((issue) => (
              <li key={issue.message}>
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  onClick={() => onFocusIssue?.(issue.focus)}
                >
                  {issue.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="prepare-workspace min-h-0 flex-1">
        <div className="prepare-workspace__col prepare-workspace__col--left">
          <StariumScrollArea
            className="h-full min-h-0 w-full flex-1"
            viewportClassName="prepare-workspace__viewport"
            reveal="hover"
          >
            <PrepareWorkspaceBanner
              title={detail.title}
              reviewType={detail.reviewType}
              reviewDate={detail.reviewDate}
            />
            <PrepareWorkspaceModelCard
              typeCode={typeCode}
              templates={templates}
              templatesLoading={templatesQuery.isLoading}
              selectedTemplateId={prep.templateId}
              canEdit={canEdit && !agendaLocked}
              onSelectTemplate={(id) => void onSelectTemplate(id)}
              onCreate={() => {
                setEditorMode('create');
                setEditorOpen(true);
              }}
              onEdit={() => {
                setEditorMode('edit');
                setEditorOpen(true);
              }}
            />
            <PrepareWorkspaceParticipants
              projectId={projectId}
              reviewId={detail.id}
              participants={detail.participants ?? []}
              canEdit={canEdit && !agendaLocked}
              sectionRef={participantsRef as React.RefObject<HTMLElement>}
            />
          </StariumScrollArea>
        </div>

        <div className="prepare-workspace__col prepare-workspace__col--mid">
          <div className="prepare-workspace__viewport prepare-workspace__viewport--odj flex min-h-0 flex-1 flex-col overflow-hidden">
            <PrepareWorkspaceOdj
              mode={prep.mode}
              onModeChange={(m) => void onModeChange(m)}
              blocks={blocks}
              selectedBlockIds={prep.selectedBlockIds}
              onToggleBlock={(id) => void onToggleBlock(id)}
              onReorderSelectedBlocks={(ids) => void onReorderSelectedBlocks(ids)}
              onReorderAgendaItems={onReorderAgendaItems}
              onOpenPoint={(t) => void onOpenPoint(t)}
              onBlockDurationChange={(id, min) => void onBlockDurationChange(id, min)}
              blockDurations={prep.blockDurations ?? {}}
              agendaItems={detail.agendaItems ?? []}
              sessionDurationMinutes={detail.durationMinutes}
              canEdit={canEdit}
              agendaLocked={agendaLocked}
              meta={odjMeta}
              agendaListRef={agendaListRef as React.RefObject<HTMLElement>}
              durationCounterRef={
                durationCounterRef as React.RefObject<HTMLElement>
              }
              onAddAgendaItem={async (title, minutes) => {
                try {
                  await createAgendaItem.mutateAsync({
                    reviewId: detail.id,
                    body: {
                      title,
                      itemType: 'INFORMATION',
                      plannedDurationMinutes: minutes,
                    },
                  });
                  toast.success('Point ajouté');
                } catch (err) {
                  toast.error(apiErrorMessage(err, 'Ajout impossible'));
                }
              }}
              onUpdateDuration={async (itemId, minutes) => {
                try {
                  await updateAgendaItem.mutateAsync({
                    reviewId: detail.id,
                    agendaItemId: itemId,
                    body: { plannedDurationMinutes: minutes },
                  });
                } catch (err) {
                  toast.error(apiErrorMessage(err, 'Durée non enregistrée'));
                }
              }}
              onDeleteAgendaItem={async (itemId) => {
                try {
                  await deleteAgendaItem.mutateAsync({
                    reviewId: detail.id,
                    agendaItemId: itemId,
                  });
                } catch (err) {
                  toast.error(apiErrorMessage(err, 'Suppression impossible'));
                }
              }}
            />
          </div>
        </div>

        <div className="prepare-workspace__col prepare-workspace__col--right">
          <StariumScrollArea
            className="h-full min-h-0 w-full flex-1"
            viewportClassName="prepare-workspace__viewport"
            reveal="hover"
          >
            <PrepareWorkspaceReprise
              projectId={projectId}
              reviewId={detail.id}
              reviewDate={detail.reviewDate}
              previousDetail={previousDetail}
              previousLoading={previousLoading}
              previousError={previousError}
              canEdit={canEdit}
              agendaLocked={agendaLocked}
              resumedTitles={(detail.agendaItems ?? []).map((i) => i.title)}
              onAddToOdj={async ({ title, itemType, description }) => {
                try {
                  await createAgendaItem.mutateAsync({
                    reviewId: detail.id,
                    body: {
                      title,
                      itemType,
                      description: description ?? null,
                      plannedDurationMinutes: 10,
                    },
                  });
                  toast.success('Sujet ajouté à l’ordre du jour');
                } catch (err) {
                  toast.error(
                    apiErrorMessage(err, 'Impossible d’ajouter le sujet'),
                  );
                }
              }}
            />
          </StariumScrollArea>
        </div>
      </div>

      <PrepareTemplateEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        projectId={projectId}
        typeCode={typeCode}
        mode={editorMode}
        templateId={prep.templateId}
        initialName={
          templates.find((t) => t.id === prep.templateId)?.name
        }
        initialSelectedBlockIds={prep.selectedBlockIds}
        onSaved={async (tpl) => {
          await persistPrep({
            ...prepRef.current,
            templateId: tpl.id,
            selectedBlockIds: Array.isArray(tpl.payload?.selectedBlockIds)
              ? (tpl.payload.selectedBlockIds as string[])
              : prepRef.current.selectedBlockIds,
          });
          void templatesQuery.refetch();
        }}
      />

      <PrepareWorkspacePointDialog
        open={pointOpen}
        onOpenChange={(next) => {
          setPointOpen(next);
          if (!next) setPointItem(null);
        }}
        projectId={projectId}
        detail={detail}
        agendaItem={pointItem}
        canEdit={canEdit && !agendaLocked}
        pointIndex={pointIndex}
        planning={planningValue}
        onPlanningChange={onPlanningChange}
        gantt={ganttQuery.data}
        ganttLoading={ganttQuery.isLoading}
        ganttError={ganttQuery.isError}
      />
    </div>
  );
}
