'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { ApiFormError } from '@/features/budgets/api/types';
import {
  CalendarClock,
  ChevronDown,
  ClipboardPen,
  Link2,
  ListOrdered,
  MapPin,
  Monitor,
  PenLine,
  Plus,
  RotateCcw,
  Trash2,
  UserPlus,
  Video,
} from 'lucide-react';
import {
  PROJECT_REVIEW_AGENDA_ITEM_TYPE_LABEL,
  PROJECT_REVIEW_MEETING_MODE_LABEL,
  PROJECT_REVIEW_TYPE_LABEL,
} from '../constants/project-enum-labels';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectReviewDetailQuery } from '../hooks/use-project-review-detail-query';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import { useProjectReviewsQuery } from '../hooks/use-project-reviews-query';
import { useProjectTeamQuery } from '../hooks/use-project-team-queries';
import {
  cloneAgendaPresetRows,
  defaultExpectedDecisionForItemType,
  getAgendaPresetForReviewType,
  isPilotageReviewType,
  REVIEW_TYPE_AGENDA_HINT,
} from '../lib/project-review-agenda-presets';
import { getCreateDefaultsForType } from '../lib/project-review-create-defaults';
import { ProjectDatetimeLocalInput } from './project-datetime-local-input';
import type {
  ProjectAssignableUser,
  ProjectReviewAgendaItemType,
  ProjectReviewCreationMode,
  ProjectReviewMeetingMode,
  ProjectReviewType,
  ProjectTeamMemberApi,
} from '../types/project.types';

type CreateParticipantRow = {
  displayName: string;
  userId: string;
  attended: boolean;
  isRequired: boolean;
};

type CreateAgendaRow = {
  title: string;
  description: string;
  itemType: ProjectReviewAgendaItemType;
  expectedDecision: string;
};

export type ProjectReviewCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  postMortemEligible: boolean;
  createTypeOptions: ProjectReviewType[];
  /** Prefill type (défaut COPRO / COPROJ — modifiable dans la modale). */
  initialReviewType?: ProjectReviewType;
  onCreated: (reviewId: string, openEditor: boolean) => void;
};

function displayNameFromUser(u: ProjectAssignableUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

function participantInitials(displayName: string, index: number): string {
  const trimmed = displayName.trim();
  if (!trimmed) return String(index + 1);
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const letters =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : trimmed.slice(0, 2);
  return letters.toUpperCase();
}

const emptyParticipantRow = (): CreateParticipantRow => ({
  displayName: '',
  userId: '',
  attended: true,
  isRequired: false,
});

const emptyAgendaRow = (): CreateAgendaRow => ({
  title: '',
  description: '',
  itemType: 'INFORMATION',
  expectedDecision: defaultExpectedDecisionForItemType('INFORMATION'),
});

function initialAgendaForType(reviewType: ProjectReviewType): CreateAgendaRow[] {
  const preset = getAgendaPresetForReviewType(reviewType);
  return preset.length > 0 ? cloneAgendaPresetRows(preset) : [emptyAgendaRow()];
}

function isApiFormError(e: unknown): e is ApiFormError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'message' in e &&
    typeof (e as ApiFormError).message === 'string'
  );
}

function createParticipantsFromProjectTeam(
  team: ProjectTeamMemberApi[],
  assignable: ProjectAssignableUser[] | undefined,
): CreateParticipantRow[] {
  if (!team.length) return [emptyParticipantRow()];
  return team.map((m) => {
    const uid = m.userId?.trim() ?? '';
    if (uid && assignable?.length) {
      const u = assignable.find((a) => a.id === uid);
      return {
        userId: uid,
        displayName: u ? displayNameFromUser(u) : m.displayName.trim() || m.email,
        attended: true,
        isRequired: false,
      };
    }
    return {
      userId: '',
      displayName: m.displayName.trim() || m.email,
      attended: true,
      isRequired: false,
    };
  });
}

const MEETING_MODE_OPTIONS: {
  value: ProjectReviewMeetingMode;
  icon: typeof Video;
}[] = [
  { value: 'REMOTE', icon: Video },
  { value: 'ONSITE', icon: MapPin },
  { value: 'HYBRID', icon: Monitor },
];

const CREATION_MODE_OPTIONS: {
  value: ProjectReviewCreationMode;
  title: string;
  description: string;
  icon: typeof PenLine;
}[] = [
  {
    value: 'PREPARING',
    title: 'Préparer',
    description: 'Crée un point en préparation — date optionnelle, à planifier ensuite.',
    icon: ClipboardPen,
  },
  {
    value: 'IMMEDIATE',
    title: 'Saisir maintenant',
    description: 'Ouvre l’éditeur pour rédiger le compte rendu dès la création.',
    icon: PenLine,
  },
];

function FormChoiceTile({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  icon: Icon,
  className,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string;
  icon?: typeof Video;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'relative flex min-h-11 cursor-pointer flex-col gap-1 rounded-lg border border-border/70 bg-muted/20 p-3 text-left transition-[border-color,background-color,box-shadow]',
        'hover:border-border hover:bg-muted/35',
        'has-[:checked]:border-primary/55 has-[:checked]:bg-primary/5 has-[:checked]:shadow-sm',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2',
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="flex items-start gap-2.5">
        {Icon ? (
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/80 text-muted-foreground',
              checked && 'border-primary/40 text-primary',
            )}
            aria-hidden
          >
            <Icon className="size-4" strokeWidth={1.75} />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          {description ? (
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
              {description}
            </span>
          ) : null}
        </span>
      </span>
    </label>
  );
}

function OptionalBlock({
  id,
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  summary: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className="group rounded-lg border border-border/70 bg-muted/15 open:bg-card open:shadow-sm"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary
        id={`${id}-summary`}
        className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{summary}</span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-border/60 px-4 pb-4 pt-3" aria-labelledby={`${id}-summary`}>
        {children}
      </div>
    </details>
  );
}

export function ProjectReviewCreateDialog({
  open,
  onOpenChange,
  projectId,
  postMortemEligible,
  createTypeOptions,
  initialReviewType,
  onCreated,
}: ProjectReviewCreateDialogProps) {
  const assignable = useProjectAssignableUsers();
  const teamForCreate = useProjectTeamQuery(projectId, { enabled: open });
  const { create, createAgendaItem } = useProjectReviewMutations(projectId);
  const reviewsQuery = useProjectReviewsQuery(projectId, { enabled: open && !postMortemEligible });

  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState<ProjectReviewType>('COPRO');
  const [formTitle, setFormTitle] = useState('');
  const [formObjective, setFormObjective] = useState('');
  const [createParticipants, setCreateParticipants] = useState<CreateParticipantRow[]>([
    emptyParticipantRow(),
  ]);
  const [createAgendaItems, setCreateAgendaItems] = useState<CreateAgendaRow[]>(() =>
    initialAgendaForType('COPRO'),
  );
  const [agendaDirty, setAgendaDirty] = useState(false);
  const [agendaPresetSourceType, setAgendaPresetSourceType] =
    useState<ProjectReviewType>('COPRO');
  const [formMeetingMode, setFormMeetingMode] = useState<ProjectReviewMeetingMode | ''>('HYBRID');
  const [formMeetingUrl, setFormMeetingUrl] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formCreationMode, setFormCreationMode] =
    useState<ProjectReviewCreationMode>('PREPARING');
  const [resumeFromLast, setResumeFromLast] = useState(false);
  const [formDurationMinutes, setFormDurationMinutes] = useState<number | ''>(60);

  const lastFinalizedId = useMemo(() => {
    const items = reviewsQuery.data ?? [];
    const finalized = items.filter((row) => row.status === 'FINALIZED');
    if (finalized.length === 0) return null;
    finalized.sort((a, b) => {
      const ta = a.reviewDate ? new Date(a.reviewDate).getTime() : 0;
      const tb = b.reviewDate ? new Date(b.reviewDate).getTime() : 0;
      return tb - ta || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return finalized[0]?.id ?? null;
  }, [reviewsQuery.data]);

  const lastFinalizedQuery = useProjectReviewDetailQuery(
    projectId,
    open && !postMortemEligible ? lastFinalizedId : null,
  );

  const createFormSeededRef = useRef(false);

  const applyAgendaPresetFromType = useCallback((reviewType: ProjectReviewType) => {
    setCreateAgendaItems(initialAgendaForType(reviewType));
    setAgendaDirty(false);
    setAgendaPresetSourceType(reviewType);
  }, []);

  const markAgendaDirty = useCallback(() => {
    setAgendaDirty(true);
  }, []);

  const handleReviewTypeChange = useCallback(
    (nextType: ProjectReviewType) => {
      setFormType(nextType);
      if (!agendaDirty) {
        applyAgendaPresetFromType(nextType);
      }
      if (!postMortemEligible) {
        const defaults = getCreateDefaultsForType(nextType);
        setFormDurationMinutes(defaults.durationMinutes);
        setFormMeetingMode(defaults.meetingMode);
      }
    },
    [agendaDirty, applyAgendaPresetFromType, postMortemEligible],
  );

  const resetForm = useCallback(() => {
    setFormDate('');
    const defaultType = postMortemEligible
      ? 'POST_MORTEM'
      : (initialReviewType ?? 'COPRO');
    setFormType(defaultType);
    setFormTitle('');
    setFormObjective('');
    if (postMortemEligible) {
      setCreateAgendaItems([emptyAgendaRow()]);
      setAgendaDirty(false);
      setAgendaPresetSourceType(defaultType);
      setFormMeetingMode('');
      setFormDurationMinutes('');
    } else {
      const defaults = getCreateDefaultsForType(defaultType);
      applyAgendaPresetFromType(defaultType);
      setFormMeetingMode(defaults.meetingMode);
      setFormDurationMinutes(defaults.durationMinutes);
    }
    setFormMeetingUrl('');
    setFormLocation('');
    setFormCreationMode('PREPARING');
    setResumeFromLast(false);
  }, [postMortemEligible, applyAgendaPresetFromType, initialReviewType]);

  useEffect(() => {
    if (!open) {
      createFormSeededRef.current = false;
      return;
    }
    resetForm();
  }, [open, initialReviewType]); // eslint-disable-line react-hooks/exhaustive-deps — seed on open / type change only

  useEffect(() => {
    if (!open) {
      createFormSeededRef.current = false;
      return;
    }
    if (createFormSeededRef.current) return;
    if (teamForCreate.isLoading) return;

    if (teamForCreate.isError) {
      createFormSeededRef.current = true;
      setCreateParticipants([emptyParticipantRow()]);
      return;
    }
    if (!teamForCreate.isSuccess) return;

    const team = teamForCreate.data ?? [];
    if (team.length === 0) {
      createFormSeededRef.current = true;
      setCreateParticipants([emptyParticipantRow()]);
      return;
    }

    const needsAssignable = team.some((m) => (m.userId?.trim() ?? '') !== '');
    if (needsAssignable && assignable.isLoading) return;

    createFormSeededRef.current = true;
    setCreateParticipants(createParticipantsFromProjectTeam(team, assignable.data?.users));
  }, [
    open,
    teamForCreate.isLoading,
    teamForCreate.isSuccess,
    teamForCreate.isError,
    teamForCreate.data,
    assignable.isLoading,
    assignable.data,
  ]);

  const handleOpenChange = (next: boolean) => {
    if (next) resetForm();
    onOpenChange(next);
  };

  const submitLabel = postMortemEligible
    ? 'Créer le retour d’expérience'
    : formCreationMode === 'PREPARING'
      ? 'Créer le point'
      : 'Créer et ouvrir l’éditeur';

  const onSubmit = async () => {
    const reviewDate = formDate.trim() ? new Date(formDate).toISOString() : undefined;
    const objective = formObjective.trim();
    const participants = createParticipants
      .filter((p) => p.displayName.trim() || p.userId.trim())
      .map((p) => ({
        userId: p.userId.trim() || null,
        displayName: p.displayName.trim() || null,
        attended: p.attended,
        isRequired: p.isRequired,
      }));
    const agendaItems = createAgendaItems
      .filter((x) => x.title.trim())
      .map((x) => ({
        title: x.title.trim(),
        description: x.description.trim() || null,
        itemType: x.itemType,
        expectedDecision:
          x.expectedDecision.trim() ||
          defaultExpectedDecisionForItemType(x.itemType),
      }));
    const lastDetail = lastFinalizedQuery.data;
    const resume =
      resumeFromLast &&
      !postMortemEligible &&
      isPilotageReviewType(formType) &&
      lastDetail != null;
    const presetTitles = new Set(
      agendaItems.map((item) => item.title.trim().toLocaleLowerCase('fr')),
    );
    const resumedAgenda = resume
      ? (lastDetail.agendaItems ?? []).filter((item) => {
          if (item.status !== 'TODO' && item.status !== 'SKIPPED') return false;
          const key = item.title.trim().toLocaleLowerCase('fr');
          return key.length > 0 && !presetTitles.has(key);
        })
      : [];
    const resumedActions = resume
      ? (lastDetail.actionItems ?? [])
          .filter((action) => action.status === 'TODO' || action.status === 'IN_PROGRESS')
          .map((action) => ({
            title: action.title.trim(),
            description: action.description?.trim() || undefined,
            status: action.status,
            ...(action.priority ? { priority: action.priority } : {}),
            ...(action.dueDate ? { dueDate: action.dueDate } : {}),
            ...(action.responsibleUserId
              ? { responsibleUserId: action.responsibleUserId }
              : {}),
          }))
          .filter((action) => action.title.length > 0)
      : [];

    try {
      const created = await create.mutateAsync({
        ...(reviewDate ? { reviewDate } : {}),
        reviewType: formType,
        creationMode: postMortemEligible ? 'IMMEDIATE' : formCreationMode,
        title: formTitle.trim() || undefined,
        ...(objective ? { objective, executiveSummary: objective } : {}),
        ...(typeof formDurationMinutes === 'number' && formDurationMinutes > 0
          ? { durationMinutes: formDurationMinutes }
          : {}),
        ...(formMeetingMode
          ? {
              meetingMode: formMeetingMode,
              ...(formMeetingUrl.trim() ? { meetingUrl: formMeetingUrl.trim() } : {}),
              ...(formLocation.trim() ? { location: formLocation.trim() } : {}),
            }
          : {}),
        ...(participants.length > 0 ? { participants } : {}),
        ...(resumedActions.length > 0 ? { actionItems: resumedActions } : {}),
      });
      const agendaToCreate = [
        ...agendaItems,
        ...resumedAgenda.map((item) => ({
          title: item.title.trim(),
          description: item.description?.trim() || null,
          itemType: item.itemType,
          expectedDecision:
            item.expectedDecision?.trim() ||
            defaultExpectedDecisionForItemType(item.itemType),
        })),
      ];
      if (agendaToCreate.length > 0) {
        try {
          await Promise.all(
            agendaToCreate.map((item) =>
              createAgendaItem.mutateAsync({
                reviewId: created.id,
                body: item,
              }),
            ),
          );
        } catch {
          toast.error(
            'Point créé, mais certains éléments d’ordre du jour n’ont pas pu être ajoutés.',
          );
        }
      }
      onOpenChange(false);
      const openEditorAfterCreate =
        postMortemEligible || formCreationMode === 'IMMEDIATE';
      onCreated(created.id, openEditorAfterCreate);
    } catch (err) {
      const msg = isApiFormError(err) ? err.message : 'Création du point impossible.';
      toast.error(msg);
    }
  };

  const showMeetingUrl = formMeetingMode === 'REMOTE' || formMeetingMode === 'HYBRID';
  const showLocation = formMeetingMode === 'ONSITE' || formMeetingMode === 'HYBRID';
  const agendaPresetCount = createAgendaItems.filter((row) => row.title.trim()).length;
  const showAgendaPresetMismatch =
    !postMortemEligible && agendaDirty && formType !== agendaPresetSourceType;
  const showAgendaPresetReset =
    !postMortemEligible &&
    isPilotageReviewType(formType) &&
    (agendaDirty || formType !== agendaPresetSourceType);

  return (
    <StariumModal
      open={open}
      onOpenChange={handleOpenChange}
      title={postMortemEligible ? "Retour d'expérience" : 'Nouveau point projet'}
      description={
        postMortemEligible
          ? "Bilan de clôture : date, équipe, puis grille REX dans l'éditeur."
          : "Planifiez ou lancez un point de pilotage — le détail se complète dans l'éditeur."
      }
      icon={ClipboardPen}
      accent="amber"
      size="xl"
      bodyClassName="min-h-0 flex-1 py-4"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11"
            onClick={() => void onSubmit()}
            disabled={create.isPending}
          >
            {create.isPending ? 'Création…' : submitLabel}
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => e.preventDefault()} className="flex min-h-0 flex-1 flex-col">
        <div className="starium-form gap-4">
          {/* 1. Essentiel */}
          <section
            className="starium-form-section border-border/60"
            aria-labelledby="create-pr-essential"
          >
            <h3 id="create-pr-essential" className="starium-form-section-title">
              <ClipboardPen aria-hidden />
              Essentiel
            </h3>
            <div className="starium-form-grid starium-form-grid--2">
              <div className="starium-form-field">
                <label htmlFor="pr-date" className="starium-form-label">
                  Date et heure{' '}
                  <span className="font-normal text-muted-foreground">(optionnel)</span>
                </label>
                <ProjectDatetimeLocalInput
                  id="pr-date"
                  value={formDate}
                  onChange={setFormDate}
                />
              </div>
              <div className="starium-form-field">
                <label htmlFor="pr-type" className="starium-form-label">
                  Type de point
                </label>
                <select
                  id="pr-type"
                  className="starium-form-select min-h-11"
                  value={formType}
                  aria-describedby={
                    isPilotageReviewType(formType) ? 'pr-type-hint' : undefined
                  }
                  onChange={(e) =>
                    handleReviewTypeChange(e.target.value as ProjectReviewType)
                  }
                  disabled={postMortemEligible && createTypeOptions.length === 1}
                >
                  {createTypeOptions.map((t) => (
                    <option key={t} value={t}>
                      {PROJECT_REVIEW_TYPE_LABEL[t] ?? t}
                    </option>
                  ))}
                </select>
                {isPilotageReviewType(formType) ? (
                  <p id="pr-type-hint" className="mt-1.5 text-xs leading-snug text-muted-foreground">
                    {REVIEW_TYPE_AGENDA_HINT[formType]}
                  </p>
                ) : null}
                {showAgendaPresetMismatch ? (
                  <p className="mt-1.5 text-xs text-[color:var(--state-warn)]" role="status">
                    Le type a changé — l’ordre du jour ne correspond plus au modèle{' '}
                    {PROJECT_REVIEW_TYPE_LABEL[formType] ?? formType}. Vous pouvez le
                    réinitialiser ci-dessous.
                  </p>
                ) : null}
              </div>
              <div className="starium-form-field starium-form-grid--span-2">
                <label htmlFor="pr-title" className="starium-form-label">
                  Titre <span className="font-normal text-muted-foreground">(optionnel)</span>
                </label>
                <Input
                  id="pr-title"
                  className="starium-form-input min-h-11"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  maxLength={500}
                  placeholder="Ex. COPIL mensuel — arbitrage budget Q3"
                />
              </div>
            </div>
          </section>

          {/* 2. Reprise du dernier point */}
          {!postMortemEligible && isPilotageReviewType(formType) && lastFinalizedId ? (
            <div className="starium-form-field">
              <label className="flex min-h-11 items-start gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0"
                  checked={resumeFromLast}
                  disabled={lastFinalizedQuery.isLoading || lastFinalizedQuery.isError}
                  onChange={(e) => setResumeFromLast(e.target.checked)}
                />
                <span>
                  {lastFinalizedQuery.isLoading
                    ? 'Chargement du dernier point…'
                    : 'Reprendre les actions ouvertes et les sujets non traités du dernier point'}
                </span>
              </label>
            </div>
          ) : null}

          {/* 3. Ordre du jour — section primaire, toujours ouverte */}
          <section
            className="starium-form-section border-border/60"
            aria-labelledby="create-pr-agenda"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 id="create-pr-agenda" className="starium-form-section-title mb-0">
                  <ListOrdered aria-hidden />
                  Ordre du jour
                </h3>
                <p className="starium-form-hint mt-1" id="create-pr-agenda-hint">
                  {postMortemEligible
                    ? 'Sujets optionnels pour cadrer le REX — la grille détaillée se complète dans l’éditeur.'
                    : agendaPresetCount > 0
                      ? `${agendaPresetCount} sujet(s) préremplis avec questions à trancher — modèle ${PROJECT_REVIEW_TYPE_LABEL[formType] ?? formType}.`
                      : 'Sujets structurés — chaque point porte une question à trancher.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {showAgendaPresetReset ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-9 gap-1.5"
                    onClick={() => applyAgendaPresetFromType(formType)}
                  >
                    <RotateCcw className="size-4" aria-hidden />
                    Réinitialiser selon le type
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-9 gap-1.5"
                  onClick={() => {
                    markAgendaDirty();
                    setCreateAgendaItems((prev) => [...prev, emptyAgendaRow()]);
                  }}
                >
                  <Plus className="size-4" aria-hidden />
                  Ajouter un sujet
                </Button>
              </div>
            </div>
            <ul className="space-y-2" aria-live="polite" aria-describedby="create-pr-agenda-hint">
              {createAgendaItems.map((row, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border/60 bg-muted/15 p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="starium-form-grid starium-form-grid--2">
                        <div className="starium-form-field">
                          <label
                            htmlFor={`pr-agenda-type-${i}`}
                            className="starium-form-label"
                          >
                            Type
                          </label>
                          <select
                            id={`pr-agenda-type-${i}`}
                            className="starium-form-select min-h-11"
                            value={row.itemType}
                            onChange={(e) => {
                              const v = e.target.value as ProjectReviewAgendaItemType;
                              markAgendaDirty();
                              setCreateAgendaItems((prev) =>
                                prev.map((x, j) => {
                                  if (j !== i) return x;
                                  const prevDefault =
                                    defaultExpectedDecisionForItemType(x.itemType);
                                  const nextDefault =
                                    defaultExpectedDecisionForItemType(v);
                                  const keepQuestion =
                                    x.expectedDecision.trim() &&
                                    x.expectedDecision.trim() !== prevDefault
                                      ? x.expectedDecision
                                      : nextDefault;
                                  return {
                                    ...x,
                                    itemType: v,
                                    expectedDecision: keepQuestion,
                                  };
                                }),
                              );
                            }}
                          >
                            {Object.entries(PROJECT_REVIEW_AGENDA_ITEM_TYPE_LABEL).map(
                              ([k, label]) => (
                                <option key={k} value={k}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                        <div className="starium-form-field">
                          <label
                            htmlFor={`pr-agenda-title-${i}`}
                            className="starium-form-label"
                          >
                            Titre
                          </label>
                          <Input
                            id={`pr-agenda-title-${i}`}
                            className="starium-form-input min-h-11"
                            value={row.title}
                            maxLength={500}
                            onChange={(e) => {
                              const v = e.target.value;
                              markAgendaDirty();
                              setCreateAgendaItems((prev) =>
                                prev.map((x, j) => (j === i ? { ...x, title: v } : x)),
                              );
                            }}
                            placeholder="Ex. Arbitrage dépassement budget"
                          />
                        </div>
                      </div>
                      <div className="starium-form-field">
                        <label
                          htmlFor={`pr-agenda-question-${i}`}
                          className="starium-form-label"
                        >
                          Question à trancher
                        </label>
                        <textarea
                          id={`pr-agenda-question-${i}`}
                          className="starium-form-textarea min-h-[64px]"
                          value={row.expectedDecision}
                          maxLength={1000}
                          onChange={(e) => {
                            const v = e.target.value;
                            markAgendaDirty();
                            setCreateAgendaItems((prev) =>
                              prev.map((x, j) =>
                                j === i ? { ...x, expectedDecision: v } : x,
                              ),
                            );
                          }}
                          placeholder="Formulation de la décision ou du résultat attendu…"
                        />
                      </div>
                      <div className="starium-form-field">
                        <label
                          htmlFor={`pr-agenda-desc-${i}`}
                          className="starium-form-label"
                        >
                          Description{' '}
                          <span className="font-normal text-muted-foreground">
                            (optionnel)
                          </span>
                        </label>
                        <textarea
                          id={`pr-agenda-desc-${i}`}
                          className="starium-form-textarea min-h-[64px]"
                          value={row.description}
                          maxLength={8000}
                          onChange={(e) => {
                            const v = e.target.value;
                            markAgendaDirty();
                            setCreateAgendaItems((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, description: v } : x)),
                            );
                          }}
                          placeholder="Contexte, documents attendus…"
                        />
                      </div>
                    </div>
                    {createAgendaItems.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Retirer le sujet ${row.title.trim() || i + 1}`}
                        onClick={() => {
                          markAgendaDirty();
                          setCreateAgendaItems((prev) => prev.filter((_, j) => j !== i));
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* 4. Modalités + 5. Participants — OptionalBlocks repliés */}
          <div className="flex flex-col gap-2">
            <OptionalBlock
              id="create-pr-modalities"
              title="Modalités"
              defaultOpen={false}
              summary={
                postMortemEligible
                  ? 'Objectif du point — optionnel'
                  : 'Intention, tenue de réunion, objectif — optionnel'
              }
            >
              {!postMortemEligible ? (
                <div className="space-y-5">
                  <fieldset>
                    <legend className="starium-form-label mb-2 flex items-center gap-1.5">
                      <CalendarClock className="size-3.5 opacity-70" aria-hidden />
                      Intention
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {CREATION_MODE_OPTIONS.map((opt) => (
                        <FormChoiceTile
                          key={opt.value}
                          name="pr-creation-mode"
                          value={opt.value}
                          checked={formCreationMode === opt.value}
                          onChange={() => setFormCreationMode(opt.value)}
                          title={opt.title}
                          description={opt.description}
                          icon={opt.icon}
                        />
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="space-y-4">
                    <legend className="starium-form-label mb-2 flex items-center gap-1.5">
                      <Video className="size-3.5 opacity-70" aria-hidden />
                      Tenue de la réunion
                    </legend>
                    <p className="starium-form-label mb-2">Format</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {MEETING_MODE_OPTIONS.map(({ value, icon }) => (
                        <FormChoiceTile
                          key={value}
                          name="pr-meeting-mode"
                          value={value}
                          checked={formMeetingMode === value}
                          onChange={() => setFormMeetingMode(value)}
                          title={PROJECT_REVIEW_MEETING_MODE_LABEL[value] ?? value}
                          icon={icon}
                          className="sm:min-h-[4.5rem]"
                        />
                      ))}
                    </div>
                    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="radio"
                        name="pr-meeting-mode"
                        checked={formMeetingMode === ''}
                        onChange={() => setFormMeetingMode('')}
                        className="size-4 rounded-full border border-input"
                      />
                      À définir plus tard
                    </label>

                    {(showMeetingUrl || showLocation) && (
                      <div className="starium-form-grid starium-form-grid--2 rounded-lg border border-border/60 bg-muted/20 p-3">
                        {showMeetingUrl ? (
                          <div
                            className={cn(
                              'starium-form-field',
                              showLocation ? '' : 'starium-form-grid--span-2',
                            )}
                          >
                            <label htmlFor="pr-meeting-url" className="starium-form-label">
                              <Link2 className="mr-1 inline size-3.5 opacity-70" aria-hidden />
                              Lien de réunion
                            </label>
                            <Input
                              id="pr-meeting-url"
                              type="url"
                              className="starium-form-input min-h-11"
                              value={formMeetingUrl}
                              onChange={(e) => setFormMeetingUrl(e.target.value)}
                              placeholder="https://teams.microsoft.com/…"
                            />
                          </div>
                        ) : null}
                        {showLocation ? (
                          <div
                            className={cn(
                              'starium-form-field',
                              showMeetingUrl ? '' : 'starium-form-grid--span-2',
                            )}
                          >
                            <label htmlFor="pr-location" className="starium-form-label">
                              <MapPin className="mr-1 inline size-3.5 opacity-70" aria-hidden />
                              Lieu
                            </label>
                            <Input
                              id="pr-location"
                              className="starium-form-input min-h-11"
                              value={formLocation}
                              onChange={(e) => setFormLocation(e.target.value)}
                              maxLength={300}
                              placeholder="Salle, étage, adresse…"
                            />
                          </div>
                        ) : null}
                      </div>
                    )}
                  </fieldset>
                </div>
              ) : null}

              <div className={cn('starium-form-field', !postMortemEligible && 'mt-5')}>
                <label htmlFor="pr-objective" className="starium-form-label">
                  Objectif du point
                </label>
                <textarea
                  id="pr-objective"
                  className="starium-form-textarea min-h-[72px]"
                  value={formObjective}
                  onChange={(e) => setFormObjective(e.target.value)}
                  maxLength={20000}
                  rows={3}
                  placeholder="Pourquoi ce point, quels arbitrages ou décisions attendus…"
                />
              </div>
            </OptionalBlock>

            <OptionalBlock
              id="create-pr-participants"
              title="Participants"
              defaultOpen={false}
              summary={
                teamForCreate.isLoading
                  ? 'Chargement de l’équipe projet…'
                  : `${createParticipants.length} participant${createParticipants.length > 1 ? 's' : ''} — équipe préremplie`
              }
            >
              <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-9 shrink-0 gap-1.5"
                  onClick={() =>
                    setCreateParticipants((prev) => [...prev, emptyParticipantRow()])
                  }
                >
                  <UserPlus className="size-4" aria-hidden />
                  Ajouter
                </Button>
              </div>
              <p className="starium-form-hint mb-3" aria-live="polite">
                {teamForCreate.isLoading
                  ? 'Chargement de l’équipe projet…'
                  : 'Ajustez la liste si besoin — présents et requis par participant.'}
              </p>
              {assignable.isLoading ? (
                <p className="starium-form-hint mb-3">Chargement des membres du client…</p>
              ) : null}
              <ul className="space-y-2">
                {createParticipants.map((row, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-border/60 bg-muted/15 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                        aria-hidden
                      >
                        {participantInitials(row.displayName, i)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="starium-form-field min-w-0 flex-1 basis-48">
                            <label htmlFor={`pr-part-user-${i}`} className="starium-form-label">
                              Membre client
                            </label>
                            <select
                              id={`pr-part-user-${i}`}
                              className="starium-form-select min-h-11 w-full"
                              disabled={assignable.isLoading}
                              value={row.userId}
                              onChange={(e) => {
                                const id = e.target.value;
                                const u = assignable.data?.users?.find((x) => x.id === id);
                                setCreateParticipants((prev) =>
                                  prev.map((p, j) =>
                                    j === i
                                      ? {
                                          ...p,
                                          userId: id,
                                          displayName: u ? displayNameFromUser(u) : '',
                                        }
                                      : p,
                                  ),
                                );
                              }}
                            >
                              <option value="">— Choisir —</option>
                              {assignable.data?.users?.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {displayNameFromUser(u)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pb-0.5">
                            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background/80 px-3 text-sm transition-colors has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10">
                              <input
                                type="checkbox"
                                className="size-4 rounded border border-input"
                                checked={row.attended}
                                onChange={(e) => {
                                  const v = e.target.checked;
                                  setCreateParticipants((prev) =>
                                    prev.map((p, j) => (j === i ? { ...p, attended: v } : p)),
                                  );
                                }}
                              />
                              Présent
                            </label>
                            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background/80 px-3 text-sm transition-colors has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10">
                              <input
                                type="checkbox"
                                className="size-4 rounded border border-input"
                                checked={row.isRequired}
                                onChange={(e) => {
                                  const v = e.target.checked;
                                  setCreateParticipants((prev) =>
                                    prev.map((p, j) => (j === i ? { ...p, isRequired: v } : p)),
                                  );
                                }}
                              />
                              Requis
                            </label>
                          </div>
                        </div>
                      </div>
                      {createParticipants.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Retirer ${row.displayName.trim() || `participant ${i + 1}`}`}
                          onClick={() =>
                            setCreateParticipants((prev) => prev.filter((_, j) => j !== i))
                          }
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </OptionalBlock>
          </div>
        </div>
      </form>
    </StariumModal>
  );
}
