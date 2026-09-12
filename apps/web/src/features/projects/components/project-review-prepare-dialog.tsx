'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardPen, Play, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { LoadingState } from '@/components/feedback/loading-state';
import { toast } from '@/lib/toast';
import { useProjectReviewDetailQuery } from '../hooks/use-project-review-detail-query';
import { useProjectReviewsQuery } from '../hooks/use-project-reviews-query';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import {
  canFreezePrepare,
  type PrepareLockFocusTarget,
} from '../lib/project-review-prepare-guards';
import { canStartReview } from '../lib/project-review-status';
import {
  prepareLockIssuesFromDetail,
  ProjectReviewPrepareCdcPanel,
} from './project-review-prepare-cdc-panel';
import { ProjectReviewConvocationDialog } from './project-review-convocation-dialog';
import { projectReviewConduct } from '../constants/project-routes';

export type ProjectReviewPrepareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  reviewId: string | null;
  canEdit: boolean;
};

/** CDC 03 — modale « Préparer l'instance » (capture p.8). */
export function ProjectReviewPrepareDialog({
  open,
  onOpenChange,
  projectId,
  reviewId,
  canEdit,
}: ProjectReviewPrepareDialogProps) {
  const router = useRouter();
  const detailQuery = useProjectReviewDetailQuery(
    projectId,
    open ? reviewId : null,
  );
  const listQuery = useProjectReviewsQuery(projectId, {
    enabled: open && !!reviewId,
  });
  const { createAgendaItem, update, startReview } =
    useProjectReviewMutations(projectId);

  const [convocationOpen, setConvocationOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [revealLockIssues, setRevealLockIssues] = useState(false);
  const durationRef = useRef<HTMLElement | null>(null);
  const participantsRef = useRef<HTMLElement | null>(null);
  const agendaRef = useRef<HTMLElement | null>(null);

  const detail = detailQuery.data;
  const agendaLocked = Boolean(detail?.agendaLockedAt);
  const lockIssues = useMemo(
    () => (detail ? prepareLockIssuesFromDetail(detail) : []),
    [detail],
  );
  const ready = useMemo(
    () =>
      detail
        ? canFreezePrepare({
            agendaItems: (detail.agendaItems ?? []).map((item) => ({
              id: item.id,
              title: item.title,
              itemType: item.itemType,
              plannedDurationMinutes: item.plannedDurationMinutes,
              ownerUserId: item.ownerUserId,
            })),
            participantCount: (detail.participants ?? []).length,
            sessionDurationMinutes: detail.durationMinutes,
            attachments: (detail.attachments ?? []).map((a) => ({
              agendaItemId: a.agendaItemId,
            })),
          })
        : false,
    [detail],
  );

  const previousReviewId = useMemo(() => {
    if (!detail || !listQuery.data?.length) return null;
    const dated = listQuery.data
      .filter(
        (r) =>
          r.id !== detail.id &&
          r.reviewDate &&
          detail.reviewDate &&
          new Date(r.reviewDate).getTime() <
            new Date(detail.reviewDate).getTime(),
      )
      .sort(
        (a, b) =>
          new Date(b.reviewDate!).getTime() - new Date(a.reviewDate!).getTime(),
      );
    return dated[0]?.id ?? null;
  }, [detail, listQuery.data]);

  const previousDetailQuery = useProjectReviewDetailQuery(
    projectId,
    open && previousReviewId ? previousReviewId : null,
  );

  const focusIssue = useCallback((focus: PrepareLockFocusTarget) => {
    if (focus.kind === 'duration-overrun') {
      durationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (focus.kind === 'participants') {
      participantsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }
    agendaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const saveDraft = async () => {
    if (!detail || !canEdit) return;
    setSavingDraft(true);
    try {
      await update.mutateAsync({
        reviewId: detail.id,
        body: {
          title: detail.title,
          objective: detail.objective,
        },
      });
      toast.success('Brouillon enregistré');
    } catch {
      toast.error('Enregistrement impossible');
    } finally {
      setSavingDraft(false);
    }
  };

  const onStart = async () => {
    if (!detail || !canStartReview(detail.status)) return;
    try {
      await startReview.mutateAsync(detail.id);
      onOpenChange(false);
      router.push(projectReviewConduct(projectId, detail.id));
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message ?? 'Démarrage impossible',
      );
    }
  };

  const onSendConvocation = () => {
    if (!detail) return;
    if (!ready) {
      setRevealLockIssues(true);
      toast.error(lockIssues[0]?.message ?? 'Contrôles bloquants non résolus');
      return;
    }
    setRevealLockIssues(false);
    setConvocationOpen(true);
  };

  return (
    <>
      <StariumModal
        open={open}
        onOpenChange={(next) => {
          if (convocationOpen) return;
          if (!next) setRevealLockIssues(false);
          onOpenChange(next);
        }}
        title="Préparer l'instance"
        description="Ordre du jour, supports et points à arbitrer"
        icon={ClipboardPen}
        size="xl"
        contentClassName="sm:max-w-4xl"
        footer={
          detail ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 sm:min-h-9"
                disabled={!canEdit || savingDraft || agendaLocked}
                onClick={() => void saveDraft()}
              >
                Enregistrer le brouillon
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 sm:min-h-9 gap-1.5"
                disabled={!canEdit || !canStartReview(detail.status)}
                onClick={() => void onStart()}
              >
                <Play className="size-4" aria-hidden />
                Démarrer la séance
              </Button>
              {!agendaLocked ? (
                <Button
                  type="button"
                  className="min-h-11 sm:min-h-9 gap-1.5"
                  disabled={!canEdit || !ready}
                  onClick={onSendConvocation}
                >
                  <Send className="size-4" aria-hidden />
                  Envoyer la convocation
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 sm:min-h-9"
                  onClick={() => setConvocationOpen(true)}
                >
                  Renvoyer la convocation
                </Button>
              )}
            </>
          ) : null
        }
      >
        {!reviewId || detailQuery.isLoading ? (
          <LoadingState rows={6} />
        ) : detailQuery.isError || !detail ? (
          <p className="text-sm text-destructive" role="alert">
            Impossible de charger la préparation.
          </p>
        ) : (
          <ProjectReviewPrepareCdcPanel
            projectId={projectId}
            detail={detail}
            canEdit={canEdit}
            agendaLocked={agendaLocked}
            hideChromeHeader
            revealLockIssues={revealLockIssues}
            previousActions={
              previousReviewId
                ? (previousDetailQuery.data?.actionItems ?? null)
                : []
            }
            previousLoading={
              Boolean(previousReviewId) && previousDetailQuery.isLoading
            }
            previousError={
              Boolean(previousReviewId) &&
              (previousDetailQuery.isError || !previousDetailQuery.data)
            }
            onResumeAction={async (action) => {
              try {
                await createAgendaItem.mutateAsync({
                  reviewId: detail.id,
                  body: {
                    title: action.title.trim(),
                    itemType: 'ACTION_REVIEW',
                    description: action.description?.trim() || null,
                    plannedDurationMinutes: 10,
                  },
                });
                toast.success('Sujet ajouté à l’ordre du jour');
              } catch {
                toast.error('Impossible d’ajouter le sujet');
              }
            }}
            lockIssues={lockIssues}
            onFocusIssue={focusIssue}
            agendaListRef={agendaRef}
            durationCounterRef={durationRef}
            participantsRef={participantsRef}
          />
        )}
      </StariumModal>

      {detail ? (
        <ProjectReviewConvocationDialog
          open={convocationOpen}
          onOpenChange={setConvocationOpen}
          projectId={projectId}
          detail={detail}
          scheduleReviewDateIso={detail.reviewDate}
          onSent={() => {
            setConvocationOpen(false);
            onOpenChange(false);
          }}
        />
      ) : null}
    </>
  );
}
