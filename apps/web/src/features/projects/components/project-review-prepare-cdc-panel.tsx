'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import {
  PROJECT_REVIEW_AGENDA_ITEM_TYPE_LABEL,
  PROJECT_REVIEW_MEETING_MODE_LABEL,
  PROJECT_REVIEW_TYPE_BADGE,
} from '../constants/project-enum-labels';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import {
  collectPrepareLockIssues,
  formatDurationMinutesFr,
  isDecisionLikeAgendaType,
  sumAgendaPlannedMinutes,
  type PrepareLockFocusTarget,
  type PrepareLockIssue,
} from '../lib/project-review-prepare-guards';
import { sortReviewAgendaItems } from '../lib/review-agenda-utils';
import type {
  ProjectReviewActionItemApi,
  ProjectReviewAgendaItemApi,
  ProjectReviewAgendaItemType,
  ProjectReviewAttachmentApi,
  ProjectReviewDetail,
  ProjectReviewDecisionApi,
} from '../types/project.types';
import { ReviewAttachmentsSection } from './review-attachments-section';
import { ReviewParticipantsSection } from './review-participants-section';
import { ReviewPreviousOpenActions } from './review-previous-open-actions';

function displayNameFromUser(u: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

function formatBannerWhen(iso: string | null | undefined): string {
  if (!iso) return 'Date à définir';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Date à définir';
  }
}

function formatBannerPlace(detail: ProjectReviewDetail): string {
  const parts: string[] = [];
  if (detail.durationMinutes) {
    parts.push(formatDurationMinutesFr(detail.durationMinutes));
  }
  if (detail.meetingMode) {
    parts.push(
      PROJECT_REVIEW_MEETING_MODE_LABEL[detail.meetingMode] ?? detail.meetingMode,
    );
  }
  if (detail.location?.trim()) parts.push(detail.location.trim());
  else if (detail.meetingUrl?.trim()) parts.push('Visio');
  return parts.join(' · ') || 'Lieu à préciser';
}

const PREPARE_ITEM_TYPES = (
  Object.keys(PROJECT_REVIEW_AGENDA_ITEM_TYPE_LABEL) as ProjectReviewAgendaItemType[]
).filter((k) => k !== 'ESCALATION' && k !== 'DECISION_DESCENT');

const DEFAULT_POINT_MINUTES = 10;

export type ProjectReviewPrepareCdcPanelProps = {
  projectId: string;
  detail: ProjectReviewDetail;
  canEdit: boolean;
  agendaLocked: boolean;
  previousActions: ProjectReviewActionItemApi[] | null;
  previousLoading: boolean;
  previousError: boolean;
  onResumeAction: (action: ProjectReviewActionItemApi) => void | Promise<void>;
  lockIssues: PrepareLockIssue[];
  onFocusIssue: (focus: PrepareLockFocusTarget) => void;
  agendaListRef?: React.RefObject<HTMLElement | null>;
  durationCounterRef?: React.RefObject<HTMLElement | null>;
  participantsRef?: React.RefObject<HTMLElement | null>;
  hideChromeHeader?: boolean;
  /** Affiche le détail des contrôles (après clic Envoyer échoué). */
  revealLockIssues?: boolean;
};

export function ProjectReviewPrepareCdcPanel({
  projectId,
  detail,
  canEdit,
  agendaLocked,
  previousActions,
  previousLoading,
  previousError,
  onResumeAction,
  lockIssues,
  onFocusIssue,
  agendaListRef,
  durationCounterRef,
  participantsRef,
  hideChromeHeader = false,
  revealLockIssues = false,
}: ProjectReviewPrepareCdcPanelProps) {
  const {
    createAgendaItem,
    updateAgendaItem,
    deleteAgendaItem,
    reorderAgendaItems,
  } = useProjectReviewMutations(projectId);
  const assignable = useProjectAssignableUsers({
    enabled: canEdit && !agendaLocked,
  });
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const seededDurationsRef = useRef(false);
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const sortedItems = useMemo(
    () => sortReviewAgendaItems(detail.agendaItems ?? []),
    [detail.agendaItems],
  );
  const sessionMinutes = detail.durationMinutes ?? 0;
  const cumul = sumAgendaPlannedMinutes(sortedItems);
  const overrun = sessionMinutes > 0 && cumul > sessionMinutes;
  const editable = canEdit && !agendaLocked;
  const badge = PROJECT_REVIEW_TYPE_BADGE[detail.reviewType] ?? 'Point';
  const arbitrationItems = sortedItems.filter((i) =>
    isDecisionLikeAgendaType(i.itemType),
  );

  /** CDC : lignes sans durée → seed 10 min pour coller à la maquette utilisable. */
  useEffect(() => {
    if (!editable || seededDurationsRef.current) return;
    const missing = sortedItems.filter(
      (item) =>
        !(
          typeof item.plannedDurationMinutes === 'number' &&
          item.plannedDurationMinutes > 0
        ),
    );
    if (missing.length === 0) {
      seededDurationsRef.current = true;
      return;
    }
    seededDurationsRef.current = true;
    void Promise.all(
      missing.map((item) =>
        updateAgendaItem.mutateAsync({
          reviewId: detail.id,
          agendaItemId: item.id,
          body: { plannedDurationMinutes: DEFAULT_POINT_MINUTES },
        }),
      ),
    ).catch(() => {
      seededDurationsRef.current = false;
    });
  }, [editable, sortedItems, detail.id, updateAgendaItem]);

  const focusItem = useCallback((itemId: string, field?: string) => {
    setExpandedId(itemId);
    const li = rowRefs.current.get(itemId);
    li?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!field || !li) return;
    window.setTimeout(() => {
      const el = li.querySelector<HTMLElement>(`[data-prepare-field="${field}"]`);
      el?.focus();
    }, 50);
  }, []);

  const handleIssueClick = (issue: PrepareLockIssue) => {
    onFocusIssue(issue.focus);
    const f = issue.focus;
    if (f.kind === 'agenda-title') focusItem(f.itemId, 'title');
    else if (f.kind === 'agenda-owner') focusItem(f.itemId, 'owner');
    else if (f.kind === 'agenda-duration') focusItem(f.itemId, 'duration');
    else if (f.kind === 'agenda-support') focusItem(f.itemId, 'title');
    else if (f.kind === 'duration-overrun') {
      durationCounterRef?.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } else if (f.kind === 'participants') {
      participantsRef?.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const moveItem = async (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= sortedItems.length) return;
    const order = sortedItems.map((i) => i.id);
    const [removed] = order.splice(index, 1);
    order.splice(next, 0, removed!);
    try {
      await reorderAgendaItems.mutateAsync({
        reviewId: detail.id,
        items: order.map((id, orderIndex) => ({ id, orderIndex })),
      });
    } catch {
      toast.error('Réordonnancement impossible');
    }
  };

  const patchItem = async (
    item: ProjectReviewAgendaItemApi,
    body: Record<string, unknown>,
  ) => {
    try {
      await updateAgendaItem.mutateAsync({
        reviewId: detail.id,
        agendaItemId: item.id,
        body,
      });
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message ?? 'Enregistrement impossible',
      );
    }
  };

  const addPoint = async () => {
    setAdding(true);
    try {
      const created = await createAgendaItem.mutateAsync({
        reviewId: detail.id,
        body: {
          title: 'Nouveau point',
          itemType: 'INFORMATION',
          plannedDurationMinutes: DEFAULT_POINT_MINUTES,
        },
      });
      if (created?.id) setExpandedId(created.id);
    } catch {
      toast.error('Impossible d’ajouter un point');
    } finally {
      setAdding(false);
    }
  };

  const removePoint = async (item: ProjectReviewAgendaItemApi) => {
    try {
      await deleteAgendaItem.mutateAsync({
        reviewId: detail.id,
        agendaItemId: item.id,
      });
    } catch {
      toast.error('Suppression impossible');
    }
  };

  const counterEl = (
    <p
      ref={durationCounterRef as React.RefObject<HTMLParagraphElement>}
      id="prepare-duration-counter"
      className={cn(
        'shrink-0 rounded-[var(--control-radius)] border px-3 py-1.5 text-sm font-semibold tabular-nums',
        overrun
          ? 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)]/15 text-foreground'
          : 'border-border bg-muted/30 text-muted-foreground',
      )}
      aria-live="polite"
    >
      {formatDurationMinutesFr(cumul)}
      {sessionMinutes > 0 ? ` / ${formatDurationMinutesFr(sessionMinutes)}` : ''}
    </p>
  );

  return (
    <div className="flex flex-col gap-5">
      {!hideChromeHeader ? (
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Préparer l&apos;instance
            </h2>
            <p className="text-sm text-muted-foreground">
              Ordre du jour, supports et points à arbitrer
            </p>
          </div>
          {counterEl}
        </header>
      ) : (
        <div className="flex justify-end">{counterEl}</div>
      )}

      {agendaLocked ? (
        <div
          className="rounded-[var(--radius-md)] border border-border bg-muted/30 px-4 py-3 text-sm"
          role="status"
        >
          Ordre du jour figé
          {detail.agendaLockedAt
            ? ` le ${new Date(detail.agendaLockedAt).toLocaleString('fr-FR', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : ''}
          .
        </div>
      ) : null}

      {/* Bandeau séance — CDC */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-sky-500/20 bg-sky-500/10 px-4 py-3"
        role="region"
        aria-label="Bandeau de séance"
      >
        <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)] bg-card text-center shadow-sm">
          <span className="text-[0.65rem] font-semibold uppercase text-muted-foreground">
            {detail.reviewDate
              ? new Date(detail.reviewDate).toLocaleDateString('fr-FR', {
                  month: 'short',
                })
              : '—'}
          </span>
          <span className="text-lg font-bold tabular-nums leading-none text-foreground">
            {detail.reviewDate ? new Date(detail.reviewDate).getDate() : '·'}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-foreground">
              {displayLabel(detail.title, 'Point projet')}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <span
                className="size-1.5 rounded-full bg-muted-foreground/70"
                aria-hidden
              />
              {badge}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatBannerWhen(detail.reviewDate)} · {formatBannerPlace(detail)}
          </p>
        </div>
      </div>

      {revealLockIssues && lockIssues.length > 0 && !agendaLocked ? (
        <div
          className="rounded-[var(--radius-md)] border border-border bg-muted/20 px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-semibold text-foreground">
            Contrôles avant d&apos;envoyer
          </p>
          <ul className="mt-2 space-y-1.5">
            {lockIssues.map((issue) => (
              <li key={`${issue.focus.kind}-${issue.message}`}>
                <button
                  type="button"
                  className="min-h-9 text-left text-sm text-destructive underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => handleIssueClick(issue)}
                >
                  {issue.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,16rem)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <section
            ref={agendaListRef as React.RefObject<HTMLElement>}
            aria-labelledby="prepare-odj-title"
            className="min-w-0"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3
                id="prepare-odj-title"
                className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Ordre du jour
              </h3>
              {editable ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-[color:var(--brand-gold-700)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={adding}
                  onClick={() => void addPoint()}
                >
                  <Plus className="size-4" aria-hidden />
                  Ajouter un point
                </button>
              ) : null}
            </div>

            {sortedItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/80 px-4 py-6 text-sm text-muted-foreground">
                Aucun point — ajoutez au moins une ligne.
              </p>
            ) : (
              <ol className="space-y-2">
                {sortedItems.map((item, index) => {
                  const expanded = expandedId === item.id;
                  return (
                    <li
                      key={item.id}
                      ref={(el) => {
                        if (el) rowRefs.current.set(item.id, el);
                        else rowRefs.current.delete(item.id);
                      }}
                      className="rounded-[var(--radius-md)] border border-border/70 bg-card"
                    >
                      <div className="flex items-center gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-3">
                        {editable ? (
                          <>
                            <span
                              className="hidden text-muted-foreground sm:inline"
                              aria-hidden
                            >
                              <GripVertical className="size-4" />
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 shrink-0"
                              aria-label={`Monter le point ${index + 1}`}
                              disabled={index === 0}
                              onClick={() => void moveItem(index, -1)}
                            >
                              <ChevronUp className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 shrink-0"
                              aria-label={`Descendre le point ${index + 1}`}
                              disabled={index === sortedItems.length - 1}
                              onClick={() => void moveItem(index, 1)}
                            >
                              <ChevronDown className="size-3.5" />
                            </Button>
                          </>
                        ) : null}
                        <span
                          className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)]/15 text-xs font-semibold tabular-nums"
                          aria-hidden
                        >
                          {index + 1}
                        </span>
                        <Input
                          id={`odj-title-${item.id}`}
                          data-prepare-field="title"
                          key={`${item.id}-t-${item.title}`}
                          defaultValue={item.title ?? ''}
                          disabled={!editable}
                          placeholder="Intitulé du point"
                          className="h-10 min-w-0 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                          onFocus={() => setExpandedId(item.id)}
                          onBlur={(e) => {
                            const next = e.target.value.trim();
                            if (next === (item.title ?? '').trim()) return;
                            void patchItem(item, {
                              title: next || 'Point sans titre',
                            });
                          }}
                        />
                        <div className="flex shrink-0 items-center gap-1">
                          <Input
                            id={`odj-dur-${item.id}`}
                            data-prepare-field="duration"
                            type="number"
                            min={1}
                            inputMode="numeric"
                            disabled={!editable}
                            className="h-9 w-14 tabular-nums"
                            key={`${item.id}-d-${item.plannedDurationMinutes}`}
                            defaultValue={
                              item.plannedDurationMinutes != null &&
                              item.plannedDurationMinutes > 0
                                ? String(item.plannedDurationMinutes)
                                : String(DEFAULT_POINT_MINUTES)
                            }
                            aria-label={`Durée du point ${index + 1} en minutes`}
                            onBlur={(e) => {
                              const raw = e.target.value.trim();
                              const n = raw ? Number(raw) : DEFAULT_POINT_MINUTES;
                              const next =
                                Number.isFinite(n) && n > 0
                                  ? Math.round(n)
                                  : DEFAULT_POINT_MINUTES;
                              if (next === item.plannedDurationMinutes) return;
                              void patchItem(item, {
                                plannedDurationMinutes: next,
                              });
                            }}
                          />
                          <span className="text-xs text-muted-foreground">
                            min
                          </span>
                        </div>
                        {editable ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-9 shrink-0 text-muted-foreground"
                            aria-label={`Supprimer ${displayLabel(item.title, `point ${index + 1}`)}`}
                            onClick={() => void removePoint(item)}
                          >
                            <X className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                      {expanded && editable ? (
                        <div className="grid gap-2 border-t border-border/60 px-3 py-2 sm:grid-cols-2">
                          <div>
                            <label
                              className="mb-1 block text-xs text-muted-foreground"
                              htmlFor={`odj-type-${item.id}`}
                            >
                              Nature
                            </label>
                            <select
                              id={`odj-type-${item.id}`}
                              data-prepare-field="type"
                              className="starium-form-select min-h-10 w-full"
                              value={item.itemType}
                              onChange={(e) => {
                                void patchItem(item, {
                                  itemType: e.target
                                    .value as ProjectReviewAgendaItemType,
                                });
                              }}
                            >
                              {PREPARE_ITEM_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {PROJECT_REVIEW_AGENDA_ITEM_TYPE_LABEL[t]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label
                              className="mb-1 block text-xs text-muted-foreground"
                              htmlFor={`odj-owner-${item.id}`}
                            >
                              Porteur
                            </label>
                            <select
                              id={`odj-owner-${item.id}`}
                              data-prepare-field="owner"
                              className="starium-form-select min-h-10 w-full"
                              value={item.ownerUserId ?? ''}
                              onChange={(e) => {
                                void patchItem(item, {
                                  ownerUserId: e.target.value.trim() || null,
                                });
                              }}
                            >
                              <option value="">Non désigné</option>
                              {(assignable.data?.users ?? []).map((u) => (
                                <option key={u.id} value={u.id}>
                                  {displayNameFromUser(u)}
                                </option>
                              ))}
                              {item.ownerUserId &&
                              item.ownerDisplayName &&
                              !(assignable.data?.users ?? []).some(
                                (u) => u.id === item.ownerUserId,
                              ) ? (
                                <option value={item.ownerUserId}>
                                  {displayLabel(
                                    item.ownerDisplayName,
                                    'Porteur',
                                  )}
                                </option>
                              ) : null}
                            </select>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section aria-labelledby="prepare-supports-title">
            <h3
              id="prepare-supports-title"
              className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Supports de séance
            </h3>
            <ReviewAttachmentsSection
              projectId={projectId}
              reviewId={detail.id}
              status={detail.status}
              attachments={detail.attachments ?? []}
              agendaItems={detail.agendaItems ?? []}
              decisions={(detail.decisions ?? []) as ProjectReviewDecisionApi[]}
              actionItems={detail.actionItems ?? []}
              canEdit={editable}
            />
          </section>

          <section aria-labelledby="prepare-arbitrate-title">
            <h3
              id="prepare-arbitrate-title"
              className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Points à arbitrer
            </h3>
            {arbitrationItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun point de nature décision ou arbitrage.
              </p>
            ) : (
              <ul className="space-y-2">
                {arbitrationItems.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2 text-sm"
                  >
                    <button
                      type="button"
                      className="min-h-9 w-full text-left font-medium text-foreground hover:underline"
                      onClick={() => focusItem(item.id, 'owner')}
                    >
                      {displayLabel(item.title, 'Point sans titre')}
                    </button>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {PROJECT_REVIEW_AGENDA_ITEM_TYPE_LABEL[item.itemType]}
                      {' · '}
                      {displayLabel(item.ownerDisplayName, 'Porteur à désigner')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div ref={participantsRef as React.RefObject<HTMLDivElement>}>
            <ReviewParticipantsSection
              projectId={projectId}
              reviewId={detail.id}
              status={detail.status}
              participants={detail.participants ?? []}
              canEdit={canEdit && !agendaLocked}
            />
          </div>
        </div>

        <aside className="rounded-[var(--radius-lg)] border border-[color:var(--brand-gold)]/35 bg-[color:var(--brand-gold)]/10 p-3 sm:p-4">
          <ReviewPreviousOpenActions
            actions={previousActions}
            loading={previousLoading}
            error={previousError}
            canResume={editable}
            resumedTitles={sortedItems.map((row) => row.title)}
            emptyMessage="Aucun élément à reprendre — c'est la première séance de cette série."
            onResume={onResumeAction}
          />
        </aside>
      </div>
    </div>
  );
}

export function prepareLockIssuesFromDetail(
  detail: ProjectReviewDetail,
): PrepareLockIssue[] {
  return collectPrepareLockIssues({
    agendaItems: (detail.agendaItems ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      itemType: item.itemType,
      plannedDurationMinutes: item.plannedDurationMinutes,
      ownerUserId: item.ownerUserId,
    })),
    participantCount: (detail.participants ?? []).length,
    sessionDurationMinutes: detail.durationMinutes,
    attachments: (detail.attachments ?? []).map(
      (a: ProjectReviewAttachmentApi) => ({
        agendaItemId: a.agendaItemId,
      }),
    ),
  });
}
