'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PROJECT_REVIEW_AGENDA_ITEM_STATUS_LABEL,
  PROJECT_REVIEW_AGENDA_ITEM_TYPE_LABEL,
  PROJECT_REVIEW_MEETING_MODE_LABEL,
} from '../constants/project-enum-labels';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import {
  findNextOpenAgendaItemId,
  pickPreferredAgendaItemId,
  reviewAgendaConductProgress,
  sortReviewAgendaItems,
} from '../lib/review-agenda-utils';
import {
  isReviewAgendaConductEditable,
  isReviewAgendaEditable,
  isReviewFinalizedOrCancelled,
} from '../lib/project-review-status';
import type {
  ProjectReviewAgendaItemApi,
  ProjectReviewAgendaItemType,
  ProjectReviewAttachmentApi,
  ProjectReviewDecisionApi,
  ProjectReviewActionItemApi,
  ProjectReviewDetail,
  ProjectReviewMeetingMode,
  ProjectReviewStatus,
} from '../types/project.types';
import type { ReviewActionFormRow } from './review-actions-section';
import type { ReviewDecisionFormRow } from './review-decisions-section';
import {
  ReviewAgendaAddActionModal,
  ReviewAgendaAddAttachmentModal,
  ReviewAgendaAddDecisionModal,
  ReviewAgendaPointOutputs,
  type ReviewAgendaQuickAddKind,
} from './review-agenda-point-modals';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ListOrdered,
  Play,
  SkipForward,
  Square,
  Video,
} from 'lucide-react';

type Props = {
  projectId: string;
  reviewId: string;
  status: ProjectReviewStatus;
  agendaItems: ProjectReviewAgendaItemApi[];
  canEdit: boolean;
  reviewDecisions?: ProjectReviewDecisionApi[];
  reviewActions?: ProjectReviewActionItemApi[];
  reviewAttachments?: ProjectReviewAttachmentApi[];
  onAddDecision?: (row: ReviewDecisionFormRow) => void;
  onAddAction?: (row: ReviewActionFormRow) => void;
};

function agendaItemStatusClass(status: ProjectReviewAgendaItemApi['status']): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'border-[color:var(--brand-gold-700)] bg-[color:color-mix(in_srgb,var(--brand-gold-700)_12%,transparent)] text-[color:var(--brand-gold-700)]';
    case 'DONE':
      return 'border-[color:var(--state-success)] bg-[color:var(--state-success-bg)] text-[color:var(--state-success)]';
    case 'SKIPPED':
      return 'border-border/60 bg-muted/30 text-muted-foreground';
    default:
      return 'border-border/70 bg-background text-foreground';
  }
}

function agendaStatusBadgeClass(status: ProjectReviewAgendaItemApi['status']): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'starium-ds-badge--warn';
    case 'DONE':
      return 'starium-ds-badge--success';
    case 'SKIPPED':
      return 'starium-ds-badge--neutral';
    default:
      return 'starium-ds-badge--neutral';
  }
}

function AgendaItemNumberBadge({
  number,
  status,
  selected,
  compact = false,
}: {
  number: number;
  status: ProjectReviewAgendaItemApi['status'];
  selected: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border font-semibold tabular-nums',
        compact ? 'size-6 text-xs' : 'size-8 text-sm',
        agendaItemStatusClass(status),
        selected && status !== 'IN_PROGRESS' && 'ring-2 ring-[color:var(--brand-gold-700)]/35',
      )}
      aria-hidden
    >
      {status === 'DONE' ? <CheckCircle2 className={compact ? 'size-3.5' : 'size-4'} /> : number}
    </span>
  );
}

export function ReviewAgendaSection({
  projectId,
  reviewId,
  status,
  agendaItems,
  canEdit,
  reviewDecisions = [],
  reviewActions = [],
  reviewAttachments = [],
  onAddDecision,
  onAddAction,
}: Props) {
  const {
    createAgendaItem,
    updateAgendaItem,
    reorderAgendaItems,
    startAgendaItem,
    completeAgendaItem,
    skipAgendaItem,
  } = useProjectReviewMutations(projectId);

  const [newTitle, setNewTitle] = useState('');
  const [newItemType, setNewItemType] = useState<ProjectReviewAgendaItemType>('INFORMATION');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [decisionSummary, setDecisionSummary] = useState('');
  const [objective, setObjective] = useState('');
  const [expectedDecision, setExpectedDecision] = useState('');
  const [quickAddKind, setQuickAddKind] = useState<ReviewAgendaQuickAddKind | null>(null);

  const sortedItems = useMemo(() => sortReviewAgendaItems(agendaItems), [agendaItems]);
  const progress = useMemo(() => reviewAgendaConductProgress(agendaItems), [agendaItems]);

  const agendaEditable = canEdit && isReviewAgendaEditable(status);
  const conductEditable = canEdit && isReviewAgendaConductEditable(status);
  const readOnly = isReviewFinalizedOrCancelled(status);

  const selected = sortedItems.find((i) => i.id === selectedId) ?? null;
  const selectedIndex = selected ? sortedItems.findIndex((i) => i.id === selected.id) : -1;

  const selectItem = useCallback((item: ProjectReviewAgendaItemApi) => {
    setSelectedId(item.id);
    setNotes(item.notes ?? '');
    setDecisionSummary(item.decisionSummary ?? '');
    setObjective(item.objective ?? '');
    setExpectedDecision(item.expectedDecision ?? '');
  }, []);

  useEffect(() => {
    if (sortedItems.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId && sortedItems.some((i) => i.id === selectedId)) return;
    const preferredId = pickPreferredAgendaItemId(sortedItems);
    const preferred = sortedItems.find((i) => i.id === preferredId);
    if (preferred) selectItem(preferred);
  }, [sortedItems, selectedId, selectItem]);

  const onAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    try {
      await createAgendaItem.mutateAsync({
        reviewId,
        body: { title, itemType: newItemType },
      });
      setNewTitle('');
    } catch {
      toast.error('Impossible d’ajouter le point.');
    }
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sortedItems.length) return;
    const items = [...sortedItems];
    [items[index], items[target]] = [items[target], items[index]];
    try {
      await reorderAgendaItems.mutateAsync({
        reviewId,
        items: items.map((item, orderIndex) => ({ id: item.id, orderIndex })),
      });
    } catch {
      toast.error('Réordonnancement impossible.');
    }
  };

  const saveConductFields = async () => {
    if (!selected || !conductEditable) return;
    try {
      await updateAgendaItem.mutateAsync({
        reviewId,
        agendaItemId: selected.id,
        body: {
          notes: notes.trim() || null,
          decisionSummary: decisionSummary.trim() || null,
          objective: objective.trim() || null,
          expectedDecision: expectedDecision.trim() || null,
        },
      });
    } catch {
      toast.error('Enregistrement impossible.');
    }
  };

  const advanceAfterTransition = (itemId: string) => {
    const nextId = findNextOpenAgendaItemId(sortedItems, itemId);
    if (!nextId) return;
    const next = sortedItems.find((i) => i.id === nextId);
    if (next) selectItem(next);
  };

  const onStartPoint = async (itemId: string) => {
    try {
      await startAgendaItem.mutateAsync({ reviewId, agendaItemId: itemId });
    } catch {
      toast.error('Impossible de démarrer le point.');
    }
  };

  const onCompletePoint = async (itemId: string) => {
    try {
      await completeAgendaItem.mutateAsync({ reviewId, agendaItemId: itemId });
      advanceAfterTransition(itemId);
    } catch {
      toast.error('Impossible de clôturer le point.');
    }
  };

  const onSkipPoint = async (itemId: string) => {
    try {
      await skipAgendaItem.mutateAsync({ reviewId, agendaItemId: itemId });
      advanceAfterTransition(itemId);
    } catch {
      toast.error('Impossible de reporter le point.');
    }
  };

  const goToRelativePoint = (direction: -1 | 1) => {
    if (selectedIndex < 0) return;
    const target = selectedIndex + direction;
    if (target < 0 || target >= sortedItems.length) return;
    selectItem(sortedItems[target]);
  };

  const conductLayout = isReviewAgendaConductEditable(status);
  const progressPct =
    progress.total > 0 ? Math.round((progress.treated / progress.total) * 100) : 0;

  const renderConductWorkspace = () => {
    if (!selected) return null;

    const pointDecisions = reviewDecisions.filter((dec) => dec.agendaItemId === selected.id);
    const pointActions = reviewActions.filter((act) => act.agendaItemId === selected.id);
    const pointAttachments = reviewAttachments.filter((att) => att.agendaItemId === selected.id);
    const agendaPointContext = {
      id: selected.id,
      title: selected.title,
      itemType: selected.itemType,
      decisionSummary,
      expectedDecision,
    };

    return (
      <article
        className="rounded-xl border border-border/70 bg-card shadow-[var(--ds-card-shadow)]"
        aria-labelledby="conduct-agenda-point-title"
      >
        <header className="shrink-0 border-b border-border/60 bg-muted/15 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Point n° {selectedIndex + 1} sur {sortedItems.length}
              </p>
              <h4
                id="conduct-agenda-point-title"
                className="mt-1 text-lg font-semibold leading-snug text-foreground sm:text-xl"
              >
                {selected.title}
              </h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="starium-ds-badge starium-ds-badge--neutral">
                  {PROJECT_REVIEW_AGENDA_ITEM_TYPE_LABEL[selected.itemType] ?? selected.itemType}
                </span>
                <span className={cn('starium-ds-badge', agendaStatusBadgeClass(selected.status))}>
                  {PROJECT_REVIEW_AGENDA_ITEM_STATUS_LABEL[selected.status] ?? selected.status}
                </span>
                {selected.plannedDurationMinutes ? (
                  <span className="starium-ds-badge starium-ds-badge--neutral">
                    {selected.plannedDurationMinutes} min
                  </span>
                ) : null}
              </div>
              {selected.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{selected.description}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                aria-label="Point précédent"
                disabled={selectedIndex <= 0}
                onClick={() => goToRelativePoint(-1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                aria-label="Point suivant"
                disabled={selectedIndex >= sortedItems.length - 1}
                onClick={() => goToRelativePoint(1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {conductEditable ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {selected.status === 'TODO' || selected.status === 'SKIPPED' ? (
                <Button
                  type="button"
                  className="min-h-11"
                  onClick={() => void onStartPoint(selected.id)}
                >
                  <Play className="size-4" aria-hidden />
                  Démarrer le point
                </Button>
              ) : null}
              {selected.status === 'IN_PROGRESS' ? (
                <>
                  <Button
                    type="button"
                    className="min-h-11"
                    onClick={() => void onCompletePoint(selected.id)}
                  >
                    <Square className="size-4" aria-hidden />
                    Clôturer le point
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => void onSkipPoint(selected.id)}
                  >
                    <SkipForward className="size-4" aria-hidden />
                    Reporter / non traité
                  </Button>
                </>
              ) : null}
              {selected.status === 'DONE' ? (
                <p className="inline-flex min-h-11 items-center gap-2 text-sm text-[color:var(--state-success)]">
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                  Point traité
                </p>
              ) : null}
            </div>
          ) : null}
        </header>

        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-4">
            <fieldset className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Préparation du point
              </legend>
              <div className="mt-2 grid gap-4 md:grid-cols-2">
                <div className="starium-form-field">
                  <label htmlFor="agenda-objective" className="starium-form-label">
                    Objectif du point
                  </label>
                  <p id="agenda-objective-hint" className="starium-form-hint mb-1.5">
                    Pourquoi ce sujet est à l&apos;ordre du jour.
                  </p>
                  <textarea
                    id="agenda-objective"
                    className="starium-form-textarea min-h-[88px]"
                    value={objective}
                    readOnly={!conductEditable}
                    aria-describedby="agenda-objective-hint"
                    onChange={(e) => setObjective(e.target.value)}
                    onBlur={() => void saveConductFields()}
                  />
                </div>
                <div className="starium-form-field">
                  <label htmlFor="agenda-expected" className="starium-form-label">
                    Question à trancher
                  </label>
                  <p id="agenda-expected-hint" className="starium-form-hint mb-1.5">
                    Formulation de la décision recherchée — préparée avant la séance, pas l&apos;acte formalisé.
                  </p>
                  <textarea
                    id="agenda-expected"
                    className="starium-form-textarea min-h-[88px]"
                    value={expectedDecision}
                    readOnly={!conductEditable}
                    aria-describedby="agenda-expected-hint"
                    onChange={(e) => setExpectedDecision(e.target.value)}
                    onBlur={() => void saveConductFields()}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-lg border border-border/70 px-4 py-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                Tenue du point
              </legend>
              <div className="mt-2 grid gap-4">
                <div className="starium-form-field">
                  <label htmlFor="agenda-notes" className="starium-form-label">
                    Compte-rendu de l&apos;échange
                  </label>
                  <p id="agenda-notes-hint" className="starium-form-hint mb-1.5">
                    Notes prises pendant la discussion (contexte, arguments, participants).
                  </p>
                  <textarea
                    id="agenda-notes"
                    className="starium-form-textarea min-h-[96px]"
                    value={notes}
                    readOnly={!conductEditable}
                    aria-describedby="agenda-notes-hint"
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() => void saveConductFields()}
                  />
                </div>
                <div className="starium-form-field">
                  <label htmlFor="agenda-decision" className="starium-form-label">
                    Conclusion du point (brouillon)
                  </label>
                  <p id="agenda-decision-hint" className="starium-form-hint mb-1.5">
                    Synthèse rapide en fin de point — complémentaire, pas substitut à une décision formalisée.
                  </p>
                  <textarea
                    id="agenda-decision"
                    className="starium-form-textarea min-h-[96px]"
                    value={decisionSummary}
                    readOnly={!conductEditable}
                    aria-describedby="agenda-decision-hint"
                    onChange={(e) => setDecisionSummary(e.target.value)}
                    onBlur={() => void saveConductFields()}
                  />
                </div>
              </div>
            </fieldset>

            <ReviewAgendaPointOutputs
              conductEditable={conductEditable}
              linkedDecisions={pointDecisions.map((d) => ({ title: d.title }))}
              linkedActions={pointActions.map((a) => ({ title: a.title }))}
              linkedAttachments={pointAttachments.map((a) => ({ title: a.title }))}
              onAddDecision={() => setQuickAddKind('decision')}
              onAddAction={() => setQuickAddKind('action')}
              onAddAttachment={() => setQuickAddKind('attachment')}
            />
          </div>
        </div>

        {quickAddKind === 'decision' && onAddDecision ? (
          <ReviewAgendaAddDecisionModal
            open
            onOpenChange={(open) => {
              if (!open) setQuickAddKind(null);
            }}
            agendaPoint={agendaPointContext}
            onSubmit={onAddDecision}
          />
        ) : null}
        {quickAddKind === 'action' && onAddAction ? (
          <ReviewAgendaAddActionModal
            open
            onOpenChange={(open) => {
              if (!open) setQuickAddKind(null);
            }}
            agendaPoint={agendaPointContext}
            reviewDecisions={reviewDecisions}
            onSubmit={onAddAction}
          />
        ) : null}
        {quickAddKind === 'attachment' ? (
          <ReviewAgendaAddAttachmentModal
            open
            onOpenChange={(open) => {
              if (!open) setQuickAddKind(null);
            }}
            projectId={projectId}
            reviewId={reviewId}
            agendaPoint={agendaPointContext}
          />
        ) : null}
      </article>
    );
  };

  const renderPlanningList = () => (
    <ol className="space-y-2" aria-live="polite">
      {sortedItems.map((item, index) => {
        const isSelected = selectedId === item.id;
        return (
          <li
            key={item.id}
            className={cn(
              'rounded-lg border p-3 transition-colors',
              isSelected ? 'border-primary/50 bg-muted/30' : 'border-border/70 bg-card',
              item.status === 'DONE' && !isSelected && 'opacity-80',
            )}
          >
            <div className="flex items-start gap-3">
              <AgendaItemNumberBadge number={index + 1} status={item.status} selected={isSelected} />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  className="min-h-11 w-full text-left"
                  onClick={() => selectItem(item)}
                >
                  <span
                    className={cn(
                      'font-medium',
                      item.status === 'SKIPPED' && 'text-muted-foreground line-through',
                    )}
                  >
                    {item.title}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    <span className="starium-ds-badge starium-ds-badge--neutral">
                      {PROJECT_REVIEW_AGENDA_ITEM_TYPE_LABEL[item.itemType] ?? item.itemType}
                    </span>
                    <span className={cn('starium-ds-badge', agendaStatusBadgeClass(item.status))}>
                      {PROJECT_REVIEW_AGENDA_ITEM_STATUS_LABEL[item.status] ?? item.status}
                    </span>
                    {item.plannedDurationMinutes ? (
                      <span className="starium-ds-badge starium-ds-badge--neutral">
                        {item.plannedDurationMinutes} min
                      </span>
                    ) : null}
                  </span>
                </button>
                {item.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
              {agendaEditable ? (
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label={`Monter le point ${index + 1}`}
                    disabled={index === 0}
                    onClick={() => void moveItem(index, -1)}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label={`Descendre le point ${index + 1}`}
                    disabled={index === sortedItems.length - 1}
                    onClick={() => void moveItem(index, 1)}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );

  return (
    <section
      className={cn(
        conductLayout ? 'flex flex-col gap-4' : 'starium-form-section border-border/60',
      )}
      aria-labelledby="review-agenda-title"
    >
      {conductLayout ? (
        <>
          <div className="shrink-0 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm sm:px-5 sm:py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 id="review-agenda-title" className="text-sm font-semibold text-foreground">
                  Conduite de l&apos;ordre du jour
                </h3>
                <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
                  Traitez chaque point ci-dessous. Ajoutez décisions, actions ou documents via les boutons du point
                  actif.
                  {' '}
                  {progress.treated}/{progress.total} traité{progress.treated > 1 ? 's' : ''}
                  {progress.currentNumber ? ` · n° ${progress.currentNumber} en cours` : ''}
                </p>
              </div>
              <span className="text-lg font-bold tabular-nums text-[color:var(--brand-gold-700)]">
                {progressPct}%
              </span>
            </div>
            {progress.total > 0 ? (
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Avancement : ${progressPct} pour cent`}
              >
                <div
                  className="h-full rounded-full bg-[color:var(--brand-gold-700)] transition-[width] duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            ) : null}

            <nav
              className="mt-4 -mx-1 overflow-x-auto overscroll-contain px-1 pb-1"
              aria-label="Navigation entre les points de l'ordre du jour"
            >
              <ol className="flex min-w-max gap-2">
                {sortedItems.map((item, index) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={cn(
                          'flex min-h-11 max-w-[14rem] items-center gap-2 rounded-full border px-3 py-2 text-left text-sm transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          isSelected
                            ? 'border-[color:var(--brand-gold-700)] bg-[color:color-mix(in_srgb,var(--brand-gold-700)_10%,transparent)] shadow-sm'
                            : 'border-border/70 bg-background hover:bg-muted/30',
                          item.status === 'DONE' && !isSelected && 'opacity-75',
                        )}
                        aria-current={isSelected ? 'step' : undefined}
                        onClick={() => selectItem(item)}
                      >
                        <AgendaItemNumberBadge
                          number={index + 1}
                          status={item.status}
                          selected={isSelected}
                          compact
                        />
                        <span
                          className={cn(
                            'min-w-0 truncate font-medium',
                            item.status === 'SKIPPED' && 'text-muted-foreground line-through',
                          )}
                        >
                          {item.title}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          {sortedItems.length === 0 ? (
            <p className="starium-form-hint">Aucun point d’ordre du jour.</p>
          ) : (
            renderConductWorkspace()
          )}
        </>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id="review-agenda-title" className="starium-form-section-title mb-0">
                <ListOrdered aria-hidden />
                Ordre du jour
              </h3>
              {sortedItems.length > 0 ? (
                <p className="starium-form-hint mb-0 mt-2">
                  {sortedItems.length} point{sortedItems.length > 1 ? 's' : ''} numéroté
                  {sortedItems.length > 1 ? 's' : ''}
                </p>
              ) : null}
            </div>
          </div>

          {sortedItems.length === 0 ? (
            <p className="starium-form-hint">Aucun point d’ordre du jour.</p>
          ) : (
            renderPlanningList()
          )}
        </>
      )}

      {agendaEditable ? (
        <div className="mt-4 space-y-3 rounded-xl border border-border/70 bg-muted/15 p-4">
          <h4 className="text-sm font-semibold text-foreground">Ajouter un point à l&apos;ordre du jour</h4>
          <div className="flex flex-wrap gap-2">
          <select
            className="starium-form-select min-h-11 w-full sm:w-auto"
            value={newItemType}
            aria-label="Type de point"
            onChange={(e) => setNewItemType(e.target.value as ProjectReviewAgendaItemType)}
          >
            {Object.entries(PROJECT_REVIEW_AGENDA_ITEM_TYPE_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <Input
            className="starium-form-input min-h-11 flex-1"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nouveau point d’ordre du jour"
            aria-label="Titre du point"
          />
          <Button type="button" className="min-h-11" onClick={() => void onAdd()}>
            Ajouter
          </Button>
          </div>
        </div>
      ) : null}

      {readOnly ? (
        <p className="starium-form-hint mt-2">Ordre du jour figé (point terminé ou annulé).</p>
      ) : null}
    </section>
  );
}

export function ReviewMeetingInfoBlock({
  detail,
  embedded = false,
}: {
  detail: Pick<
    ProjectReviewDetail,
    'meetingMode' | 'meetingUrl' | 'location' | 'startedAt' | 'startedByDisplayName'
  >;
  embedded?: boolean;
}) {
  if (!detail.meetingMode && !detail.location && !detail.meetingUrl) return null;

  const modeLabel = detail.meetingMode
    ? PROJECT_REVIEW_MEETING_MODE_LABEL[detail.meetingMode] ?? detail.meetingMode
    : null;

  const body = (
    <div className="text-sm">
      {modeLabel ? (
        <p className="text-muted-foreground">
          Format : <span className="font-medium text-foreground">{modeLabel}</span>
        </p>
      ) : null}
      {detail.location ? (
        <p className="mt-1 text-muted-foreground">
          Lieu : <span className="font-medium text-foreground">{detail.location}</span>
        </p>
      ) : null}
      {detail.meetingUrl ? (
        <p className="mt-2">
          <a
            href={detail.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="starium-link inline-flex min-h-11 items-center font-medium"
          >
            Rejoindre la réunion
          </a>
        </p>
      ) : null}
      {detail.startedAt ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Démarrée le {new Date(detail.startedAt).toLocaleString('fr-FR')}
          {detail.startedByDisplayName ? ` par ${detail.startedByDisplayName}` : ''}
        </p>
      ) : null}
    </div>
  );

  if (embedded) return body;

  return (
    <section className="starium-form-section border-border/60" aria-labelledby="review-meeting-info">
      <h3 id="review-meeting-info" className="starium-form-section-title">
        <Video className="size-3.5" aria-hidden />
        Infos réunion
      </h3>
      {body}
    </section>
  );
}

export type { ProjectReviewMeetingMode };
