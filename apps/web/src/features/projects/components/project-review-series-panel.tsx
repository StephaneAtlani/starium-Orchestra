'use client';

import { useMemo, useState } from 'react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { StariumTableWrap } from '@/components/ui/starium-table-wrap';
import { toast } from '@/lib/toast';
import type { ApiFormError } from '@/features/budgets/api/types';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
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
import { PROJECT_REVIEW_CREATE_DEFAULTS } from '../lib/project-review-create-defaults';
import { Plus } from 'lucide-react';

const SERIES_TYPES: ProjectReviewType[] = PROJECT_REVIEW_CREATE_DEFAULTS.map(
  (d) => d.reviewType,
);

const FREQUENCIES: ProjectReviewSeriesFrequency[] = [
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'QUARTERLY',
];

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SeriesFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ProjectReviewSeriesApi | null;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
  pending: boolean;
}) {
  const assignable = useProjectAssignableUsers();
  const [title, setTitle] = useState(initial?.title ?? 'Série COPROJ');
  const [reviewType, setReviewType] = useState<ProjectReviewType>(
    initial?.reviewType ?? 'COPRO',
  );
  const [frequency, setFrequency] = useState<ProjectReviewSeriesFrequency>(
    initial?.frequency ?? 'BIWEEKLY',
  );
  const [durationMinutes, setDurationMinutes] = useState(
    String(initial?.durationMinutes ?? 60),
  );
  const [meetingMode, setMeetingMode] = useState<ProjectReviewMeetingMode | ''>(
    initial?.meetingMode ?? 'HYBRID',
  );
  const [location, setLocation] = useState(initial?.location ?? '');
  const [anchorDate, setAnchorDate] = useState(
    initial ? toLocalInputValue(initial.anchorDate) : toLocalInputValue(new Date().toISOString()),
  );
  const [horizonCount, setHorizonCount] = useState(String(initial?.horizonCount ?? 4));
  const [participantIds, setParticipantIds] = useState<string[]>(
    initial?.permanentParticipantUserIds ?? [],
  );

  const userOptions = useMemo(() => {
    return (assignable.data?.users ?? []).map((u) => ({
      id: u.id,
      label: firstDisplayLabel(
        [[u.firstName, u.lastName].filter(Boolean).join(' ').trim(), u.email],
        'Utilisateur',
      ),
    }));
  }, [assignable.data]);

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Modifier la série' : 'Nouvelle série'}
      description="Récurrence de points projet — les séances générées restent éditables."
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={pending || !title.trim() || !anchorDate}
            onClick={() => {
              void onSubmit({
                title: title.trim(),
                reviewType,
                frequency,
                durationMinutes: Number(durationMinutes) || 60,
                meetingMode: meetingMode || null,
                location: location.trim() || null,
                permanentParticipantUserIds: participantIds,
                anchorDate: new Date(anchorDate).toISOString(),
                horizonCount: Math.min(12, Math.max(1, Number(horizonCount) || 4)),
              });
            }}
          >
            {initial ? 'Enregistrer' : 'Créer la série'}
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-4">
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="series-title">
            Titre
          </label>
          <Input
            id="series-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="starium-form-input"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="series-type">
              Type
            </label>
            <select
              id="series-type"
              className="starium-form-input"
              value={reviewType}
              onChange={(e) => setReviewType(e.target.value as ProjectReviewType)}
            >
              {SERIES_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'COPRO'
                    ? 'COPROJ'
                    : (PROJECT_REVIEW_TYPE_LABEL[t] ?? t)}
                </option>
              ))}
            </select>
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="series-freq">
              Fréquence
            </label>
            <select
              id="series-freq"
              className="starium-form-input"
              value={frequency}
              onChange={(e) =>
                setFrequency(e.target.value as ProjectReviewSeriesFrequency)
              }
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f === 'WEEKLY'
                    ? 'Hebdomadaire'
                    : f === 'BIWEEKLY'
                      ? 'Bihebdomadaire'
                      : f === 'MONTHLY'
                        ? 'Mensuelle'
                        : 'Trimestrielle'}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="series-duration">
              Durée (min)
            </label>
            <Input
              id="series-duration"
              type="number"
              min={15}
              max={480}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="starium-form-input"
            />
          </div>
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="series-horizon">
              Horizon (occurrences)
            </label>
            <Input
              id="series-horizon"
              type="number"
              min={1}
              max={12}
              value={horizonCount}
              onChange={(e) => setHorizonCount(e.target.value)}
              className="starium-form-input"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="series-mode">
              Mode
            </label>
            <select
              id="series-mode"
              className="starium-form-input"
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
          <div className="starium-form-field">
            <label className="starium-form-label" htmlFor="series-location">
              Lieu / salle
            </label>
            <Input
              id="series-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="starium-form-input"
            />
          </div>
        </div>
        <div className="starium-form-field">
          <label className="starium-form-label" htmlFor="series-anchor">
            Ancre (prochaine date)
          </label>
          <Input
            id="series-anchor"
            type="datetime-local"
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
            className="starium-form-input"
          />
        </div>
        <fieldset className="starium-form-field">
          <legend className="starium-form-label">Équipe permanente</legend>
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-[var(--radius-md)] border border-border p-2">
            {userOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun utilisateur assignable.</p>
            ) : (
              userOptions.map((u) => {
                const checked = participantIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex min-h-11 items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setParticipantIds((prev) =>
                          checked
                            ? prev.filter((id) => id !== u.id)
                            : [...prev, u.id],
                        );
                      }}
                    />
                    <span>{u.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </fieldset>
      </div>
    </StariumModal>
  );
}

export function ProjectReviewSeriesPanel({
  projectId,
  canEdit,
}: {
  projectId: string;
  canEdit: boolean;
}) {
  const list = useProjectReviewSeriesQuery(projectId);
  const { create, update, generate } = useProjectReviewSeriesMutations(projectId);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectReviewSeriesApi | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-3">
      {canEdit ? (
        <div className="flex justify-end">
          <button
            type="button"
            className="starium-btn starium-btn-primary min-h-11"
            onClick={openCreate}
          >
            <Plus strokeWidth={2.5} aria-hidden />
            Nouvelle série
          </button>
        </div>
      ) : null}

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
                <th scope="col">Fréquence</th>
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
                    <td>{row.frequencyLabel}</td>
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
          initial={editing}
          pending={create.isPending || update.isPending}
          onSubmit={async (body) => {
            try {
              if (editing) {
                await update.mutateAsync({ seriesId: editing.id, body });
                toast.success('Série mise à jour');
              } else {
                await create.mutateAsync(body);
                toast.success('Série créée');
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
