'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { displayLabel } from '@/lib/display-label';
import {
  PROJECT_PRIORITY_LABEL,
  PROJECT_REVIEW_AGENDA_ITEM_STATUS_LABEL,
  PROJECT_REVIEW_AGENDA_ITEM_TYPE_LABEL,
  PROJECT_REVIEW_DECISION_STATUS_LABEL,
  PROJECT_REVIEW_DECISION_TYPE_LABEL,
  PROJECT_REVIEW_MEETING_MODE_LABEL,
  PROJECT_REVIEW_TYPE_LABEL,
  TASK_STATUS_LABEL,
} from '../constants/project-enum-labels';
import { isPilotageReviewType, REVIEW_TYPE_AGENDA_HINT } from '../lib/project-review-agenda-presets';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
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
  ProjectReviewDecisionStatus,
  ProjectReviewDecisionType,
  ProjectReviewDetail,
  ProjectReviewMeetingMode,
  ProjectReviewStatus,
  ProjectReviewType,
} from '../types/project.types';
import {
  emptyActionRow,
  type ReviewActionFormRow,
} from './review-actions-section';
import {
  emptyDecisionRow,
  type ReviewDecisionFormRow,
} from './review-decisions-section';
import { ReviewAgendaAddAttachmentModal } from './review-agenda-point-modals';
import { ProjectDatetimeLocalInput } from './project-datetime-local-input';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  FileText,
  ListChecks,
  ListOrdered,
  ListTodo,
  Play,
  RotateCcw,
  Scale,
  SkipForward,
  Square,
  Video,
} from 'lucide-react';
import { projectRisks } from '../constants/project-routes';

type Props = {
  projectId: string;
  reviewId: string;
  status: ProjectReviewStatus;
  agendaItems: ProjectReviewAgendaItemApi[];
  canEdit: boolean;
  /** Snapshot API (pièces jointes). */
  reviewAttachments?: ProjectReviewAttachmentApi[];
  /** État formulaire éditeur — source de vérité Suites (live avant PATCH). */
  formDecisions?: ReviewDecisionFormRow[];
  formActions?: ReviewActionFormRow[];
  onAddDecision?: (row: ReviewDecisionFormRow) => void;
  onAddAction?: (row: ReviewActionFormRow) => void;
  onUpdateDecision?: (index: number, row: ReviewDecisionFormRow) => void;
  onUpdateAction?: (index: number, row: ReviewActionFormRow) => void;
  onRemoveDecision?: (index: number) => void;
  onRemoveAction?: (index: number) => void;
  /** Sync sélection depuis les onglets récap (« Ouvrir le sujet »). */
  selectedAgendaItemId?: string | null;
  onSelectedAgendaItemIdChange?: (id: string | null) => void;
  reviewType?: ProjectReviewType;
  showAgendaPresetControls?: boolean;
  agendaPresetMismatch?: boolean;
  onApplyAgendaPreset?: () => void;
  applyingAgendaPreset?: boolean;
  /** RFC-PROJ-013-7 — structure ODJ figée (préparation / planifié). */
  agendaStructureLocked?: boolean;
};

const DECISION_TYPES = Object.keys(
  PROJECT_REVIEW_DECISION_TYPE_LABEL,
) as ProjectReviewDecisionType[];
const DECISION_STATUSES = Object.keys(
  PROJECT_REVIEW_DECISION_STATUS_LABEL,
) as ProjectReviewDecisionStatus[];

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

function displayNameFromUser(u: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

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

function RiskReviewRegisterLink({ projectId }: { projectId: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/15 p-3">
      <p className="text-sm text-muted-foreground">
        Consultez le registre des risques du projet pendant la revue.
      </p>
      <a
        href={projectRisks(projectId)}
        target="_blank"
        rel="noopener noreferrer"
        className="starium-link mt-2 inline-flex min-h-11 items-center gap-1.5 font-medium"
      >
        <ExternalLink className="size-4 shrink-0" aria-hidden />
        Ouvrir le registre des risques
        <span className="sr-only"> (nouvel onglet)</span>
      </a>
    </div>
  );
}

type ConductSuitesPanelProps = {
  agendaItemId: string;
  agendaItemType: ProjectReviewAgendaItemType;
  decisionSummary: string;
  expectedDecision: string;
  conductEditable: boolean;
  formDecisions: ReviewDecisionFormRow[];
  formActions: ReviewActionFormRow[];
  attachments: { title: string }[];
  onAddDecision?: (row: ReviewDecisionFormRow) => void;
  onAddAction?: (row: ReviewActionFormRow) => void;
  onUpdateDecision?: (index: number, row: ReviewDecisionFormRow) => void;
  onUpdateAction?: (index: number, row: ReviewActionFormRow) => void;
  onRemoveDecision?: (index: number) => void;
  onRemoveAction?: (index: number) => void;
  onAddAttachment: () => void;
};

function ConductSuitesPanel({
  agendaItemId,
  agendaItemType,
  decisionSummary,
  expectedDecision,
  conductEditable,
  formDecisions,
  formActions,
  attachments,
  onAddDecision,
  onAddAction,
  onUpdateDecision,
  onUpdateAction,
  onRemoveDecision,
  onRemoveAction,
  onAddAttachment,
}: ConductSuitesPanelProps) {
  const assignable = useProjectAssignableUsers({ enabled: conductEditable });

  const linkedDecisions = useMemo(
    () =>
      formDecisions
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.agendaItemId === agendaItemId),
    [formDecisions, agendaItemId],
  );
  const linkedActions = useMemo(
    () =>
      formActions
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.agendaItemId === agendaItemId),
    [formActions, agendaItemId],
  );

  const [decTitle, setDecTitle] = useState('');
  const [decType, setDecType] = useState<ProjectReviewDecisionType>('OTHER');
  const [decStatus, setDecStatus] = useState<ProjectReviewDecisionStatus>('VALIDATED');
  const [actTitle, setActTitle] = useState('');
  const [actPriority, setActPriority] = useState('MEDIUM');
  const [actDue, setActDue] = useState('');
  const [actResponsible, setActResponsible] = useState('');

  useEffect(() => {
    setDecTitle('');
    setDecType(defaultDecisionTypeForAgenda(agendaItemType));
    setDecStatus('VALIDATED');
    setActTitle('');
    setActPriority('MEDIUM');
    setActDue('');
    setActResponsible('');
  }, [agendaItemId, agendaItemType]);

  const submitDecision = () => {
    if (!onAddDecision) return;
    const title = decTitle.trim();
    if (!title) {
      toast.error('Le titre de la décision est obligatoire.');
      return;
    }
    onAddDecision({
      ...emptyDecisionRow(),
      title,
      description:
        decisionSummary.trim() || expectedDecision.trim() || '',
      decisionType: decType,
      status: decStatus,
      agendaItemId,
    });
    setDecTitle('');
    setDecType(defaultDecisionTypeForAgenda(agendaItemType));
    setDecStatus('VALIDATED');
    toast.success('Décision ajoutée au sujet.');
  };

  const submitAction = () => {
    if (!onAddAction) return;
    const title = actTitle.trim();
    if (!title) {
      toast.error('Le libellé de l’action est obligatoire.');
      return;
    }
    onAddAction({
      ...emptyActionRow(),
      title,
      priority: actPriority,
      dueDate: actDue,
      responsibleUserId: actResponsible,
      agendaItemId,
    });
    setActTitle('');
    setActPriority('MEDIUM');
    setActDue('');
    setActResponsible('');
    toast.success('Action ajoutée au sujet.');
  };

  return (
    <fieldset className="rounded-xl border-2 border-[color:var(--brand-gold-700)]/50 bg-[color:var(--brand-gold-50,var(--muted))]/40 px-4 py-4 shadow-sm">
      <legend className="px-1.5 text-sm font-bold uppercase tracking-wide text-foreground">
        Suites — décisions &amp; actions
      </legend>
      <p className="mt-1 text-sm text-muted-foreground">
        C’est ici que vous formalisez le résultat du sujet (pas dans un autre onglet).
      </p>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ListChecks className="size-4 shrink-0" aria-hidden />
            Décisions
            <span className="tabular-nums text-muted-foreground">({linkedDecisions.length})</span>
          </p>
          {linkedDecisions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune décision pour ce sujet.</p>
          ) : (
            <ul className="space-y-2">
              {linkedDecisions.map(({ row, index }) => (
                <li
                  key={`suite-dec-${index}`}
                  className="rounded-md border border-border/60 bg-card px-3 py-2"
                >
                  {conductEditable && onUpdateDecision ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Input
                        className="starium-form-input min-h-11"
                        value={row.title}
                        aria-label={`Titre décision ${index + 1}`}
                        onChange={(e) =>
                          onUpdateDecision(index, { ...row, title: e.target.value })
                        }
                      />
                      {onRemoveDecision ? (
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
                      <p className="text-xs text-muted-foreground sm:col-span-2">
                        {displayLabel(
                          PROJECT_REVIEW_DECISION_TYPE_LABEL[row.decisionType],
                          'Type',
                        )}
                        {' · '}
                        {displayLabel(
                          PROJECT_REVIEW_DECISION_STATUS_LABEL[row.status],
                          'Statut',
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-foreground">
                      {displayLabel(row.title, 'Décision sans titre')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {conductEditable && onAddDecision ? (
            <div className="grid gap-2 rounded-md border border-dashed border-border/80 bg-card/80 p-3 sm:grid-cols-2">
              <div className="starium-form-field sm:col-span-2">
                <Label htmlFor={`suite-dec-title-${agendaItemId}`}>Nouvelle décision</Label>
                <Input
                  id={`suite-dec-title-${agendaItemId}`}
                  className="starium-form-input min-h-11"
                  value={decTitle}
                  placeholder="Titre de la décision"
                  onChange={(e) => setDecTitle(e.target.value)}
                />
              </div>
              <div className="starium-form-field">
                <Label htmlFor={`suite-dec-type-${agendaItemId}`}>Type</Label>
                <select
                  id={`suite-dec-type-${agendaItemId}`}
                  className="starium-form-select min-h-11 w-full"
                  value={decType}
                  onChange={(e) =>
                    setDecType(e.target.value as ProjectReviewDecisionType)
                  }
                >
                  {DECISION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {PROJECT_REVIEW_DECISION_TYPE_LABEL[t] ?? t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="starium-form-field">
                <Label htmlFor={`suite-dec-status-${agendaItemId}`}>Statut</Label>
                <select
                  id={`suite-dec-status-${agendaItemId}`}
                  className="starium-form-select min-h-11 w-full"
                  value={decStatus}
                  onChange={(e) =>
                    setDecStatus(e.target.value as ProjectReviewDecisionStatus)
                  }
                >
                  {DECISION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PROJECT_REVIEW_DECISION_STATUS_LABEL[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Button type="button" className="min-h-11" onClick={submitDecision}>
                  <Scale className="size-4" aria-hidden />
                  Ajouter la décision
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ListTodo className="size-4 shrink-0" aria-hidden />
            Actions
            <span className="tabular-nums text-muted-foreground">({linkedActions.length})</span>
          </p>
          {linkedActions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune action pour ce sujet.</p>
          ) : (
            <ul className="space-y-2">
              {linkedActions.map(({ row, index }) => (
                <li
                  key={`suite-act-${index}`}
                  className="rounded-md border border-border/60 bg-card px-3 py-2"
                >
                  {conductEditable && onUpdateAction ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <Input
                        className="starium-form-input min-h-11"
                        value={row.title}
                        aria-label={`Libellé action ${index + 1}`}
                        onChange={(e) =>
                          onUpdateAction(index, { ...row, title: e.target.value })
                        }
                      />
                      {onRemoveAction ? (
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
                      <p className="text-xs text-muted-foreground sm:col-span-2">
                        {displayLabel(TASK_STATUS_LABEL[row.status], 'Statut')}
                        {' · '}
                        {displayLabel(PROJECT_PRIORITY_LABEL[row.priority], 'Priorité')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-foreground">
                      {displayLabel(row.title, 'Action sans titre')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {conductEditable && onAddAction ? (
            <div className="grid gap-2 rounded-md border border-dashed border-border/80 bg-card/80 p-3 sm:grid-cols-2">
              <div className="starium-form-field sm:col-span-2">
                <Label htmlFor={`suite-act-title-${agendaItemId}`}>Nouvelle action</Label>
                <Input
                  id={`suite-act-title-${agendaItemId}`}
                  className="starium-form-input min-h-11"
                  value={actTitle}
                  placeholder="Libellé de l’action"
                  onChange={(e) => setActTitle(e.target.value)}
                />
              </div>
              <div className="starium-form-field">
                <Label htmlFor={`suite-act-prio-${agendaItemId}`}>Priorité</Label>
                <select
                  id={`suite-act-prio-${agendaItemId}`}
                  className="starium-form-select min-h-11 w-full"
                  value={actPriority}
                  onChange={(e) => setActPriority(e.target.value)}
                >
                  {Object.keys(PROJECT_PRIORITY_LABEL).map((p) => (
                    <option key={p} value={p}>
                      {PROJECT_PRIORITY_LABEL[p] ?? p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="starium-form-field">
                <Label htmlFor={`suite-act-resp-${agendaItemId}`}>Responsable</Label>
                <select
                  id={`suite-act-resp-${agendaItemId}`}
                  className="starium-form-select min-h-11 w-full"
                  value={actResponsible}
                  disabled={assignable.isLoading}
                  onChange={(e) => setActResponsible(e.target.value)}
                >
                  <option value="">— Choisir —</option>
                  {assignable.data?.users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {displayNameFromUser(u)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="starium-form-field sm:col-span-2">
                <Label htmlFor={`suite-act-due-${agendaItemId}`}>Échéance (optionnel)</Label>
                <ProjectDatetimeLocalInput
                  id={`suite-act-due-${agendaItemId}`}
                  value={actDue}
                  onChange={setActDue}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="button" className="min-h-11" onClick={submitAction}>
                  <ListTodo className="size-4" aria-hidden />
                  Ajouter l&apos;action
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <FileText className="size-4 shrink-0" aria-hidden />
            Documents
            <span className="tabular-nums text-muted-foreground">({attachments.length})</span>
          </p>
          {attachments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun document pour ce sujet.</p>
          ) : (
            <ul className="space-y-1">
              {attachments.map((att, i) => (
                <li key={`suite-att-${i}`} className="truncate text-sm text-foreground">
                  {displayLabel(att.title, 'Document sans titre')}
                </li>
              ))}
            </ul>
          )}
          {conductEditable ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 gap-1.5"
              onClick={onAddAttachment}
            >
              <FileText className="size-4" aria-hidden />
              Document / lien
            </Button>
          ) : null}
        </div>
      </div>
    </fieldset>
  );
}

export function ReviewAgendaSection({
  projectId,
  reviewId,
  status,
  agendaItems,
  canEdit,
  reviewAttachments = [],
  formDecisions = [],
  formActions = [],
  onAddDecision,
  onAddAction,
  onUpdateDecision,
  onUpdateAction,
  onRemoveDecision,
  onRemoveAction,
  selectedAgendaItemId = null,
  onSelectedAgendaItemIdChange,
  reviewType,
  showAgendaPresetControls = false,
  agendaPresetMismatch = false,
  onApplyAgendaPreset,
  applyingAgendaPreset = false,
  agendaStructureLocked = false,
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
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const conductStepNavRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const sortedItems = useMemo(() => sortReviewAgendaItems(agendaItems), [agendaItems]);
  const progress = useMemo(() => reviewAgendaConductProgress(agendaItems), [agendaItems]);

  const agendaEditable =
    canEdit && isReviewAgendaEditable(status) && !agendaStructureLocked;
  const conductEditable = canEdit && isReviewAgendaConductEditable(status);
  const readOnly = isReviewFinalizedOrCancelled(status);
  const conductLayout = isReviewAgendaConductEditable(status);

  useEffect(() => {
    if (!selectedId || !conductLayout) return;
    const stepButton = conductStepNavRefs.current.get(selectedId);
    stepButton?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedId, conductLayout]);

  const selected = sortedItems.find((i) => i.id === selectedId) ?? null;
  const selectedIndex = selected ? sortedItems.findIndex((i) => i.id === selected.id) : -1;

  const selectItem = useCallback(
    (item: ProjectReviewAgendaItemApi) => {
      setSelectedId(item.id);
      setNotes(item.notes ?? '');
      setDecisionSummary(item.decisionSummary ?? '');
      setObjective(item.objective ?? '');
      setExpectedDecision(item.expectedDecision ?? '');
      onSelectedAgendaItemIdChange?.(item.id);
    },
    [onSelectedAgendaItemIdChange],
  );

  useEffect(() => {
    if (selectedAgendaItemId) {
      if (selectedAgendaItemId === selectedId) return;
      const focused = sortedItems.find((i) => i.id === selectedAgendaItemId);
      if (focused) {
        selectItem(focused);
        return;
      }
    }
    if (sortedItems.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId && sortedItems.some((i) => i.id === selectedId)) return;
    const preferredId = pickPreferredAgendaItemId(sortedItems);
    const preferred = sortedItems.find((i) => i.id === preferredId);
    if (preferred) selectItem(preferred);
  }, [sortedItems, selectedId, selectedAgendaItemId, selectItem]);

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

  const progressPct =
    progress.total > 0 ? Math.round((progress.treated / progress.total) * 100) : 0;

  const renderConductWorkspace = () => {
    if (!selected) return null;

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
              {reviewType === 'RISK_REVIEW' && selected.itemType === 'RISK' ? (
                <p className="mt-3">
                  <a
                    href={projectRisks(projectId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="starium-link inline-flex min-h-11 items-center gap-1.5 text-sm font-medium"
                  >
                    <ExternalLink className="size-4 shrink-0" aria-hidden />
                    Registre des risques du projet
                    <span className="sr-only"> (nouvel onglet)</span>
                  </a>
                </p>
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
                    Notes de séance
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

            <ConductSuitesPanel
              agendaItemId={selected.id}
              agendaItemType={selected.itemType}
              decisionSummary={decisionSummary}
              expectedDecision={expectedDecision}
              conductEditable={conductEditable}
              formDecisions={formDecisions}
              formActions={formActions}
              attachments={pointAttachments.map((a) => ({ title: a.title }))}
              onAddDecision={onAddDecision}
              onAddAction={onAddAction}
              onUpdateDecision={onUpdateDecision}
              onUpdateAction={onUpdateAction}
              onRemoveDecision={onRemoveDecision}
              onRemoveAction={onRemoveAction}
              onAddAttachment={() => setAttachmentModalOpen(true)}
            />
          </div>
        </div>

        {attachmentModalOpen ? (
          <ReviewAgendaAddAttachmentModal
            open
            onOpenChange={setAttachmentModalOpen}
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
                  Traitez chaque sujet ci-dessous. Saisissez décisions et actions dans Suites.
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

            {reviewType === 'RISK_REVIEW' ? (
              <div className="mt-4">
                <RiskReviewRegisterLink projectId={projectId} />
              </div>
            ) : null}

            <nav
              className="mt-4 overflow-x-auto overscroll-contain px-1 py-1 pb-2.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full"
              aria-label="Navigation entre les points de l'ordre du jour"
            >
              <ol className="flex min-w-max items-center gap-1 py-0.5">
                {sortedItems.map((item, index) => {
                  const isSelected = selectedId === item.id;
                  const isDone = item.status === 'DONE';
                  const isCurrent = item.status === 'IN_PROGRESS';
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        ref={(node) => {
                          if (node) conductStepNavRefs.current.set(item.id, node);
                          else conductStepNavRefs.current.delete(item.id);
                        }}
                        className={cn(
                          'group/step relative flex min-h-11 max-w-[11rem] items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                          isSelected
                            ? 'bg-[color:color-mix(in_srgb,var(--brand-gold-700)_14%,transparent)] text-foreground ring-2 ring-[color:var(--brand-gold-700)]/35 ring-offset-2 ring-offset-card'
                            : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                        )}
                        aria-current={isSelected ? 'step' : undefined}
                        onClick={() => selectItem(item)}
                        title={item.title}
                      >
                        <span
                          className={cn(
                            'flex size-5 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold tabular-nums transition-colors',
                            isDone
                              ? 'bg-[color:var(--state-success)] text-white'
                              : isCurrent
                                ? 'bg-[color:var(--brand-gold-700)] text-white'
                                : isSelected
                                  ? 'bg-[color:var(--brand-gold-700)]/15 text-[color:var(--brand-gold-700)]'
                                  : 'bg-muted text-muted-foreground group-hover/step:bg-muted-foreground/20',
                          )}
                          aria-hidden
                        >
                          {isDone ? <CheckCircle2 className="size-3" /> : index + 1}
                        </span>
                        <span
                          className={cn(
                            'min-w-0 truncate',
                            isSelected && 'font-medium',
                            item.status === 'SKIPPED' && 'line-through opacity-70',
                          )}
                        >
                          {item.title}
                        </span>
                        {isSelected ? (
                          <span
                            className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-[color:var(--brand-gold-700)]"
                            aria-hidden
                          />
                        ) : null}
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
              {reviewType && isPilotageReviewType(reviewType) ? (
                <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                  {REVIEW_TYPE_AGENDA_HINT[reviewType]}
                </p>
              ) : null}
              {agendaPresetMismatch ? (
                <p className="mt-1.5 text-xs text-[color:var(--state-warn)]" role="status">
                  Le type a changé — l’ordre du jour ne correspond plus au modèle{' '}
                  {reviewType ? (PROJECT_REVIEW_TYPE_LABEL[reviewType] ?? reviewType) : ''}.
                </p>
              ) : null}
              {sortedItems.length > 0 ? (
                <p className="starium-form-hint mb-0 mt-2">
                  {sortedItems.length} point{sortedItems.length > 1 ? 's' : ''} numéroté
                  {sortedItems.length > 1 ? 's' : ''}
                  {reviewType && isPilotageReviewType(reviewType)
                    ? ` — modèle ${PROJECT_REVIEW_TYPE_LABEL[reviewType] ?? reviewType}`
                    : ''}
                </p>
              ) : null}
            </div>
            {showAgendaPresetControls && onApplyAgendaPreset ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9 shrink-0 gap-1.5"
                disabled={applyingAgendaPreset || !agendaEditable}
                onClick={() => onApplyAgendaPreset()}
              >
                <RotateCcw className="size-4" aria-hidden />
                {applyingAgendaPreset ? 'Application…' : 'Réinitialiser selon le type'}
              </Button>
            ) : null}
          </div>

          {reviewType === 'RISK_REVIEW' ? (
            <RiskReviewRegisterLink projectId={projectId} />
          ) : null}

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
