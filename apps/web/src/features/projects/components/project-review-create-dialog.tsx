'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { displayLabel } from '@/lib/display-label';
import type { ApiFormError } from '@/features/budgets/api/types';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import { useProjectReviewSeriesQuery } from '../hooks/use-project-review-series';
import { useProjectTeamQuery } from '../hooks/use-project-team-queries';
import {
  cloneAgendaPresetRows,
  getAgendaPresetForReviewType,
} from '../lib/project-review-agenda-presets';
import {
  agendaModelLabelForType,
  datetimeFromDateOnlyAndType,
  defaultCreateDatetimeForType,
  defaultCreateTitleForType,
  getCreateDefaultsForType,
  objectivePlaceholderForType,
  PROJECT_REVIEW_CREATE_DEFAULTS,
  titlePlaceholderForType,
} from '../lib/project-review-create-defaults';
import type {
  ProjectAssignableUser,
  ProjectReviewAgendaItemType,
  ProjectReviewMeetingMode,
  ProjectReviewSeriesApi,
  ProjectReviewType,
  ProjectTeamMemberApi,
} from '../types/project.types';

const TYPE_CHANGE_CONFIRM =
  "Changer de type réinitialise l'intitulé, l'horaire, les participants et l'ordre du jour. Continuer ?";

const MSG_TITLE_REQUIRED = 'Donnez un intitulé à la séance.';
const MSG_DATE_PAST =
  'La date de séance est déjà passée. Choisissez une date à venir.';
const MSG_NO_PARTICIPANT = 'Convoquez au moins un participant.';
const MSG_NO_AGENDA =
  "Un point projet a besoin d'au moins une ligne à l'ordre du jour.";

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
  onCreated: (
    reviewId: string,
    openEditor: boolean,
    meta?: { title: string },
  ) => void;
};

function typeOptionLabel(t: ProjectReviewType): string {
  if (t === 'POST_MORTEM') return 'Retour d’expérience';
  return getCreateDefaultsForType(t).menuLabel;
}

function displayNameFromUser(u: ProjectAssignableUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email;
}

function participantsFromTeam(
  team: ProjectTeamMemberApi[],
  assignable: ProjectAssignableUser[] | undefined,
): CreateParticipantRow[] {
  if (!team.length) return [];
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

function participantsFromSeries(
  series: ProjectReviewSeriesApi,
): CreateParticipantRow[] {
  return (series.permanentParticipants ?? []).map((p) => ({
    userId: p.userId,
    displayName: p.displayName,
    attended: true,
    isRequired: true,
  }));
}

function agendaForType(reviewType: ProjectReviewType): CreateAgendaRow[] {
  const preset = getAgendaPresetForReviewType(reviewType);
  return preset.length > 0 ? cloneAgendaPresetRows(preset) : [];
}

function isApiFormError(e: unknown): e is ApiFormError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'message' in e &&
    typeof (e as ApiFormError).message === 'string'
  );
}

function startOfTodayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isDateOnlyPast(dateOnly: string): boolean {
  if (!dateOnly.trim()) return false;
  const [y, m, day] = dateOnly.split('-').map(Number);
  if (!y || !m || !day) return false;
  const picked = new Date(y, m - 1, day);
  picked.setHours(0, 0, 0, 0);
  return picked.getTime() < startOfTodayLocal().getTime();
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
  const { create, createAgendaItem } = useProjectReviewMutations(projectId);
  const teamQuery = useProjectTeamQuery(projectId, { enabled: open });
  const assignable = useProjectAssignableUsers({ enabled: open });
  const seriesQuery = useProjectReviewSeriesQuery(projectId, {
    enabled: open && !postMortemEligible,
  });

  const defaultType = useMemo(() => {
    if (initialReviewType && createTypeOptions.includes(initialReviewType)) {
      return initialReviewType;
    }
    return createTypeOptions[0] ?? 'COPRO';
  }, [createTypeOptions, initialReviewType]);

  const [formType, setFormType] = useState<ProjectReviewType>(defaultType);
  const [formTitle, setFormTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [dateOnly, setDateOnly] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [formTouched, setFormTouched] = useState(false);
  const [titleBlurred, setTitleBlurred] = useState(false);
  const [dateBlurred, setDateBlurred] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const baselineRef = useRef({
    title: '',
    objective: '',
    dateOnly: '',
    seriesId: '',
    type: defaultType as ProjectReviewType,
  });

  const seriesForType = useMemo(() => {
    const items = seriesQuery.data ?? [];
    return items.filter(
      (s) => s.isActive && (s.reviewType === formType || !formType),
    );
  }, [seriesQuery.data, formType]);

  const selectedSeries = useMemo(
    () => seriesForType.find((s) => s.id === seriesId) ?? null,
    [seriesForType, seriesId],
  );

  const agendaItems = useMemo(() => agendaForType(formType), [formType]);

  const resolvedParticipants = useMemo(() => {
    if (selectedSeries && selectedSeries.permanentParticipants.length > 0) {
      return participantsFromSeries(selectedSeries);
    }
    return participantsFromTeam(teamQuery.data ?? [], assignable.data?.users);
  }, [selectedSeries, teamQuery.data, assignable.data?.users]);

  const meetingDefaults = useMemo(() => {
    if (selectedSeries) {
      return {
        durationMinutes: selectedSeries.durationMinutes,
        meetingMode: (selectedSeries.meetingMode ??
          getCreateDefaultsForType(formType).meetingMode) as ProjectReviewMeetingMode,
        location: selectedSeries.location?.trim() || undefined,
      };
    }
    const d = getCreateDefaultsForType(formType);
    return {
      durationMinutes: d.durationMinutes,
      meetingMode: d.meetingMode,
      location: undefined as string | undefined,
    };
  }, [selectedSeries, formType]);

  const applyTypeDefaults = (type: ProjectReviewType, keepSeries = false) => {
    const title =
      type === 'POST_MORTEM'
        ? 'Retour d’expérience'
        : defaultCreateTitleForType(type);
    const objectiveValue = '';
    setFormType(type);
    setFormTitle(title);
    setObjective(objectiveValue);
    setDateOnly('');
    if (!keepSeries) setSeriesId('');
    baselineRef.current = {
      title,
      objective: objectiveValue,
      dateOnly: '',
      seriesId: keepSeries ? seriesId : '',
      type,
    };
    setFormTouched(false);
    setTitleBlurred(false);
    setDateBlurred(false);
    setSubmitError(null);
  };

  useEffect(() => {
    if (!open) return;
    applyTypeDefaults(defaultType);
    // Focus titre + présélection (CDC p.7)
    const t = window.setTimeout(() => {
      const el = titleRef.current;
      if (!el) return;
      el.focus();
      el.select();
    }, 50);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on open / prefill
  }, [open, defaultType]);

  // Auto-sélection série unique du type
  useEffect(() => {
    if (!open || postMortemEligible) return;
    if (seriesId) return;
    const match = seriesForType[0];
    if (seriesForType.length === 1 && match) {
      setSeriesId(match.id);
      baselineRef.current = { ...baselineRef.current, seriesId: match.id };
    }
  }, [open, postMortemEligible, seriesForType, seriesId]);

  const isDirty =
    formTitle !== baselineRef.current.title ||
    objective !== baselineRef.current.objective ||
    dateOnly !== baselineRef.current.dateOnly ||
    seriesId !== baselineRef.current.seriesId ||
    formType !== baselineRef.current.type ||
    formTouched;

  const titleError =
    titleBlurred && !formTitle.trim() ? MSG_TITLE_REQUIRED : null;
  const dateError =
    dateBlurred && isDateOnlyPast(dateOnly) ? MSG_DATE_PAST : null;
  const participantError =
    !postMortemEligible &&
    resolvedParticipants.filter((p) => p.displayName.trim().length > 0).length ===
      0
      ? MSG_NO_PARTICIPANT
      : null;
  const agendaError =
    !postMortemEligible && agendaItems.length === 0 ? MSG_NO_AGENDA : null;

  const canSubmit =
    formTitle.trim().length > 0 &&
    !isDateOnlyPast(dateOnly) &&
    !participantError &&
    !agendaError &&
    !submitting;

  const markDirty = () => setFormTouched(true);

  const requestTypeChange = (next: ProjectReviewType) => {
    if (next === formType) return;
    if (isDirty) {
      const ok = window.confirm(TYPE_CHANGE_CONFIRM);
      if (!ok) return;
    }
    applyTypeDefaults(next);
    window.setTimeout(() => {
      titleRef.current?.focus();
      titleRef.current?.select();
    }, 0);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && submitting) return;
    if (!next && isDirty) {
      const ok = window.confirm(
        'Des modifications non enregistrées seront perdues. Fermer ?',
      );
      if (!ok) return;
    }
    onOpenChange(next);
  };

  const submit = async (openPrepare: boolean) => {
    setTitleBlurred(true);
    setDateBlurred(true);
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError(null);

    const reviewDate = dateOnly.trim()
      ? datetimeFromDateOnlyAndType(dateOnly.trim(), formType)
      : selectedSeries
        ? defaultCreateDatetimeForType(formType)
        : defaultCreateDatetimeForType(formType);

    const participants = resolvedParticipants
      .filter((p) => p.displayName.trim().length > 0)
      .map((p) => ({
        displayName: p.displayName.trim(),
        ...(p.userId ? { userId: p.userId } : {}),
        attended: p.attended,
        isRequired: p.isRequired,
      }));

    try {
      const created = await create.mutateAsync({
        reviewDate,
        reviewType: formType,
        creationMode: postMortemEligible ? 'IMMEDIATE' : 'PREPARING',
        title: formTitle.trim(),
        ...(objective.trim()
          ? { objective: objective.trim(), executiveSummary: objective.trim() }
          : {}),
        durationMinutes: meetingDefaults.durationMinutes,
        meetingMode: meetingDefaults.meetingMode,
        ...(meetingDefaults.location
          ? { location: meetingDefaults.location }
          : {}),
        ...(participants.length > 0 ? { participants } : {}),
      });

      if (!postMortemEligible && agendaItems.length > 0) {
        try {
          await Promise.all(
            agendaItems.map((item) =>
              createAgendaItem.mutateAsync({
                reviewId: created.id,
                body: {
                  title: item.title,
                  description: item.description || null,
                  itemType: item.itemType,
                  expectedDecision: item.expectedDecision,
                },
              }),
            ),
          );
        } catch {
          setSubmitError(
            "Point créé, mais certains éléments d'ordre du jour n'ont pas pu être ajoutés.",
          );
        }
      }

      const titleLabel = displayLabel(
        created.title ?? formTitle,
        typeOptionLabel(formType),
      );
      onOpenChange(false);
      onCreated(created.id, postMortemEligible || openPrepare, {
        title: titleLabel,
      });
    } catch (err) {
      const msg = isApiFormError(err)
        ? err.message
        : 'Création du point impossible.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const agendaModelLabel = agendaModelLabelForType(
    formType,
    Math.max(agendaItems.length, 0),
  );

  const typePills = postMortemEligible
    ? (['POST_MORTEM'] as ProjectReviewType[])
    : PROJECT_REVIEW_CREATE_DEFAULTS.map((d) => d.reviewType).filter((t) =>
        createTypeOptions.includes(t),
      );

  return (
    <StariumModal
      open={open}
      onOpenChange={handleOpenChange}
      title={
        postMortemEligible
          ? 'Créer un retour d’expérience'
          : 'Créer un point projet'
      }
      description={
        postMortemEligible
          ? 'Bilan de clôture du projet.'
          : "La préparation détaillée s'ouvre après la création."
      }
      icon={ClipboardPen}
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            disabled={submitting}
            onClick={() => handleOpenChange(false)}
          >
            Annuler
          </Button>
          {!postMortemEligible ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              disabled={!canSubmit}
              onClick={() => void submit(false)}
            >
              Créer
            </Button>
          ) : null}
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            disabled={!canSubmit}
            onClick={() => void submit(true)}
          >
            {postMortemEligible ? 'Créer' : 'Créer et préparer'}
          </Button>
        </>
      }
    >
      <div className="starium-form flex flex-col gap-4">
        {submitError ? (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Création impossible</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        {/* Zone 2 — Type */}
        <div className="starium-form-field">
          <span className="starium-form-label" id="create-review-type-label">
            Type d&apos;instance
            {!postMortemEligible ? (
              <span className="text-[color:var(--brand-gold)]" aria-hidden>
                {' '}
                *
              </span>
            ) : null}
          </span>
          <div
            role="radiogroup"
            aria-labelledby="create-review-type-label"
            className="flex flex-wrap gap-2"
          >
            {typePills.map((t) => {
              const selected = formType === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={submitting || typePills.length === 1}
                  className={cn(
                    'min-h-11 rounded-[var(--control-radius)] border px-3.5 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)]/15 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted/40',
                  )}
                  onClick={() => requestTypeChange(t)}
                >
                  {typeOptionLabel(t)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Zone 3 — Titre */}
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="create-review-title">
            Titre
          </label>
          <Input
            ref={titleRef}
            id="create-review-title"
            value={formTitle}
            placeholder={titlePlaceholderForType(formType)}
            aria-invalid={!!titleError}
            aria-describedby={titleError ? 'create-review-title-err' : undefined}
            disabled={submitting}
            className={cn(titleError && 'border-destructive')}
            onChange={(e) => {
              setFormTitle(e.target.value);
              markDirty();
            }}
            onBlur={() => setTitleBlurred(true)}
          />
          {titleError ? (
            <p
              id="create-review-title-err"
              className="mt-1 text-xs text-destructive"
              role="alert"
            >
              {titleError}
            </p>
          ) : null}
        </div>

        {!postMortemEligible ? (
          <>
            {/* Zone 4 — Objectif */}
            <div className="starium-form-field">
              <label
                className="starium-form-label"
                htmlFor="create-review-objective"
              >
                Objectif de la séance
              </label>
              <Input
                id="create-review-objective"
                value={objective}
                placeholder={objectivePlaceholderForType(formType)}
                disabled={submitting}
                onChange={(e) => {
                  setObjective(e.target.value);
                  markDirty();
                }}
              />
            </div>

            {/* Zone 5 — Série + Date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="starium-form-field">
                <label
                  className="starium-form-label"
                  htmlFor="create-review-series"
                >
                  Équipe ou série
                </label>
                <select
                  id="create-review-series"
                  className="starium-form-select min-h-11 w-full"
                  value={seriesId}
                  disabled={submitting || seriesQuery.isLoading}
                  onChange={(e) => {
                    setSeriesId(e.target.value);
                    markDirty();
                  }}
                >
                  <option value="">Équipe projet (sans série)</option>
                  {seriesForType.map((s) => (
                    <option key={s.id} value={s.id}>
                      {displayLabel(s.title, 'Série')}
                      {s.frequencyLabel ? ` · ${s.frequencyLabel}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="starium-form-field">
                <label
                  className="starium-form-label"
                  htmlFor="create-review-date"
                >
                  Date (facultative)
                </label>
                <Input
                  id="create-review-date"
                  type="date"
                  value={dateOnly}
                  aria-invalid={!!dateError}
                  aria-describedby={
                    dateError ? 'create-review-date-err' : undefined
                  }
                  disabled={submitting}
                  className={cn(dateError && 'border-destructive')}
                  onChange={(e) => {
                    setDateOnly(e.target.value);
                    markDirty();
                  }}
                  onBlur={() => setDateBlurred(true)}
                />
                {dateError ? (
                  <p
                    id="create-review-date-err"
                    className="mt-1 text-xs text-destructive"
                    role="alert"
                  >
                    {dateError}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sans date, prochaine occurrence du type
                    {selectedSeries ? ' / de la série' : ''}.
                  </p>
                )}
              </div>
            </div>

            {/* Zone 6 — Modèle ODJ */}
            <div className="starium-form-field">
              <label
                className="starium-form-label"
                htmlFor="create-review-agenda-model"
              >
                Modèle d&apos;ordre du jour
              </label>
              <select
                id="create-review-agenda-model"
                className="starium-form-select min-h-11 w-full"
                value="standard"
                disabled
                aria-readonly="true"
              >
                <option value="standard">{agendaModelLabel}</option>
              </select>
              {agendaError ? (
                <p className="mt-1 text-xs text-destructive" role="alert">
                  {agendaError}
                </p>
              ) : null}
              {participantError ? (
                <p className="mt-1 text-xs text-destructive" role="alert">
                  {participantError}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </StariumModal>
  );
}
