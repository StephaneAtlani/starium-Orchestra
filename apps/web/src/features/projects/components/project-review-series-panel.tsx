'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Info, UserPlus, Users, X } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { StariumTableWrap } from '@/components/ui/starium-table-wrap';
import { toast } from '@/lib/toast';
import type { ApiFormError } from '@/features/budgets/api/types';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import { useProjectAssignableUsers } from '../hooks/use-project-assignable-users';
import { useProjectTeamsQuery } from '../hooks/use-project-governance-circles-query';
import {
  useProjectReviewSeriesMutations,
  useProjectReviewSeriesQuery,
} from '../hooks/use-project-review-series';
import { PROJECT_REVIEW_TYPE_LABEL } from '../constants/project-enum-labels';
import type {
  ProjectReviewSeriesApi,
  ProjectReviewSeriesFrequency,
  ProjectReviewSeriesOccurrenceTitleFormat,
  ProjectReviewType,
} from '../types/project.types';
import {
  agendaModelLabelForType,
  getCreateDefaultsForType,
  PROJECT_REVIEW_CREATE_DEFAULTS,
} from '../lib/project-review-create-defaults';
import { usePrepareTemplatesQuery } from '../hooks/use-prepare-templates-query';
import { blocksForTypeCode } from '../lib/prepare-workspace-blocks';
import { reviewTypeToTypeCode } from '../lib/prepare-workspace-types';
import {
  governanceCircleDisplayLabel,
} from './project-team-governance-circles-field';
import { ProjectTeamsEditorDialog } from './project-teams/project-teams-editor-dialog';

const SERIES_TYPES: ProjectReviewType[] = PROJECT_REVIEW_CREATE_DEFAULTS.map(
  (d) => d.reviewType,
);

const FREQUENCIES: ProjectReviewSeriesFrequency[] = [
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
];

const FREQUENCY_LABEL: Record<ProjectReviewSeriesFrequency, string> = {
  WEEKLY: 'Hebdomadaire',
  BIWEEKLY: 'Bimensuel',
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
};

const DURATION_OPTIONS: Array<{ minutes: number; label: string }> = [
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 h' },
  { minutes: 90, label: '1 h 30' },
  { minutes: 120, label: '2 h' },
  { minutes: 180, label: '3 h' },
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function splitAnchorLocal(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return {
      date: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
      time: '09:30',
    };
  }
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

const WEEKDAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
] as const;

function frequencyForType(t: ProjectReviewType): ProjectReviewSeriesFrequency {
  if (t === 'COPIL') return 'MONTHLY';
  if (t === 'CODIR_REVIEW' || t === 'PROJECT_REVIEW') return 'QUARTERLY';
  if (t === 'OTHER') return 'WEEKLY';
  return 'WEEKLY';
}

function weekdayFromIso(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 2;
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

function nextAnchorFromWeekday(weekday: number, time: string): Date {
  const [hhRaw, mmRaw] = time.split(':');
  const hh = Number(hhRaw) || 9;
  const mm = Number(mmRaw) || 0;
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMilliseconds(0);
  d.setHours(hh, mm, 0, 0);
  const current = weekdayFromIso(d.toISOString());
  let add = weekday - current;
  if (add < 0 || (add === 0 && d.getTime() <= Date.now())) add += 7;
  d.setDate(d.getDate() + add);
  return d;
}

const OCCURRENCE_TITLE_FORMATS: Array<{
  value: ProjectReviewSeriesOccurrenceTitleFormat;
  label: string;
  example: (instanceTitle: string) => string;
}> = [
  {
    value: 'SHORT_DATE',
    label: 'Date courte',
    example: (t) => `${t} — 13 sept. 2026`,
  },
  {
    value: 'WEEK',
    label: 'N° de semaine',
    example: (t) => `${t} — Semaine 38`,
  },
  {
    value: 'LONG_DATE',
    label: 'Date longue',
    example: (t) => `${t} — dimanche 13 septembre 2026`,
  },
  {
    value: 'CUSTOM',
    label: 'Personnalisé…',
    example: (t) => `${t} — {week}`,
  },
];

const DEFAULT_CUSTOM_OCCURRENCE_PATTERN = '{title} — Semaine {week}';

function typeOptionLabel(t: ProjectReviewType): string {
  return t === 'COPRO' ? 'COPROJ' : (PROJECT_REVIEW_TYPE_LABEL[t] ?? t);
}

function SeriesFormDialog({
  open,
  onOpenChange,
  projectId,
  initial,
  siblingSeries,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  initial: ProjectReviewSeriesApi | null;
  siblingSeries: ProjectReviewSeriesApi[];
  onSubmit: (
    body: Record<string, unknown>,
    opts?: { generateAfterSave?: boolean },
  ) => Promise<void>;
  pending: boolean;
}) {
  const assignable = useProjectAssignableUsers();
  const teamsQuery = useProjectTeamsQuery(projectId, { enabled: open });
  const createDefaults = getCreateDefaultsForType(initial?.reviewType ?? 'COPRO');
  const initialAnchor = splitAnchorLocal(
    initial?.anchorDate ??
      (() => {
        const d = new Date();
        d.setHours(createDefaults.defaultHour, createDefaults.defaultMinute, 0, 0);
        return d.toISOString();
      })(),
  );
  const initialWeekday = weekdayFromIso(
    initial?.anchorDate ?? new Date().toISOString(),
  );
  const initialTime = initialAnchor.time || '09:30';
  const [weekday, setWeekday] = useState(initialWeekday);
  const [anchorTime, setAnchorTime] = useState(initialTime);
  const [title, setTitle] = useState(
    () => initial?.title?.trim() || `${typeOptionLabel(initial?.reviewType ?? 'COPRO')} — à nommer`,
  );
  const [occurrenceTitleFormat, setOccurrenceTitleFormat] =
    useState<ProjectReviewSeriesOccurrenceTitleFormat>(
      () => initial?.occurrenceTitleFormat ?? 'SHORT_DATE',
    );
  const [occurrenceTitleCustom, setOccurrenceTitleCustom] = useState(
    () => initial?.occurrenceTitleCustom ?? DEFAULT_CUSTOM_OCCURRENCE_PATTERN,
  );
  const [reviewType, setReviewType] = useState<ProjectReviewType>(
    initial?.reviewType ?? 'COPRO',
  );
  const [prepareTemplateId, setPrepareTemplateId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<ProjectReviewSeriesFrequency>(
    initial?.frequency ?? frequencyForType(initial?.reviewType ?? 'COPRO'),
  );
  const [durationMinutes, setDurationMinutes] = useState(
    () => initial?.durationMinutes ?? createDefaults.durationMinutes,
  );
  const [location, setLocation] = useState(initial?.location ?? '');
  const [meetingUrl, setMeetingUrl] = useState(initial?.meetingUrl ?? '');
  const [horizonCount, setHorizonCount] = useState(
    String(initial?.horizonCount ?? 4),
  );
  const [participantIds, setParticipantIds] = useState<string[]>(
    initial?.permanentParticipantUserIds ?? [],
  );
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [personToAdd, setPersonToAdd] = useState('');
  const [teamsEditorOpen, setTeamsEditorOpen] = useState(false);
  const [teamsEditorTeamId, setTeamsEditorTeamId] = useState<string | null>(null);
  const [upstreamSeriesId, setUpstreamSeriesId] = useState('');

  const prepTypeCode = reviewTypeToTypeCode(reviewType);
  const templatesQuery = usePrepareTemplatesQuery(projectId, prepTypeCode, {
    enabled: open,
  });
  const prepareTemplates = templatesQuery.data?.items ?? [];
  const teams = teamsQuery.data?.items ?? [];

  const userOptions = useMemo(() => {
    return (assignable.data?.users ?? []).map((u) => ({
      id: u.id,
      label: firstDisplayLabel(
        [[u.firstName, u.lastName].filter(Boolean).join(' ').trim(), u.email],
        'Utilisateur',
      ),
    }));
  }, [assignable.data]);

  const userLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of userOptions) map.set(u.id, u.label);
    for (const team of teams) {
      for (const m of team.members ?? []) {
        if (m.userId) {
          map.set(
            m.userId,
            displayLabel(m.displayName, map.get(m.userId) ?? 'Participant'),
          );
        }
      }
    }
    for (const p of initial?.permanentParticipants ?? []) {
      map.set(
        p.userId,
        displayLabel(p.displayName, map.get(p.userId) ?? 'Participant'),
      );
    }
    return map;
  }, [userOptions, teams, initial?.permanentParticipants]);

  const availablePeopleToAdd = useMemo(
    () => userOptions.filter((u) => !participantIds.includes(u.id)),
    [userOptions, participantIds],
  );

  const selectedParticipants = useMemo(
    () =>
      participantIds.map((id) => ({
        id,
        label: userLabelById.get(id) ?? 'Participant',
      })),
    [participantIds, userLabelById],
  );

  const addTeamMembers = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    const members = team.members ?? [];
    const count = team.memberCount ?? members.length;
    if (count === 0) {
      setTeamsEditorTeamId(teamId);
      setTeamsEditorOpen(true);
      toast.message('Complétez les membres de l’équipe avant de l’ajouter');
      return;
    }
    const userIds = members
      .map((m) => m.userId)
      .filter((id): id is string => Boolean(id));
    const skipped = members.length - userIds.length;
    if (userIds.length === 0) {
      toast.error(
        'Cette équipe n’a aucun membre avec compte Starium — ajoutez des personnes individuellement.',
      );
      return;
    }
    setParticipantIds((prev) => [...new Set([...prev, ...userIds])]);
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev : [...prev, teamId],
    );
    if (skipped > 0) {
      toast.message(
        `${userIds.length} membre${userIds.length > 1 ? 's' : ''} ajouté${userIds.length > 1 ? 's' : ''} · ${skipped} sans compte ignoré${skipped > 1 ? 's' : ''}`,
      );
    }
  };

  const toggleTeam = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    const teamUserIds = new Set(
      (team.members ?? [])
        .map((m) => m.userId)
        .filter((id): id is string => Boolean(id)),
    );
    if (selectedTeamIds.includes(teamId)) {
      setSelectedTeamIds((prev) => prev.filter((id) => id !== teamId));
      setParticipantIds((prev) => prev.filter((id) => !teamUserIds.has(id)));
      return;
    }
    addTeamMembers(teamId);
  };

  const addPerson = () => {
    if (!personToAdd) return;
    setParticipantIds((prev) =>
      prev.includes(personToAdd) ? prev : [...prev, personToAdd],
    );
    setPersonToAdd('');
  };
  const durationSelectOptions = useMemo(() => {
    if (DURATION_OPTIONS.some((o) => o.minutes === durationMinutes)) {
      return DURATION_OPTIONS;
    }
    return [
      ...DURATION_OPTIONS,
      { minutes: durationMinutes, label: `${durationMinutes} min` },
    ].sort((a, b) => a.minutes - b.minutes);
  }, [durationMinutes]);

  const otherSeries = siblingSeries.filter((s) => s.id !== initial?.id);
  const agendaModelLabel = agendaModelLabelForType(
    reviewType,
    blocksForTypeCode(prepTypeCode).length,
  );

  const occurrencePreviewTitle = (() => {
    const base = title.trim() || typeOptionLabel(reviewType);
    if (occurrenceTitleFormat === 'CUSTOM') {
      return (occurrenceTitleCustom.trim() || DEFAULT_CUSTOM_OCCURRENCE_PATTERN)
        .replaceAll('{title}', base)
        .replaceAll('{week}', '38')
        .replaceAll('{date}', '13 sept. 2026')
        .replaceAll('{dateLong}', 'dimanche 13 septembre 2026');
    }
    return (
      OCCURRENCE_TITLE_FORMATS.find((f) => f.value === occurrenceTitleFormat)?.example(
        base,
      ) ?? base
    );
  })();

  const applyTypeDefaults = (next: ProjectReviewType) => {
    const d = getCreateDefaultsForType(next);
    const nextTime = `${pad2(d.defaultHour)}:${pad2(d.defaultMinute)}`;
    setReviewType(next);
    setPrepareTemplateId(null);
    setFrequency(frequencyForType(next));
    setDurationMinutes(d.durationMinutes);
    setAnchorTime(nextTime);
    if (!title.trim() || title.includes('— à nommer')) {
      setTitle(`${typeOptionLabel(next)} — à nommer`);
    }
  };

  const applyPrepareTemplate = (templateId: string | null) => {
    setPrepareTemplateId(templateId);
  };

  const canSubmit = !pending;

  const buildBody = (): Record<string, unknown> => {
    const anchor = nextAnchorFromWeekday(weekday, anchorTime);
    const loc = location.trim() || null;
    const url = meetingUrl.trim() || null;
    const hasLoc = Boolean(loc);
    const hasUrl = Boolean(url);
    const meetingMode =
      hasLoc && hasUrl
        ? 'HYBRID'
        : hasUrl
          ? 'REMOTE'
          : hasLoc
            ? 'ONSITE'
            : null;
    return {
      title: title.trim() || `${typeOptionLabel(reviewType)} — sans titre`,
      reviewType,
      frequency,
      durationMinutes,
      meetingMode,
      location: loc,
      meetingUrl: url,
      permanentParticipantUserIds: participantIds,
      anchorDate: anchor.toISOString(),
      horizonCount: Math.min(12, Math.max(1, Number(horizonCount) || 4)),
      occurrenceTitleFormat,
      occurrenceTitleCustom:
        occurrenceTitleFormat === 'CUSTOM'
          ? occurrenceTitleCustom.trim() || DEFAULT_CUSTOM_OCCURRENCE_PATTERN
          : null,
    };
  };

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      icon={CalendarDays}
      title={initial ? "Modifier l'instance" : 'Nouvelle instance de gouvernance'}
      description="Cadence permanente, équipe, ordre du jour type et génération des séances."
      size="xl"
      contentClassName="sm:max-w-[760px]"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          {!initial ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              disabled={!canSubmit}
              onClick={() => {
                void onSubmit(buildBody(), { generateAfterSave: true });
              }}
            >
              Enregistrer et générer les séances
            </Button>
          ) : null}
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            disabled={!canSubmit}
            onClick={() => {
              void onSubmit(buildBody());
            }}
          >
            {initial ? 'Enregistrer' : "Enregistrer l'instance"}
          </Button>
        </>
      }
    >
      <div className="starium-form flex flex-col gap-5">
        <div className="starium-form-grid starium-form-grid--2">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="series-type">
              Type{' '}
              <span className="text-[color:var(--brand-gold)]" aria-hidden>
                *
              </span>
            </label>
            <select
              id="series-type"
              className="starium-form-select min-h-11 w-full"
              value={reviewType}
              onChange={(e) =>
                applyTypeDefaults(e.target.value as ProjectReviewType)
              }
            >
              {SERIES_TYPES.map((t) => {
                const d = getCreateDefaultsForType(t);
                const dur =
                  DURATION_OPTIONS.find((o) => o.minutes === d.durationMinutes)
                    ?.label ?? `${d.durationMinutes} min`;
                return (
                  <option key={t} value={t}>
                    {d.menuLabel} — {FREQUENCY_LABEL[frequencyForType(t)]} ·{' '}
                    {dur}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="series-prepare-model">
              Modèle de préparation
            </label>
            <select
              id="series-prepare-model"
              className="starium-form-select min-h-11 w-full"
              value={prepareTemplateId ?? '__default__'}
              disabled={templatesQuery.isLoading}
              aria-describedby="series-prepare-model-hint"
              onChange={(e) => {
                const v = e.target.value;
                applyPrepareTemplate(!v || v === '__default__' ? null : v);
              }}
            >
              <option value="__default__">{agendaModelLabel}</option>
              {prepareTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {displayLabel(t.name, 'Modèle sans nom')}
                </option>
              ))}
            </select>
            <p id="series-prepare-model-hint" className="starium-form-hint">
              {prepareTemplates.length === 0
                ? 'Aucun modèle enregistré pour ce type — utilisez Modèles pour en créer.'
                : 'Ce modèle sera appliqué à la préparation des séances générées.'}
            </p>
          </div>
        </div>

        <div className="starium-form-grid starium-form-grid--2">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="series-title">
              Nom de l&apos;instance{' '}
              <span className="text-[color:var(--brand-gold)]" aria-hidden>
                *
              </span>
            </label>
            <Input
              id="series-title"
              value={title}
              placeholder={`${typeOptionLabel(reviewType)} — Comité projet`}
              onChange={(e) => setTitle(e.target.value)}
              className="starium-form-input min-h-11"
              autoComplete="off"
            />
          </div>
          <div className="starium-form-field">
            <label
              className="starium-form-label"
              htmlFor="series-occurrence-title-format"
            >
              Format du nom des séances
            </label>
            <select
              id="series-occurrence-title-format"
              className="starium-form-select min-h-11 w-full"
              value={occurrenceTitleFormat}
              aria-describedby="series-occurrence-title-result"
              onChange={(e) =>
                setOccurrenceTitleFormat(
                  e.target.value as ProjectReviewSeriesOccurrenceTitleFormat,
                )
              }
            >
              {OCCURRENCE_TITLE_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.value === 'SHORT_DATE'
                    ? 'Date courte (ex. 13 sept. 2026)'
                    : f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {occurrenceTitleFormat === 'CUSTOM' ? (
          <div className="starium-form-field">
            <label
              className="starium-form-label"
              htmlFor="series-occurrence-title-custom"
            >
              Motif personnalisé
            </label>
            <Input
              id="series-occurrence-title-custom"
              value={occurrenceTitleCustom}
              placeholder="{title} — Semaine {week}"
              aria-describedby="series-occurrence-title-result"
              onChange={(e) => setOccurrenceTitleCustom(e.target.value)}
              className="starium-form-input min-h-11"
              autoComplete="off"
            />
            <p className="starium-form-hint">
              Jetons : {'{title}'} · {'{week}'} · {'{date}'} · {'{dateLong}'}
            </p>
          </div>
        ) : null}

        <div
          id="series-occurrence-title-result"
          className="rounded-[var(--radius-md)] border border-border/70 bg-muted/40 px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <p className="starium-overline mb-1">Résultat — nom d&apos;une séance</p>
          <p className="text-sm font-bold text-foreground">
            {occurrencePreviewTitle}
          </p>
        </div>

        <div className="starium-form-field">
          <span className="starium-form-label" id="series-freq-label">
            Cadence
          </span>
          <div
            role="radiogroup"
            aria-labelledby="series-freq-label"
            className="flex flex-wrap gap-2"
          >
            {FREQUENCIES.map((f) => {
              const selected = frequency === f;
              return (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cn(
                    'min-h-11 rounded-[var(--control-radius)] border px-3.5 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)]/15 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted/40',
                  )}
                  onClick={() => setFrequency(f)}
                >
                  {FREQUENCY_LABEL[f]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="starium-form-grid starium-form-grid--3">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="series-weekday">
              Jour
            </label>
            <select
              id="series-weekday"
              className="starium-form-select min-h-11 w-full"
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
            >
              {WEEKDAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="series-anchor-time">
              Heure
            </label>
            <Input
              id="series-anchor-time"
              type="time"
              value={anchorTime}
              onChange={(e) => setAnchorTime(e.target.value)}
              className="starium-form-input min-h-11"
            />
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="series-duration">
              Durée
            </label>
            <select
              id="series-duration"
              className="starium-form-select min-h-11 w-full"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            >
              {durationSelectOptions.map((o) => (
                <option key={o.minutes} value={o.minutes}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="starium-form-grid starium-form-grid--2">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="series-location">
              Lieu
            </label>
            <Input
              id="series-location"
              value={location}
              placeholder="Salle Cadence…"
              onChange={(e) => setLocation(e.target.value)}
              className="starium-form-input min-h-11"
              maxLength={300}
            />
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="series-meeting-url">
              Vidéoconférence
            </label>
            <Input
              id="series-meeting-url"
              type="url"
              inputMode="url"
              value={meetingUrl}
              placeholder="https://…"
              onChange={(e) => setMeetingUrl(e.target.value)}
              className="starium-form-input min-h-11"
            />
          </div>
        </div>

        <fieldset className="starium-form-field">
          <legend className="starium-form-label">Équipe permanente</legend>

          <div className="starium-form-field">
            <span className="starium-form-label" id="series-teams-label">
              Équipes projet
            </span>
            {teamsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement des équipes…</p>
            ) : teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune équipe — créez-en dans l’onglet Équipes.
              </p>
            ) : (
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-labelledby="series-teams-label"
              >
                {teams.map((team) => {
                  const selected = selectedTeamIds.includes(team.id);
                  const count = team.memberCount ?? team.members?.length ?? 0;
                  const label = governanceCircleDisplayLabel(team);
                  return (
                    <button
                      key={team.id}
                      type="button"
                      aria-pressed={selected}
                      className={cn(
                        'inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] px-3.5 text-xs font-bold transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected
                          ? 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted/40',
                      )}
                      onClick={() => toggleTeam(team.id)}
                    >
                      <Users className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{label}</span>
                      <span className="tabular-nums opacity-70">
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="starium-form-grid starium-form-grid--2 mt-3">
            <div className="starium-form-field">
              <label className="starium-form-label" htmlFor="series-add-person">
                Ajouter une personne
              </label>
              <div className="flex gap-2">
                <select
                  id="series-add-person"
                  className="starium-form-select min-h-11 w-full"
                  value={personToAdd}
                  disabled={availablePeopleToAdd.length === 0}
                  onChange={(e) => setPersonToAdd(e.target.value)}
                >
                  <option value="">
                    {availablePeopleToAdd.length === 0
                      ? 'Aucune personne disponible'
                      : 'Choisir une personne'}
                  </option>
                  {availablePeopleToAdd.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 shrink-0 gap-1.5 sm:min-h-9"
                  disabled={!personToAdd}
                  onClick={addPerson}
                >
                  <UserPlus className="size-4" aria-hidden />
                  Ajouter
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <span className="starium-form-label" id="series-selected-people-label">
              Membres retenus
            </span>
            {selectedParticipants.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Sélectionnez une équipe ou ajoutez des personnes.
              </p>
            ) : (
              <div
                className="mt-2 flex flex-wrap gap-2"
                role="list"
                aria-labelledby="series-selected-people-label"
              >
                {selectedParticipants.map((p) => (
                  <span
                    key={p.id}
                    role="listitem"
                    className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2 text-xs font-bold"
                  >
                    <UserInitialsAvatar
                      displayName={p.label}
                      seed={p.id}
                      size="sm"
                      className="!size-6 !border-0 !text-[9.5px]"
                    />
                    <span className="truncate">{p.label}</span>
                    <button
                      type="button"
                      className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Retirer ${p.label}`}
                      onClick={() =>
                        setParticipantIds((prev) =>
                          prev.filter((id) => id !== p.id),
                        )
                      }
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </fieldset>

        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="series-upstream">
            Transmet à l&apos;instance aval
          </label>
          <select
            id="series-upstream"
            className="starium-form-select min-h-11 w-full"
            value={upstreamSeriesId}
            onChange={(e) => setUpstreamSeriesId(e.target.value)}
          >
            <option value="">Aucune — instance terminale</option>
            {otherSeries.map((s) => (
              <option key={s.id} value={s.id}>
                {displayLabel(s.title, typeOptionLabel(s.reviewType))}
              </option>
            ))}
          </select>
          <p className="starium-form-hint flex gap-2">
            <Info
              className="mt-0.5 size-3.5 shrink-0 text-[color:var(--brand-gold-600)]"
              aria-hidden
            />
            <span>
              Les sujets qualifiés « à remonter » en séance alimenteront
              l&apos;ordre du jour de cette instance. Le chaînage sera persisté
              dans une prochaine itération.
            </span>
          </p>
        </div>

        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="series-horizon">
            Séances à générer
          </label>
          <select
            id="series-horizon"
            className="starium-form-select min-h-11 w-full max-w-xs"
            value={horizonCount}
            onChange={(e) => setHorizonCount(e.target.value)}
          >
            {[2, 3, 4, 6, 8, 12].map((n) => (
              <option key={n} value={n}>
                {n} séances
              </option>
            ))}
          </select>
        </div>
      </div>
      <ProjectTeamsEditorDialog
        open={teamsEditorOpen}
        onOpenChange={setTeamsEditorOpen}
        projectId={projectId}
        initialTeamId={teamsEditorTeamId}
      />
    </StariumModal>
  );
}


export function ProjectReviewSeriesPanel({
  projectId,
  canEdit,
  createRequestKey = 0,
}: {
  projectId: string;
  canEdit: boolean;
  /** Incrémenté par la toolbar parente pour ouvrir « Nouvelle série ». */
  createRequestKey?: number;
}) {
  const list = useProjectReviewSeriesQuery(projectId);
  const { create, update, generate } = useProjectReviewSeriesMutations(projectId);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectReviewSeriesApi | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  useEffect(() => {
    if (!canEdit || createRequestKey <= 0) return;
    openCreate();
  }, [canEdit, createRequestKey]);

  return (
    <div className="flex flex-col gap-3">
      {list.isLoading ? (
        <div className="p-6">
          <LoadingState rows={3} />
        </div>
      ) : list.isError ? (
        <p className="p-6 text-sm text-destructive" role="alert">
          Impossible de charger les séries.
        </p>
      ) : !(list.data?.length) ? (
        <EmptyState
          title="Aucune série"
          description="Créez un modèle de récurrence pour générer les prochaines séances."
          action={
            canEdit ? (
              <button
                type="button"
                className="starium-btn starium-btn-primary"
                onClick={openCreate}
              >
                Créer une série
              </button>
            ) : undefined
          }
          className="py-10"
        />
      ) : (
        <StariumTableWrap scrollLabel="Séries de points — glisser pour faire défiler">
          <table className="starium-dt starium-dt--wide">
            <caption className="sr-only">Séries de points projet</caption>
            <thead>
              <tr>
                <th scope="col">Titre</th>
                <th scope="col">Type</th>
                <th scope="col">Cadence</th>
                <th scope="col">Durée</th>
                <th scope="col">Lieu / visio</th>
                <th scope="col">Équipe</th>
                <th scope="col" className="starium-dt__right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((row) => {
                const team = row.permanentParticipants
                  .map((p) => displayLabel(p.displayName, 'Participant'))
                  .join(', ');
                const placeLabel =
                  [row.location, row.meetingUrl].filter(Boolean).join(' · ') ||
                  null;
                return (
                  <tr key={row.id}>
                    <td>
                      <div className="starium-dt-cell-strong">
                        {displayLabel(row.title, 'Série')}
                      </div>
                      {!row.isActive ? (
                        <div className="text-xs text-muted-foreground">Désactivée</div>
                      ) : null}
                    </td>
                    <td>
                      <span className="starium-ds-badge starium-ds-badge--info">
                        {row.reviewType === 'COPRO'
                          ? 'COPROJ'
                          : (PROJECT_REVIEW_TYPE_LABEL[row.reviewType] ??
                            row.reviewType)}
                      </span>
                    </td>
                    <td>
                      {FREQUENCY_LABEL[row.frequency] ??
                        displayLabel(row.frequencyLabel, 'Cadence')}
                    </td>
                    <td className="tabular-nums">{row.durationMinutes} min</td>
                    <td className="text-sm">
                      {displayLabel(placeLabel, '—')}
                    </td>
                    <td className="max-w-[12rem] truncate text-sm">
                      {team || '—'}
                    </td>
                    <td className="starium-dt__right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {canEdit && row.isActive ? (
                          <>
                            <button
                              type="button"
                              className="starium-btn starium-btn-secondary starium-btn-sm min-h-11 sm:min-h-9"
                              disabled={generate.isPending}
                              onClick={() => {
                                generate.mutate(
                                  { seriesId: row.id },
                                  {
                                    onSuccess: (res) => {
                                      toast.success(
                                        `${res.created} séance${res.created > 1 ? 's' : ''} générée${res.created > 1 ? 's' : ''}`,
                                      );
                                    },
                                    onError: (err) => {
                                      toast.error(
                                        (err as unknown as ApiFormError)?.message ??
                                          'Génération impossible',
                                      );
                                    },
                                  },
                                );
                              }}
                            >
                              Générer
                            </button>
                            <button
                              type="button"
                              className="starium-btn starium-btn-secondary starium-btn-sm min-h-11 sm:min-h-9"
                              onClick={() => {
                                setEditing(row);
                                setFormOpen(true);
                              }}
                            >
                              Éditer
                            </button>
                            <button
                              type="button"
                              className="starium-btn starium-btn-secondary starium-btn-sm min-h-11 sm:min-h-9"
                              onClick={() => {
                                update.mutate(
                                  { seriesId: row.id, body: { isActive: false } },
                                  {
                                    onSuccess: () => toast.success('Série désactivée'),
                                    onError: (err) =>
                                      toast.error(
                                        (err as unknown as ApiFormError)?.message ??
                                          'Désactivation impossible',
                                      ),
                                  },
                                );
                              }}
                            >
                              Désactiver
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </StariumTableWrap>
      )}

      {formOpen ? (
        <SeriesFormDialog
          key={editing?.id ?? 'new'}
          open={formOpen}
          onOpenChange={setFormOpen}
          projectId={projectId}
          initial={editing}
          siblingSeries={list.data ?? []}
          pending={create.isPending || update.isPending || generate.isPending}
          onSubmit={async (body, opts) => {
            try {
              if (editing) {
                await update.mutateAsync({ seriesId: editing.id, body });
                toast.success('Instance mise à jour');
              } else {
                const created = await create.mutateAsync(body);
                if (opts?.generateAfterSave) {
                  const count =
                    typeof body.horizonCount === 'number'
                      ? body.horizonCount
                      : undefined;
                  const res = await generate.mutateAsync({
                    seriesId: created.id,
                    count,
                  });
                  toast.success(
                    `Instance créée · ${res.created} séance${res.created > 1 ? 's' : ''} générée${res.created > 1 ? 's' : ''}`,
                  );
                } else {
                  toast.success('Instance enregistrée');
                }
              }
              setFormOpen(false);
            } catch (err) {
              toast.error(
                (err as unknown as ApiFormError)?.message ??
                  'Enregistrement impossible',
              );
            }
          }}
        />
      ) : null}
    </div>
  );
}
