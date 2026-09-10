'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Mic,
  Scale,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  PROJECT_REVIEW_AGENDA_ITEM_TYPE_LABEL,
  PROJECT_REVIEW_MEETING_MODE_LABEL,
} from '../constants/project-enum-labels';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import {
  findNextOpenAgendaItemId,
  pickPreferredAgendaItemId,
  reviewAgendaConductProgress,
  sortReviewAgendaItems,
} from '../lib/review-agenda-utils';
import { presentCount } from '../lib/review-attendance';
import type {
  ProjectReviewAgendaItemApi,
  ProjectReviewAgendaItemType,
  ProjectReviewDecisionStatus,
  ProjectReviewDecisionType,
  ProjectReviewDetail,
} from '../types/project.types';
import { emptyActionRow, type ReviewActionFormRow } from './review-actions-section';
import { emptyDecisionRow, type ReviewDecisionFormRow } from './review-decisions-section';
import { ProjectDatetimeLocalInput } from './project-datetime-local-input';

type PointMode = 'presentation' | 'decision';

type Props = {
  projectId: string;
  detail: ProjectReviewDetail;
  reviewTypeLabel: string;
  canEdit: boolean;
  formDecisions: ReviewDecisionFormRow[];
  formActions: ReviewActionFormRow[];
  onAppendDecision: (row: ReviewDecisionFormRow) => void;
  onAppendAction: (row: ReviewActionFormRow) => void;
  onUpdateDecision: (index: number, row: ReviewDecisionFormRow) => void;
  onUpdateAction: (index: number, row: ReviewActionFormRow) => void;
  onRemoveDecision: (index: number) => void;
  onRemoveAction: (index: number) => void;
  selectedAgendaItemId: string | null;
  onSelectedAgendaItemIdChange: (id: string | null) => void;
  onSuspend: () => void;
  onRequestCloseReport: () => void;
  finalizePending?: boolean;
};

function formatElapsed(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatReviewDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

function meetingPlaceLabel(detail: ProjectReviewDetail): string {
  const location = detail.location?.trim();
  if (location) return location;
  if (detail.meetingUrl?.trim()) return 'Teams';
  if (detail.meetingMode) {
    return (
      PROJECT_REVIEW_MEETING_MODE_LABEL[detail.meetingMode] ?? detail.meetingMode
    );
  }
  return 'Lieu non renseigné';
}

function shortAgendaTypeBadge(itemType: ProjectReviewAgendaItemType): 'INFO' | 'DÉC' {
  switch (itemType) {
    case 'DECISION':
    case 'ARBITRATION':
    case 'BUDGET':
      return 'DÉC';
    default:
      return 'INFO';
  }
}

function defaultDecisionTypeForAgenda(
  itemType: ProjectReviewAgendaItemType,
): ProjectReviewDecisionType {
  switch (itemType) {
    case 'ARBITRATION':
      return 'ARBITRATION';
    case 'BUDGET':
      return 'BUDGET_VALIDATION';
    case 'RISK':
      return 'RISK_ACCEPTANCE';
    default:
      return 'OTHER';
  }
}

function parseNoteLines(notes: string | null | undefined): string[] {
  if (!notes?.trim()) return [];
  return notes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinNoteLines(lines: string[]): string | null {
  const cleaned = lines.map((l) => l.trim()).filter(Boolean);
  return cleaned.length ? cleaned.join('\n') : null;
}

function defaultModeForItem(item: ProjectReviewAgendaItemApi | null): PointMode {
  if (!item) return 'presentation';
  return shortAgendaTypeBadge(item.itemType) === 'DÉC' ? 'decision' : 'presentation';
}

export function ProjectReviewAnimateSession({
  projectId,
  detail,
  reviewTypeLabel,
  canEdit,
  formDecisions,
  formActions,
  onAppendDecision,
  onAppendAction,
  onRemoveDecision,
  onRemoveAction,
  selectedAgendaItemId,
  onSelectedAgendaItemIdChange,
  onSuspend,
  onRequestCloseReport,
  finalizePending = false,
}: Props) {
  const {
    updateParticipant,
    updateAgendaItem,
    createAttachment,
    startAgendaItem,
    completeAgendaItem,
  } = useProjectReviewMutations(projectId);
  const assignable = useProjectAssignableUsers({ enabled: canEdit });

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pointMode, setPointMode] = useState<PointMode>('presentation');
  const [noteDraft, setNoteDraft] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [decTitle, setDecTitle] = useState('');
  const [arbTitle, setArbTitle] = useState('');
  const [arbOutcome, setArbOutcome] =
    useState<ProjectReviewDecisionStatus>('VALIDATED');
  const [actTitle, setActTitle] = useState('');
  const [actPriority, setActPriority] = useState('MEDIUM');
  const [actDue, setActDue] = useState('');
  const [actResponsible, setActResponsible] = useState('');
  const [riskDraft, setRiskDraft] = useState('');

  const agendaItems = useMemo(
    () => sortReviewAgendaItems(detail.agendaItems ?? []),
    [detail.agendaItems],
  );
  const participants = detail.participants ?? [];
  const attachments = detail.attachments ?? [];
  const progress = reviewAgendaConductProgress(agendaItems);
  const present = presentCount(participants);
  const totalParticipants = participants.length;

  const selectedId = useMemo(() => {
    if (selectedAgendaItemId && agendaItems.some((i) => i.id === selectedAgendaItemId)) {
      return selectedAgendaItemId;
    }
    return pickPreferredAgendaItemId(agendaItems);
  }, [agendaItems, selectedAgendaItemId]);

  const selected = agendaItems.find((i) => i.id === selectedId) ?? null;
  const selectedIndex = selected ? agendaItems.findIndex((i) => i.id === selected.id) : -1;

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    if (selectedAgendaItemId !== selectedId) {
      onSelectedAgendaItemIdChange(selectedId);
    }
  }, [selectedId, selectedAgendaItemId, onSelectedAgendaItemIdChange]);

  useEffect(() => {
    setPointMode(defaultModeForItem(selected));
    setNoteDraft('');
    setDocUrl('');
    setDecTitle('');
    setArbTitle('');
    setArbOutcome('VALIDATED');
    setActTitle('');
    setActPriority('MEDIUM');
    setActDue('');
    setActResponsible('');
    setRiskDraft('');
  }, [selected?.id, selected?.itemType]);

  const subtitle = useMemo(() => {
    const titleOrDate =
      detail.title?.trim() ||
      (detail.reviewDate ? formatReviewDateTime(detail.reviewDate) : 'Sans titre');
    return `${reviewTypeLabel} — ${titleOrDate} · ${meetingPlaceLabel(detail)}`;
  }, [detail, reviewTypeLabel]);

  const noteLines = parseNoteLines(selected?.notes);
  const riskLines = noteLines.filter((line) => /^risque\s*:/i.test(line));
  const pointAttachments = attachments.filter((a) => a.agendaItemId === selected?.id);
  const linkedDecisions = useMemo(
    () =>
      formDecisions
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.agendaItemId === selected?.id),
    [formDecisions, selected?.id],
  );
  const linkedArbitrations = useMemo(
    () => linkedDecisions.filter(({ row }) => row.decisionType === 'ARBITRATION'),
    [linkedDecisions],
  );
  const linkedPlainDecisions = useMemo(
    () => linkedDecisions.filter(({ row }) => row.decisionType !== 'ARBITRATION'),
    [linkedDecisions],
  );
  const linkedActions = useMemo(
    () =>
      formActions
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.agendaItemId === selected?.id),
    [formActions, selected?.id],
  );

  const selectAgendaItem = async (item: ProjectReviewAgendaItemApi) => {
    onSelectedAgendaItemIdChange(item.id);
    if (!canEdit) return;
    if (item.status === 'TODO') {
      try {
        await startAgendaItem.mutateAsync({
          reviewId: detail.id,
          agendaItemId: item.id,
        });
      } catch {
        toast.error('Impossible de démarrer le point.');
      }
    }
  };

  const onTogglePresence = async (participantId: string, presentNow: boolean) => {
    if (!canEdit) return;
    try {
      await updateParticipant.mutateAsync({
        reviewId: detail.id,
        participantId,
        body: { attendanceStatus: presentNow ? 'PRESENT' : 'EXPECTED' },
      });
    } catch {
      toast.error('Impossible de mettre à jour la présence.');
    }
  };

  const onAppendNote = async () => {
    if (!selected || !canEdit) return;
    const line = noteDraft.trim();
    if (!line) {
      toast.error('Saisissez une note avant d’ajouter.');
      return;
    }
    const next = joinNoteLines([...noteLines, line]);
    try {
      await updateAgendaItem.mutateAsync({
        reviewId: detail.id,
        agendaItemId: selected.id,
        body: { notes: next },
      });
      setNoteDraft('');
      toast.success('Note ajoutée.');
    } catch {
      toast.error('Impossible d’enregistrer la note.');
    }
  };

  const onLinkDocument = async () => {
    if (!selected || !canEdit) return;
    const url = docUrl.trim();
    if (!url) {
      toast.error('Saisissez une URL.');
      return;
    }
    let title = url;
    try {
      title = new URL(url).hostname || url;
    } catch {
      /* keep raw url as title */
    }
    try {
      await createAttachment.mutateAsync({
        reviewId: detail.id,
        body: {
          attachmentType: 'URL',
          title,
          url,
          agendaItemId: selected.id,
        },
      });
      setDocUrl('');
      toast.success('Document lié au point.');
    } catch {
      toast.error('Impossible de lier le document.');
    }
  };

  const onCompletePoint = async () => {
    if (!selected || !canEdit) return;
    try {
      await completeAgendaItem.mutateAsync({
        reviewId: detail.id,
        agendaItemId: selected.id,
      });
      const nextId = findNextOpenAgendaItemId(agendaItems, selected.id);
      if (nextId) onSelectedAgendaItemIdChange(nextId);
      toast.success('Point clôturé.');
    } catch {
      toast.error('Impossible de clôturer le point.');
    }
  };

  const submitDecision = () => {
    if (!selected || !canEdit) return;
    const title = decTitle.trim();
    if (!title) {
      toast.error('Formulez la décision avant d’acter.');
      return;
    }
    onAppendDecision({
      ...emptyDecisionRow(),
      title,
      decisionType: defaultDecisionTypeForAgenda(selected.itemType),
      status: 'VALIDATED',
      agendaItemId: selected.id,
    });
    setDecTitle('');
    toast.success('Décision actée.');
  };

  const submitArbitration = () => {
    if (!selected || !canEdit) return;
    const title = arbTitle.trim();
    if (!title) {
      toast.error('Indiquez l’objet de l’arbitrage.');
      return;
    }
    onAppendDecision({
      ...emptyDecisionRow(),
      title,
      decisionType: 'ARBITRATION',
      status: arbOutcome,
      agendaItemId: selected.id,
    });
    setArbTitle('');
    setArbOutcome('VALIDATED');
    toast.success('Arbitrage tranché.');
  };

  const submitAction = () => {
    if (!selected || !canEdit) return;
    const title = actTitle.trim();
    if (!title) {
      toast.error('Décrivez l’action avant d’assigner.');
      return;
    }
    onAppendAction({
      ...emptyActionRow(),
      title,
      priority: actPriority,
      dueDate: actDue,
      responsibleUserId: actResponsible,
      agendaItemId: selected.id,
    });
    setActTitle('');
    setActPriority('MEDIUM');
    setActDue('');
    setActResponsible('');
    toast.success('Action assignée.');
  };

  const submitRisk = async () => {
    if (!selected || !canEdit) return;
    const line = riskDraft.trim();
    if (!line) {
      toast.error('Décrivez le risque avant de consigner.');
      return;
    }
    const entry = line.match(/^risque\s*:/i) ? line : `Risque : ${line}`;
    const next = joinNoteLines([...noteLines, entry]);
    try {
      await updateAgendaItem.mutateAsync({
        reviewId: detail.id,
        agendaItemId: selected.id,
        body: { notes: next },
      });
      setRiskDraft('');
      toast.success('Risque consigné.');
    } catch {
      toast.error('Impossible de consigner le risque.');
    }
  };

  const goldBtnClass =
    'min-h-11 shrink-0 bg-[color:var(--brand-gold)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-gold-600)]';

  const pointNumber = selectedIndex >= 0 ? selectedIndex + 1 : 0;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border/70 bg-card px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-gold-100)] text-[color:var(--brand-gold-700)]"
            aria-hidden
          >
            <Mic className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Animer la séance
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          aria-label="Fermer"
          onClick={onSuspend}
        >
          <X className="size-5" aria-hidden />
        </Button>
      </header>

      <div
        className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/70 bg-card px-3 py-2.5 sm:px-4"
        aria-live="polite"
      >
        <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[color:var(--state-danger-bg)] px-3 text-xs font-bold uppercase tracking-wide text-[color:var(--state-danger)]">
          <span
            className="size-2 shrink-0 rounded-full bg-[color:var(--state-danger)]"
            aria-hidden
          />
          En séance
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {formatElapsed(elapsedSeconds)}
        </span>
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">
            {present}/{totalParticipants}
          </span>{' '}
          présents
        </span>
        <span className="text-sm text-muted-foreground">
          Point{' '}
          <span className="font-medium text-foreground tabular-nums">
            {progress.currentNumber ?? (pointNumber || '—')}
          </span>
          /{progress.total || '—'}
          {' · '}
          <span className="font-medium text-foreground tabular-nums">{progress.treated}</span>{' '}
          traité{progress.treated > 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-b border-border/70 bg-card p-3 sm:p-4 lg:border-b-0 lg:border-r">
          <section aria-labelledby="animate-presence-title">
            <h2
              id="animate-presence-title"
              className="starium-overline mb-2 text-[color:var(--brand-gold-700)]"
            >
              Présence
            </h2>
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun participant.</p>
            ) : (
              <ul className="space-y-2">
                {participants.map((p) => {
                  const name = displayLabel(p.displayName, 'Participant');
                  const isPresent = p.attendanceStatus === 'PRESENT';
                  return (
                    <li
                      key={p.id}
                      className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/60 px-2.5 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <UserInitialsAvatar displayName={name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{name}</p>
                          {p.roleLabel ? (
                            <p className="truncate text-xs text-muted-foreground">{p.roleLabel}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          {isPresent ? 'Présent' : 'Attendu'}
                        </span>
                        <Switch
                          checked={isPresent}
                          disabled={!canEdit || updateParticipant.isPending}
                          aria-label={
                            isPresent
                              ? `Marquer ${name} comme attendu`
                              : `Marquer ${name} comme présent`
                          }
                          onCheckedChange={(next) => void onTogglePresence(p.id, next)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="animate-agenda-title">
            <h2
              id="animate-agenda-title"
              className="starium-overline mb-2 text-[color:var(--brand-gold-700)]"
            >
              Ordre du jour
            </h2>
            {agendaItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun point à l’ordre du jour.</p>
            ) : (
              <ol className="space-y-1.5">
                {agendaItems.map((item, index) => {
                  const active = item.id === selected?.id;
                  const badge = shortAgendaTypeBadge(item.itemType);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={cn(
                          'flex w-full min-h-11 items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
                          active
                            ? 'border-[color:var(--brand-gold-700)] bg-[color:color-mix(in_srgb,var(--brand-gold)_14%,transparent)]'
                            : 'border-border/70 bg-background/60 hover:bg-muted/40',
                        )}
                        aria-current={active ? 'true' : undefined}
                        onClick={() => void selectAgendaItem(item)}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                            active
                              ? 'bg-[color:var(--brand-gold)] text-[color:var(--brand-ink)]'
                              : 'bg-muted text-foreground',
                          )}
                          aria-hidden
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium leading-snug text-foreground">
                            {displayLabel(item.title, 'Sujet sans titre')}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                'rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide',
                                badge === 'DÉC'
                                  ? 'bg-[color:var(--brand-gold-100)] text-[color:var(--brand-gold-700)]'
                                  : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {badge}
                            </span>
                            {item.plannedDurationMinutes ? (
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {item.plannedDurationMinutes} min
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </aside>

        <main className="flex min-h-0 flex-col overflow-hidden bg-background">
          {selected ? (
            <>
              <div className="shrink-0 border-b border-border/70 bg-card px-3 py-3 sm:px-5 sm:py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                      Point {pointNumber} — {displayLabel(selected.title, 'Sujet sans titre')}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.plannedDurationMinutes
                        ? `${selected.plannedDurationMinutes} min`
                        : 'Durée libre'}
                      {' · '}
                      {displayLabel(
                        PROJECT_REVIEW_AGENDA_ITEM_TYPE_LABEL[selected.itemType],
                        'Type',
                      )}
                    </p>
                  </div>
                  {canEdit && selected.status === 'IN_PROGRESS' ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => void onCompletePoint()}
                      disabled={completeAgendaItem.isPending}
                    >
                      <CheckCircle2 className="size-4" aria-hidden />
                      Clôturer le point
                    </Button>
                  ) : null}
                </div>

                <div
                  className="starium-tab-group mt-4 w-full max-w-md"
                  role="group"
                  aria-label="Mode de conduite du point"
                >
                  <button
                    type="button"
                    className={cn(
                      'starium-tab-btn min-h-11 flex-1 justify-center',
                      pointMode === 'presentation' &&
                        '!bg-[color:var(--brand-gold)] !text-[color:var(--brand-ink)]',
                    )}
                    aria-pressed={pointMode === 'presentation'}
                    onClick={() => setPointMode('presentation')}
                  >
                    Présentation / info
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'starium-tab-btn min-h-11 flex-1 justify-center',
                      pointMode === 'decision' &&
                        '!bg-[color:var(--brand-gold)] !text-[color:var(--brand-ink)]',
                    )}
                    aria-pressed={pointMode === 'decision'}
                    onClick={() => setPointMode('decision')}
                  >
                    Décision / arbitrage
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
                {pointMode === 'presentation' ? (
                  <div className="mx-auto flex max-w-3xl flex-col gap-6">
                    <section aria-labelledby="animate-notes-title">
                      <h3
                        id="animate-notes-title"
                        className="starium-overline text-[color:var(--brand-gold-700)]"
                      >
                        Relevé de présentation
                      </h3>
                      {canEdit ? (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                          <div className="starium-form-field min-w-0 flex-1">
                            <Label htmlFor="animate-note-input">Nouvelle note</Label>
                            <Input
                              id="animate-note-input"
                              className="starium-form-input min-h-11"
                              value={noteDraft}
                              placeholder="Point clé, chiffre, remarque…"
                              onChange={(e) => setNoteDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void onAppendNote();
                                }
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            className="min-h-11 bg-[color:var(--brand-gold)] text-[color:var(--brand-ink)] hover:bg-[color:var(--brand-gold-600)]"
                            onClick={() => void onAppendNote()}
                            disabled={updateAgendaItem.isPending}
                          >
                            Noter
                          </Button>
                        </div>
                      ) : null}
                      {noteLines.length === 0 ? (
                        <div className="mt-3">
                          <EmptyState
                            className="px-3 py-6"
                            title="Aucune note"
                            description="Les points marquants de la présentation apparaîtront ici."
                          />
                        </div>
                      ) : (
                        <ul className="mt-3 space-y-2" aria-live="polite">
                          {noteLines.map((line, i) => (
                            <li
                              key={`${i}-${line.slice(0, 24)}`}
                              className="rounded-lg border border-border/70 bg-card px-3 py-2.5 text-sm text-foreground"
                            >
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section aria-labelledby="animate-docs-title">
                      <h3
                        id="animate-docs-title"
                        className="starium-overline text-[color:var(--brand-gold-700)]"
                      >
                        Documents présentés
                      </h3>
                      {canEdit ? (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                          <div className="starium-form-field min-w-0 flex-1">
                            <Label htmlFor="animate-doc-url">Lien du document</Label>
                            <Input
                              id="animate-doc-url"
                              type="url"
                              className="starium-form-input min-h-11"
                              value={docUrl}
                              placeholder="https://…"
                              onChange={(e) => setDocUrl(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void onLinkDocument();
                                }
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-11"
                            onClick={() => void onLinkDocument()}
                            disabled={createAttachment.isPending}
                          >
                            Lier
                          </Button>
                        </div>
                      ) : null}
                      {pointAttachments.length === 0 ? (
                        <div className="mt-3">
                          <EmptyState
                            className="px-3 py-6"
                            title="Aucun document"
                            description="Liez les supports présentés pendant ce point."
                          />
                        </div>
                      ) : (
                        <ul className="mt-3 space-y-2" aria-live="polite">
                          {pointAttachments.map((att) => {
                            const label = displayLabel(att.title, 'Document');
                            const href = att.url?.trim();
                            return (
                              <li
                                key={att.id}
                                className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border/70 bg-card px-3 py-2"
                              >
                                <span className="truncate text-sm font-medium text-foreground">
                                  {label}
                                </span>
                                {href ? (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="starium-link inline-flex min-h-11 items-center gap-1 text-sm"
                                  >
                                    Ouvrir
                                    <ExternalLink className="size-3.5" aria-hidden />
                                    <span className="sr-only"> (nouvel onglet)</span>
                                  </a>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>

                    {canEdit ? (
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--brand-gold-700)] bg-[color:color-mix(in_srgb,var(--brand-gold)_8%,transparent)] px-4 py-3 text-sm font-semibold text-[color:var(--brand-gold-700)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--brand-gold)_16%,transparent)]"
                        onClick={() => setPointMode('decision')}
                      >
                        <Scale className="size-4 shrink-0" aria-hidden />
                        Cette présentation mène à une décision →
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="mx-auto flex max-w-3xl flex-col gap-5">
                    <button
                      type="button"
                      className="starium-link inline-flex min-h-11 w-fit items-center text-sm font-medium"
                      onClick={() => setPointMode('presentation')}
                    >
                      ← Repasser en présentation
                    </button>

                    {/* DÉCISIONS */}
                    <section
                      className="rounded-xl border border-border/70 bg-card p-4"
                      aria-labelledby="animate-decisions-title"
                    >
                      <h3
                        id="animate-decisions-title"
                        className="starium-overline text-[color:var(--brand-gold-700)]"
                      >
                        Décisions
                      </h3>
                      {canEdit ? (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                          <div className="starium-form-field min-w-0 flex-1">
                            <Label htmlFor="animate-acter-title" className="sr-only">
                              Décision à acter
                            </Label>
                            <Input
                              id="animate-acter-title"
                              className="starium-form-input min-h-11"
                              value={decTitle}
                              placeholder="Formuler une décision actée…"
                              onChange={(e) => setDecTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  submitDecision();
                                }
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            className={goldBtnClass}
                            onClick={submitDecision}
                          >
                            Acter
                          </Button>
                        </div>
                      ) : null}
                      {linkedPlainDecisions.length === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          Aucune décision actée
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-2" aria-live="polite">
                          {linkedPlainDecisions.map(({ row, index }) => (
                            <li
                              key={`acter-${index}`}
                              className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                            >
                              <span className="text-sm font-medium text-foreground">
                                {displayLabel(row.title, 'Décision')}
                              </span>
                              {canEdit ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="min-h-11 text-destructive"
                                  onClick={() => onRemoveDecision(index)}
                                >
                                  Retirer
                                </Button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    {/* ARBITRAGE */}
                    <section
                      className="rounded-xl border border-border/70 bg-card p-4"
                      aria-labelledby="animate-arb-title"
                    >
                      <h3
                        id="animate-arb-title"
                        className="starium-overline text-[color:var(--brand-gold-700)]"
                      >
                        Arbitrage
                      </h3>
                      <div
                        className="starium-tab-group mt-3 w-full max-w-lg"
                        role="radiogroup"
                        aria-label="Issue de l’arbitrage"
                      >
                        {(
                          [
                            {
                              value: 'VALIDATED' as const,
                              label: 'Adopté',
                              activeClass:
                                '!border-[color:var(--state-success)] !bg-[color:var(--state-success-bg)] !text-[color:var(--state-success)]',
                            },
                            {
                              value: 'REJECTED' as const,
                              label: 'Rejeté',
                              activeClass:
                                '!border-[color:var(--state-danger)] !bg-[color:var(--state-danger-bg)] !text-[color:var(--state-danger)]',
                            },
                            {
                              value: 'DRAFT' as const,
                              label: 'Reporté',
                              activeClass:
                                '!border-[color:var(--state-warning)] !bg-[color:var(--state-warning-bg)] !text-[color:var(--state-warning)]',
                            },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={arbOutcome === opt.value}
                            className={cn(
                              'starium-tab-btn min-h-11 flex-1 justify-center',
                              arbOutcome === opt.value && opt.activeClass,
                            )}
                            onClick={() => setArbOutcome(opt.value)}
                            disabled={!canEdit}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {canEdit ? (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                          <div className="starium-form-field min-w-0 flex-1">
                            <Label htmlFor="animate-arb-object" className="sr-only">
                              Objet de l’arbitrage
                            </Label>
                            <Input
                              id="animate-arb-object"
                              className="starium-form-input min-h-11"
                              value={arbTitle}
                              placeholder="Objet de l’arbitrage…"
                              onChange={(e) => setArbTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  submitArbitration();
                                }
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            className={goldBtnClass}
                            onClick={submitArbitration}
                          >
                            Trancher
                          </Button>
                        </div>
                      ) : null}
                      {linkedArbitrations.length === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">Aucun arbitrage</p>
                      ) : (
                        <ul className="mt-3 space-y-2" aria-live="polite">
                          {linkedArbitrations.map(({ row, index }) => (
                            <li
                              key={`arb-${index}`}
                              className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                            >
                              <p className="text-sm font-medium text-foreground">
                                {displayLabel(row.title, 'Arbitrage')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {row.status === 'VALIDATED'
                                  ? 'Adopté'
                                  : row.status === 'REJECTED'
                                    ? 'Rejeté'
                                    : 'Reporté'}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    {/* PLAN D'ACTION */}
                    <section
                      className="rounded-xl border border-border/70 bg-card p-4"
                      aria-labelledby="animate-plan-title"
                    >
                      <h3
                        id="animate-plan-title"
                        className="starium-overline text-[color:var(--brand-gold-700)]"
                      >
                        Plan d’action
                      </h3>
                      {canEdit ? (
                        <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-end">
                          <div className="starium-form-field min-w-0 flex-1">
                            <Label htmlFor="animate-act-title" className="sr-only">
                              Action
                            </Label>
                            <Input
                              id="animate-act-title"
                              className="starium-form-input min-h-11"
                              value={actTitle}
                              placeholder="Décrire l’action…"
                              onChange={(e) => setActTitle(e.target.value)}
                            />
                          </div>
                          <div className="starium-form-field w-full lg:w-36">
                            <Label htmlFor="animate-act-owner" className="sr-only">
                              Responsable
                            </Label>
                            <select
                              id="animate-act-owner"
                              className="starium-form-select min-h-11 w-full"
                              value={actResponsible}
                              onChange={(e) => setActResponsible(e.target.value)}
                            >
                              <option value="">Resp.</option>
                              {(assignable.data?.users ?? []).map((u) => {
                                const label =
                                  [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
                                  u.email;
                                const initials = label
                                  .split(/\s+/)
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((p) => p[0]?.toUpperCase() ?? '')
                                  .join('');
                                return (
                                  <option key={u.id} value={u.id}>
                                    {initials || label}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <div className="starium-form-field w-full lg:w-44">
                            <Label htmlFor="animate-act-due" className="sr-only">
                              Échéance
                            </Label>
                            <ProjectDatetimeLocalInput
                              id="animate-act-due"
                              value={actDue}
                              onChange={setActDue}
                              className="min-h-11"
                            />
                          </div>
                          <Button
                            type="button"
                            className={goldBtnClass}
                            onClick={submitAction}
                          >
                            Assigner
                          </Button>
                        </div>
                      ) : null}
                      {linkedActions.length === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          Aucune action au plan
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-2" aria-live="polite">
                          {linkedActions.map(({ row, index }) => (
                            <li
                              key={`plan-${index}`}
                              className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                            >
                              <span className="text-sm font-medium text-foreground">
                                {displayLabel(row.title, 'Action')}
                              </span>
                              {canEdit ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="min-h-11 text-destructive"
                                  onClick={() => onRemoveAction(index)}
                                >
                                  Retirer
                                </Button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    {/* RISQUES */}
                    <section
                      className="rounded-xl border border-border/70 bg-card p-4"
                      aria-labelledby="animate-risk-title"
                    >
                      <h3
                        id="animate-risk-title"
                        className="starium-overline text-[color:var(--brand-gold-700)]"
                      >
                        Risques
                      </h3>
                      {canEdit ? (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                          <div className="starium-form-field min-w-0 flex-1">
                            <Label htmlFor="animate-risk" className="sr-only">
                              Risque
                            </Label>
                            <Input
                              id="animate-risk"
                              className="starium-form-input min-h-11"
                              value={riskDraft}
                              placeholder="Décrire un risque identifié…"
                              onChange={(e) => setRiskDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void submitRisk();
                                }
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            className={goldBtnClass}
                            onClick={() => void submitRisk()}
                            disabled={updateAgendaItem.isPending}
                          >
                            Consigner
                          </Button>
                        </div>
                      ) : null}
                      {riskLines.length === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          Aucun risque consigné
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-2" aria-live="polite">
                          {riskLines.map((line, i) => (
                            <li
                              key={`risk-${i}`}
                              className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground"
                            >
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                title="Aucun point sélectionné"
                description="Ajoutez des sujets à l’ordre du jour pour animer la séance."
              />
            </div>
          )}
        </main>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-card px-3 py-3 sm:px-4">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 max-sm:flex-1"
          onClick={onSuspend}
        >
          Suspendre
        </Button>
        <Button
          type="button"
          variant="default"
          className="min-h-11 max-sm:flex-1"
          onClick={onRequestCloseReport}
          disabled={!canEdit || finalizePending}
        >
          {finalizePending ? 'Finalisation…' : 'Clôturer & générer le CR'}
        </Button>
      </footer>
    </div>
  );
}
