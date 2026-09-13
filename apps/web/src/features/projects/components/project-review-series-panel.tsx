'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Info, X } from 'lucide-react';
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
import {
  useProjectReviewSeriesMutations,
  useProjectReviewSeriesQuery,
} from '../hooks/use-project-review-series';
import { PROJECT_REVIEW_MEETING_MODE_LABEL, PROJECT_REVIEW_TYPE_LABEL } from '../constants/project-enum-labels';
import type {
  ProjectReviewMeetingMode,
  ProjectReviewSeriesApi,
  ProjectReviewSeriesFrequency,
  ProjectReviewType,
} from '../types/project.types';
import {
  getCreateDefaultsForType,
  PROJECT_REVIEW_CREATE_DEFAULTS,
  agendaModelLabelForType,
} from '../lib/project-review-create-defaults';
import { usePrepareTemplatesQuery } from '../hooks/use-prepare-templates-query';
import {
  blocksForTypeCode,
  defaultSelectedBlockIds,
} from '../lib/prepare-workspace-blocks';
import {
  reviewTypeToTypeCode,
  type PrepWorkspaceCustomBlock,
} from '../lib/prepare-workspace-types';
import type { ProjectReviewPrepareTemplateApi } from '../api/project-reviews.api';

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

const AGENDA_BY_TYPE: Partial<Record<ProjectReviewType, string[]>> = {
  COPRO: [
    'Avancement des lots',
    'Points bloquants',
    'Risques et alertes',
    'Actions de la semaine',
    'Sujets à remonter au COPIL',
  ],
  COPIL: [
    "Synthèse d'avancement",
    'Consolidation des COPROJ',
    'Budget et trajectoire',
    'Risques majeurs',
    'Décisions et arbitrages',
    'Prochaines échéances',
  ],
  CODIR_REVIEW: [
    'Cap stratégique et alignement',
    'Portefeuille et priorisation',
    'Budget consolidé',
    'Décisions engageantes',
  ],
  PROJECT_REVIEW: [
    'Revue projet par projet',
    'Capacité et plan de charge',
    'Réallocations budgétaires',
    'Go / No Go',
  ],
  OTHER: ['Objet du point', 'Décision attendue'],
};

function agendaLinesForType(t: ProjectReviewType): string[] {
  return [...(AGENDA_BY_TYPE[t] ?? AGENDA_BY_TYPE.COPRO!)];
}

function parseOdjLines(
  stored: string | null | undefined,
  reviewType: ProjectReviewType,
): string[] {
  if (stored?.trim()) {
    return stored
      .split('\n')
      .map((l) => l.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
  }
  return agendaLinesForType(reviewType);
}

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

function typeOptionLabel(t: ProjectReviewType): string {
  return t === 'COPRO' ? 'COPROJ' : (PROJECT_REVIEW_TYPE_LABEL[t] ?? t);
}

function reviewTypeFromPrepCode(
  typeCode: ReturnType<typeof reviewTypeToTypeCode>,
): ProjectReviewType {
  if (typeCode === 'COPIL') return 'COPIL';
  if (typeCode === 'CODIR') return 'CODIR_REVIEW';
  if (typeCode === 'REVUE') return 'PROJECT_REVIEW';
  if (typeCode === 'ADHOC') return 'OTHER';
  return 'COPRO';
}

function odjLinesFromPrepareTemplate(
  tpl: ProjectReviewPrepareTemplateApi,
  typeCode: ReturnType<typeof reviewTypeToTypeCode>,
): string[] {
  const catalog = blocksForTypeCode(typeCode);
  const titleById = new Map(catalog.map((b) => [b.id, b.title]));
  const custom = Array.isArray(tpl.payload?.customBlocks)
    ? (tpl.payload.customBlocks as PrepWorkspaceCustomBlock[])
    : [];
  for (const c of custom) {
    if (c?.id && c.title?.trim()) titleById.set(c.id, c.title.trim());
  }
  const selected = Array.isArray(tpl.payload?.selectedBlockIds)
    ? (tpl.payload.selectedBlockIds as string[])
    : defaultSelectedBlockIds(typeCode);
  const order = Array.isArray(tpl.payload?.blockOrderIds)
    ? (tpl.payload.blockOrderIds as string[])
    : selected;
  const selectedSet = new Set(selected);
  const ordered = (order.length ? order : selected).filter((id) =>
    selectedSet.has(id),
  );
  const lines = ordered
    .map((id) => titleById.get(id)?.trim())
    .filter((t): t is string => Boolean(t));
  return lines.length > 0
    ? lines
    : agendaLinesForType(reviewTypeFromPrepCode(typeCode));
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
  const createDefaults = getCreateDefaultsForType(initial?.reviewType ?? 'COPRO');
  const initialAnchor = splitAnchorLocal(
    initial?.anchorDate ??
      (() => {
        const d = new Date();
        d.setHours(createDefaults.defaultHour, createDefaults.defaultMinute, 0, 0);
        return d.toISOString();
      })(),
  );
  const [title, setTitle] = useState(initial?.title ?? '');
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
  const [meetingMode, setMeetingMode] = useState<ProjectReviewMeetingMode | ''>(
    initial?.meetingMode ?? createDefaults.meetingMode,
  );
  const [location, setLocation] = useState(initial?.location ?? '');
  const [weekday, setWeekday] = useState(() =>
    weekdayFromIso(initial?.anchorDate ?? new Date().toISOString()),
  );
  const [anchorTime, setAnchorTime] = useState(initialAnchor.time || '09:30');
  const [horizonCount, setHorizonCount] = useState(
    String(initial?.horizonCount ?? 4),
  );
  const [participantIds, setParticipantIds] = useState<string[]>(
    initial?.permanentParticipantUserIds ?? [],
  );
  const [odjLines, setOdjLines] = useState<string[]>(() =>
    parseOdjLines(initial?.defaultObjective, initial?.reviewType ?? 'COPRO'),
  );
  const [upstreamSeriesId, setUpstreamSeriesId] = useState('');

  const prepTypeCode = reviewTypeToTypeCode(reviewType);
  const templatesQuery = usePrepareTemplatesQuery(projectId, prepTypeCode, {
    enabled: open,
  });
  const prepareTemplates = templatesQuery.data?.items ?? [];

  const userOptions = useMemo(() => {
    return (assignable.data?.users ?? []).map((u) => ({
      id: u.id,
      label: firstDisplayLabel(
        [[u.firstName, u.lastName].filter(Boolean).join(' ').trim(), u.email],
        'Utilisateur',
      ),
    }));
  }, [assignable.data]);

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
    agendaLinesForType(reviewType).length,
  );

  const applyTypeDefaults = (next: ProjectReviewType) => {
    const d = getCreateDefaultsForType(next);
    setReviewType(next);
    setPrepareTemplateId(null);
    setFrequency(frequencyForType(next));
    setDurationMinutes(d.durationMinutes);
    setMeetingMode(d.meetingMode);
    setAnchorTime(`${pad2(d.defaultHour)}:${pad2(d.defaultMinute)}`);
    setOdjLines(agendaLinesForType(next));
  };

  const applyPrepareTemplate = (templateId: string | null) => {
    setPrepareTemplateId(templateId);
    if (!templateId) {
      setOdjLines(agendaLinesForType(reviewType));
      return;
    }
    const tpl = prepareTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    setOdjLines(odjLinesFromPrepareTemplate(tpl, prepTypeCode));
  };

  const canSubmit = !pending;

  const buildBody = (): Record<string, unknown> => {
    const anchor = nextAnchorFromWeekday(weekday, anchorTime);
    const odj = odjLines.map((l) => l.trim()).filter(Boolean);
    return {
      title: title.trim() || `${typeOptionLabel(reviewType)} — sans titre`,
      reviewType,
      frequency,
      durationMinutes,
      meetingMode: meetingMode || null,
      location: location.trim() || null,
      defaultObjective: odj.length ? odj.join('\n') : null,
      permanentParticipantUserIds: participantIds,
      anchorDate: anchor.toISOString(),
      horizonCount: Math.min(12, Math.max(1, Number(horizonCount) || 4)),
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
              {prepareTemplateId
                ? 'Ce modèle préremplit l’ordre du jour type ci-dessous.'
                : prepareTemplates.length === 0
                  ? 'Aucun modèle enregistré pour ce type — utilisez Modèles pour en créer.'
                  : 'Modèle standard du type, ou un modèle enregistré.'}
            </p>
          </div>
        </div>

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
            placeholder={`${typeOptionLabel(reviewType)} — à nommer`}
            onChange={(e) => setTitle(e.target.value)}
            className="starium-form-input min-h-11"
            autoComplete="off"
          />
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
              placeholder="Salle Cadence / Teams"
              onChange={(e) => setLocation(e.target.value)}
              className="starium-form-input min-h-11"
            />
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="series-mode">
              Mode
            </label>
            <select
              id="series-mode"
              className="starium-form-select min-h-11 w-full"
              value={meetingMode}
              onChange={(e) =>
                setMeetingMode(e.target.value as ProjectReviewMeetingMode | '')
              }
            >
              <option value="">—</option>
              {(['REMOTE', 'ONSITE', 'HYBRID'] as const).map((m) => (
                <option key={m} value={m}>
                  {PROJECT_REVIEW_MEETING_MODE_LABEL[m] ?? m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="starium-form-field">
          <legend className="starium-form-label">Équipe permanente</legend>
          {userOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {assignable.isLoading
                ? 'Chargement des participants…'
                : 'Aucun utilisateur assignable.'}
            </p>
          ) : (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Équipe permanente"
            >
              {userOptions.map((u) => {
                const selected = participantIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    aria-pressed={selected}
                    className={cn(
                      'inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border-[1.5px] py-1 pl-1 pr-3 text-left text-xs font-bold transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected
                        ? 'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/40',
                    )}
                    onClick={() => {
                      setParticipantIds((prev) =>
                        selected
                          ? prev.filter((id) => id !== u.id)
                          : [...prev, u.id],
                      );
                    }}
                  >
                    <UserInitialsAvatar
                      displayName={u.label}
                      seed={u.id}
                      size="sm"
                      className="!size-6 !border-0 !text-[9.5px]"
                    />
                    <span className="truncate">{u.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        <div className="starium-form-field">
          <span className="starium-form-label" id="series-odj-label">
            Ordre du jour type
          </span>
          <div
            className="flex flex-col gap-1.5"
            role="list"
            aria-labelledby="series-odj-label"
          >
            {odjLines.map((line, index) => (
              <div
                key={`odj-${index}`}
                className="flex items-center gap-2"
                role="listitem"
              >
                <span
                  className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-muted text-[10.5px] font-extrabold text-muted-foreground"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <Input
                  value={line}
                  placeholder="Intitulé du point"
                  aria-label={`Point ${index + 1} de l'ordre du jour`}
                  onChange={(e) => {
                    const next = [...odjLines];
                    next[index] = e.target.value;
                    setOdjLines(next);
                  }}
                  className="starium-form-input min-h-11"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0 sm:size-9"
                  aria-label={`Retirer le point ${index + 1}`}
                  onClick={() =>
                    setOdjLines((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 min-h-11 w-full rounded-[var(--radius-md)] border border-dashed border-border/80 px-3 text-sm font-bold text-muted-foreground transition-colors hover:border-[color:var(--brand-gold)] hover:bg-[color:var(--brand-gold-050)] hover:text-[color:var(--brand-gold-700)]"
            onClick={() => setOdjLines((prev) => [...prev, ''])}
          >
            + Ajouter un point à l&apos;ordre du jour type
          </button>
        </div>

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
                <th scope="col">Lieu / mode</th>
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
                const modeLabel = row.meetingMode
                  ? (PROJECT_REVIEW_MEETING_MODE_LABEL[row.meetingMode] ??
                    row.meetingMode)
                  : null;
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
                      {displayLabel(
                        [row.location, modeLabel].filter(Boolean).join(' · ') || null,
                        '—',
                      )}
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
