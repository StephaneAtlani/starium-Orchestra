'use client';

import { Check } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Textarea } from '@/components/ui/textarea';
import { displayLabel } from '@/lib/display-label';
import type { ProjectGanttPayload } from '../api/projects.api';
import type { PrepPlanningMode, PrepPlanningPayload } from '../lib/prepare-workspace-types';

export type PrepPlanPhaseTone = 'done' | 'cur' | 'todo';

export type PrepPlanPhase = {
  id: string;
  name: string;
  weight: number;
  tone: PrepPlanPhaseTone;
};

export type PrepPlanMilestoneTone = 'done' | 'cur' | 'late' | 'risk' | 'todo';

export type PrepPlanMilestone = {
  id: string;
  name: string;
  meta: string;
  tone: PrepPlanMilestoneTone;
  phaseName: string | null;
};

const PLAN_MODES: Array<{ id: PrepPlanningMode; label: string; hint: string }> = [
  { id: 'macro', label: 'Vue macro', hint: 'Phases et jalons clés' },
  { id: 'detail', label: 'Vue détaillée', hint: 'Phases, jalons et tâches rattachées' },
];

function milestoneTone(
  status: string,
  targetDate: string,
  isLate?: boolean,
): PrepPlanMilestoneTone {
  const s = status.toUpperCase();
  if (s === 'DONE' || s === 'COMPLETED' || s === 'ACHIEVED') return 'done';
  if (s === 'CANCELLED') return 'todo';
  if (isLate || s === 'LATE' || s === 'OVERDUE') return 'late';
  if (s === 'AT_RISK' || s === 'RISK') return 'risk';
  if (s === 'IN_PROGRESS' || s === 'ACTIVE') return 'cur';
  if (targetDate) {
    const t = new Date(targetDate).getTime();
    if (Number.isFinite(t) && t < Date.now() - 86_400_000) return 'late';
  }
  return 'todo';
}

function phaseToneFromProgress(progress: number | null | undefined): PrepPlanPhaseTone {
  if (progress != null && progress >= 100) return 'done';
  if (progress != null && progress > 0) return 'cur';
  return 'todo';
}

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function toneLabel(tone: PrepPlanMilestoneTone): string {
  switch (tone) {
    case 'done':
      return 'Terminé';
    case 'cur':
      return 'En cours';
    case 'late':
      return 'En retard';
    case 'risk':
      return 'À risque';
    default:
      return 'À venir';
  }
}

/** Agrège Gantt → phases + jalons pour la frise kit. */
export function buildPrepPlanModel(gantt: ProjectGanttPayload | undefined): {
  phases: PrepPlanPhase[];
  milestones: PrepPlanMilestone[];
  openTaskCount: number;
  lateCount: number;
  riskCount: number;
} {
  if (!gantt) {
    return {
      phases: [],
      milestones: [],
      openTaskCount: 0,
      lateCount: 0,
      riskCount: 0,
    };
  }

  const phases: PrepPlanPhase[] = [...gantt.phases]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({
      id: p.id,
      name: displayLabel(p.name, 'Phase'),
      weight: Math.max(1, p.derivedDurationDays ?? 1),
      tone: phaseToneFromProgress(p.derivedProgress),
    }));

  const phaseNameById = new Map(phases.map((p) => [p.id, p.name]));

  const milestones: PrepPlanMilestone[] = [...gantt.milestones]
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.targetDate.localeCompare(b.targetDate),
    )
    .map((m) => {
      const tone = milestoneTone(m.status, m.targetDate, m.isLate);
      const date = formatDateFr(m.targetDate);
      const phaseName = m.phaseId ? phaseNameById.get(m.phaseId) ?? null : null;
      const parts = [date, toneLabel(tone), phaseName].filter(Boolean);
      return {
        id: m.id,
        name: displayLabel(m.name, 'Jalon'),
        meta: parts.join(' · '),
        tone,
        phaseName,
      };
    });

  const tasks = [
    ...gantt.phases.flatMap((p) => p.tasks),
    ...gantt.ungroupedTasks,
  ];
  const openTaskCount = tasks.filter((t) => {
    const s = (t.status ?? '').toUpperCase();
    return s !== 'DONE' && s !== 'CANCELLED' && s !== 'COMPLETED';
  }).length;

  return {
    phases,
    milestones,
    openTaskCount,
    lateCount: milestones.filter((m) => m.tone === 'late').length,
    riskCount: milestones.filter((m) => m.tone === 'risk').length,
  };
}

export function defaultPlanningSelection(
  milestones: PrepPlanMilestone[],
  existing?: PrepPlanningPayload | null,
): PrepPlanningPayload {
  if (existing) {
    return {
      mode: existing.mode ?? 'macro',
      selectedMilestoneIds: existing.selectedMilestoneIds ?? [],
      note: existing.note ?? '',
    };
  }
  return {
    mode: 'macro',
    selectedMilestoneIds: milestones
      .filter((m) => m.tone !== 'done')
      .map((m) => m.id),
    note: '',
  };
}

export function planSummaryText(model: {
  phases: PrepPlanPhase[];
  milestones: PrepPlanMilestone[];
  lateCount: number;
  riskCount: number;
  openTaskCount: number;
}, mode: PrepPlanningMode, presentCount: number): string {
  const parts = [
    `${model.phases.length} phase${model.phases.length > 1 ? 's' : ''}`,
    `${model.milestones.length} jalon${model.milestones.length > 1 ? 's' : ''}`,
  ];
  if (model.lateCount > 0) {
    parts.push(`${model.lateCount} en retard`);
  }
  if (model.riskCount > 0) {
    parts.push(`${model.riskCount} à risque`);
  }
  if (mode === 'detail' && model.openTaskCount > 0) {
    parts.push(
      `${model.openTaskCount} tâche${model.openTaskCount > 1 ? 's' : ''}`,
    );
  }
  parts.push(`${presentCount} à présenter`);
  return parts.join(' · ');
}

type PanelProps = {
  gantt: ProjectGanttPayload | undefined;
  loading: boolean;
  error: boolean;
  value: PrepPlanningPayload;
  canEdit: boolean;
  onChange: (next: PrepPlanningPayload) => void;
};

export function PrepareWorkspacePlanningPanel({
  gantt,
  loading,
  error,
  value,
  canEdit,
  onChange,
}: PanelProps) {
  const model = buildPrepPlanModel(gantt);
  const selected = new Set(value.selectedMilestoneIds);
  const totalWeight = model.phases.reduce((s, p) => s + p.weight, 0) || 1;

  if (loading) return <LoadingState rows={4} />;
  if (error) {
    return (
      <EmptyState
        title="Planning indisponible"
        description="Impossible de charger les phases et jalons du projet."
      />
    );
  }
  if (model.phases.length === 0 && model.milestones.length === 0) {
    return (
      <EmptyState
        title="Aucun planning"
        description="Ajoutez des phases ou des jalons sur le projet pour les préparer ici."
      />
    );
  }

  let cursor = 0;

  return (
    <div className="prepare-point">
      <div className="prepare-plan__head">
        <p className="prepare-point__grp" style={{ margin: 0 }}>
          Planning du projet
        </p>
        <div className="prepare-plan__segs" role="group" aria-label="Mode d’affichage">
          {PLAN_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`prepare-plan__seg${value.mode === m.id ? ' is-on' : ''}`}
              aria-pressed={value.mode === m.id}
              disabled={!canEdit}
              title={m.hint}
              onClick={() => onChange({ ...value, mode: m.id })}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="prepare-plan__plv" aria-label="Frise des phases">
        {model.phases.map((p) => {
          const left = (cursor / totalWeight) * 100;
          const width = (p.weight / totalWeight) * 100;
          cursor += p.weight;
          const phaseMs = model.milestones.filter(
            (m) => m.phaseName === p.name,
          );
          return (
            <div key={p.id} className="prepare-plan__row">
              <div className="prepare-plan__name">{p.name}</div>
              <div className="prepare-plan__track">
                <div
                  className={`prepare-plan__bar is-${p.tone}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
                {phaseMs.map((m, i) => (
                  <span
                    key={m.id}
                    className={`prepare-plan__dia is-${m.tone}`}
                    style={{
                      left: `${left + width * (0.55 + i * 0.12)}%`,
                    }}
                    title={`${m.name} · ${m.meta}`}
                  />
                ))}
              </div>
              {value.mode === 'detail' && phaseMs.length > 0 ? (
                <div className="prepare-plan__det">
                  {phaseMs.map((m) => (
                    <div key={m.id} className="prepare-plan__det-j">
                      <span
                        className={`prepare-plan__diamond is-${m.tone}`}
                        aria-hidden
                      />
                      <span className="prepare-plan__det-t">{m.name}</span>
                      <span className="prepare-plan__det-m">{m.meta}</span>
                      <span className={`prepare-plan__pill is-${m.tone}`}>
                        {toneLabel(m.tone)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        <div className="prepare-plan__leg" aria-hidden>
          <span>
            <i className="is-done" />
            Terminé
          </span>
          <span>
            <i className="is-cur" />
            En cours
          </span>
          <span>
            <i className="is-todo" />
            À venir
          </span>
          <span>
            <i className="is-late prepare-plan__leg-dia" />
            Jalon en retard
          </span>
        </div>
      </div>

      <p className="prepare-point__grp">Jalons à présenter</p>
      <p className="prepare-point__hint">
        Cochez les jalons à passer en revue — chacun recevra un verdict en séance.
      </p>
      <div className="prepare-plan__jals" role="list" aria-label="Jalons">
        {model.milestones.length === 0 ? (
          <p className="prepare-point__empty">Aucun jalon sur ce projet</p>
        ) : (
          model.milestones.map((m) => {
            const on = selected.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                role="listitem"
                className={`prepare-plan__jal${on ? ' is-on' : ''}`}
                disabled={!canEdit}
                aria-pressed={on}
                onClick={() => {
                  const next = on
                    ? value.selectedMilestoneIds.filter((id) => id !== m.id)
                    : [...value.selectedMilestoneIds, m.id];
                  onChange({ ...value, selectedMilestoneIds: next });
                }}
              >
                <span
                  className={`prepare-workspace__chk${on ? ' is-on' : ''}`}
                  aria-hidden
                >
                  {on ? <Check className="size-2.5" /> : null}
                </span>
                <span
                  className={`prepare-plan__diamond is-${m.tone}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 text-left">
                  <span className="prepare-plan__det-t block">{m.name}</span>
                  <span className="prepare-plan__det-m block">{m.meta}</span>
                </span>
                <span className={`prepare-plan__pill is-${m.tone}`}>
                  {toneLabel(m.tone)}
                </span>
              </button>
            );
          })
        )}
      </div>

      <p className="prepare-point__grp">Commentaire</p>
      <Textarea
        value={value.note ?? ''}
        disabled={!canEdit}
        placeholder="Points d’attention sur le planning, glissements à annoncer…"
        rows={3}
        className="prepare-point__note"
        aria-label="Commentaire planning"
        onChange={(e) => onChange({ ...value, note: e.target.value })}
      />
    </div>
  );
}

/** Mini-frise pour la ligne ODJ « Le planning ». */
export function PreparePlanMiniBar({ phases }: { phases: PrepPlanPhase[] }) {
  if (phases.length === 0) return null;
  return (
    <span className="prepare-plan-mini" aria-hidden>
      {phases.map((p) => (
        <i
          key={p.id}
          className={`is-${p.tone}`}
          style={{ flex: p.weight }}
        />
      ))}
    </span>
  );
}
