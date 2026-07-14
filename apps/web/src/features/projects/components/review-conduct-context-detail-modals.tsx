'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MergedUiBadges } from '@/lib/ui/badge-registry';
import {
  ARBITRATION_LEVEL_STATUS_LABEL,
  MILESTONE_STATUS_LABEL,
  PROJECT_PRIORITY_LABEL,
  PROJECT_RISK_IMPACT_CATEGORY_LABEL,
  TASK_STATUS_LABEL,
  projectWarningLabel,
} from '../constants/project-enum-labels';
import { projectSheet } from '../constants/project-routes';
import {
  riskCriticalityLabel,
  riskPiShortLabel,
  riskStatusLabel,
} from '../lib/project-risk-display';
import type {
  ProjectDetail,
  ProjectMilestoneApi,
  ProjectReviewActionItemApi,
  ProjectRiskApi,
  ProjectTaskApi,
} from '../types/project.types';
import { HealthBadge, ProjectPortfolioBadges } from './project-badges';
import {
  AlertTriangle,
  CalendarClock,
  Flag,
  History,
  Info,
  Scale,
  Target,
} from 'lucide-react';

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-border/50 py-2.5 last:border-0">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-relaxed text-foreground">{children}</dd>
    </div>
  );
}

function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatReviewDateTime(iso: string | null | undefined): string {
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

export const conductContextClickableClass = cn(
  'w-full rounded-lg border border-border/60 bg-muted/15 p-2.5 text-left text-sm',
  'min-h-11 cursor-pointer transition-colors hover:bg-muted/30',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
);

export type ConductContextDetailState =
  | { kind: 'closed' }
  | { kind: 'risk'; risk: ProjectRiskApi }
  | { kind: 'milestone'; milestone: ProjectMilestoneApi }
  | { kind: 'action'; action: ProjectReviewActionItemApi }
  | {
      kind: 'arbitration';
      label: string;
      status: string | null;
      note: string | null;
    }
  | { kind: 'warning'; code: string }
  | { kind: 'meteo'; project: ProjectDetail; badgeMerged: MergedUiBadges }
  | {
      kind: 'since-last';
      variant: 'tasks' | 'risks' | 'milestones';
      tasks?: ProjectTaskApi[];
      risks?: ProjectRiskApi[];
      milestones?: ProjectMilestoneApi[];
    }
  | {
      kind: 'progress';
      project: ProjectDetail;
      milestones: ProjectMilestoneApi[];
    };

type Props = {
  projectId: string;
  state: ConductContextDetailState;
  onClose: () => void;
};

export function ReviewConductContextDetailModals({ projectId, state, onClose }: Props) {
  const open = state.kind !== 'closed';

  const closeFooter = (
    <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>
      Fermer
    </Button>
  );

  if (state.kind === 'closed') return null;

  if (state.kind === 'risk') {
    const r = state.risk;
    const actionPlan = r.mitigationPlan?.trim() || r.complementaryTreatmentMeasures?.trim();
    return (
      <StariumModal
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title={r.title}
        description={r.code ? `Réf. ${r.code}` : 'Risque projet'}
        icon={Flag}
        size="lg"
        footer={closeFooter}
      >
        <dl className="divide-y divide-border/50">
          <DetailRow label="Statut">{riskStatusLabel(r.status)}</DetailRow>
          <DetailRow label="Criticité">{riskCriticalityLabel(r.criticalityLevel)}</DetailRow>
          <DetailRow label="Probabilité">
            {r.probability} — {riskPiShortLabel(r.probability)}
          </DetailRow>
          <DetailRow label="Impact">
            {r.impact} — {riskPiShortLabel(r.impact)}
          </DetailRow>
          {r.impactCategory ? (
            <DetailRow label="Catégorie d'impact">
              {PROJECT_RISK_IMPACT_CATEGORY_LABEL[r.impactCategory] ?? r.impactCategory}
            </DetailRow>
          ) : null}
          {r.description?.trim() ? (
            <DetailRow label="Description">{r.description}</DetailRow>
          ) : null}
          {r.fearedEvent?.trim() ? (
            <DetailRow label="Événement redouté">{r.fearedEvent}</DetailRow>
          ) : null}
          {r.businessImpact?.trim() ? (
            <DetailRow label="Impact métier">{r.businessImpact}</DetailRow>
          ) : null}
          <DetailRow label="Plan d'action">
            {actionPlan ? (
              actionPlan
            ) : (
              <span className="starium-text-warning-emphasis font-semibold">
                Plan d&apos;action non renseigné
              </span>
            )}
          </DetailRow>
          {r.contingencyPlan?.trim() ? (
            <DetailRow label="Plan de contingence">{r.contingencyPlan}</DetailRow>
          ) : null}
          {r.dueDate ? (
            <DetailRow label="Échéance de revue">{formatDateOnly(r.dueDate)}</DetailRow>
          ) : null}
        </dl>
      </StariumModal>
    );
  }

  if (state.kind === 'milestone') {
    const m = state.milestone;
    return (
      <StariumModal
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title={m.name}
        description={m.code ? `Code ${m.code}` : 'Jalon projet'}
        icon={Target}
        size="md"
        footer={closeFooter}
      >
        <dl>
          <DetailRow label="Statut">
            {MILESTONE_STATUS_LABEL[m.status] ?? m.status}
          </DetailRow>
          <DetailRow label="Date cible">{formatDateOnly(m.targetDate)}</DetailRow>
          {m.achievedDate ? (
            <DetailRow label="Date d'atteinte">{formatDateOnly(m.achievedDate)}</DetailRow>
          ) : null}
          {m.description?.trim() ? (
            <DetailRow label="Description">{m.description}</DetailRow>
          ) : null}
        </dl>
      </StariumModal>
    );
  }

  if (state.kind === 'action') {
    const a = state.action;
    return (
      <StariumModal
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title={a.title}
        description="Action du point précédent"
        icon={History}
        size="md"
        footer={closeFooter}
      >
        <dl>
          <DetailRow label="Statut">{TASK_STATUS_LABEL[a.status] ?? a.status}</DetailRow>
          {a.priority ? (
            <DetailRow label="Priorité">
              {PROJECT_PRIORITY_LABEL[a.priority] ?? a.priority}
            </DetailRow>
          ) : null}
          <DetailRow label="Échéance">{formatReviewDateTime(a.dueDate)}</DetailRow>
          {a.responsibleDisplayName?.trim() ? (
            <DetailRow label="Responsable">{a.responsibleDisplayName}</DetailRow>
          ) : null}
          {a.description?.trim() ? (
            <DetailRow label="Description">{a.description}</DetailRow>
          ) : null}
        </dl>
      </StariumModal>
    );
  }

  if (state.kind === 'arbitration') {
    return (
      <StariumModal
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title={state.label}
        description="Niveau d'arbitrage — fiche projet"
        icon={Scale}
        size="md"
        footer={
          <>
            <Button type="button" variant="outline" className="min-h-11" asChild>
              <Link href={projectSheet(projectId)}>Ouvrir la fiche projet</Link>
            </Button>
            {closeFooter}
          </>
        }
      >
        <dl>
          <DetailRow label="Statut">
            {state.status
              ? (ARBITRATION_LEVEL_STATUS_LABEL[state.status] ?? state.status)
              : '—'}
          </DetailRow>
          {state.note?.trim() ? (
            <DetailRow label="Note / motif de refus">{state.note}</DetailRow>
          ) : (
            <DetailRow label="Note">Aucune note enregistrée.</DetailRow>
          )}
        </dl>
      </StariumModal>
    );
  }

  if (state.kind === 'warning') {
    return (
      <StariumModal
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title="Alerte projet"
        description="Signal de pilotage"
        icon={AlertTriangle}
        size="md"
        footer={closeFooter}
      >
        <p className="text-sm leading-relaxed text-foreground">
          {projectWarningLabel(state.code)}
        </p>
      </StariumModal>
    );
  }

  if (state.kind === 'meteo') {
    const p = state.project;
    const av = p.derivedProgressPercent ?? p.progressPercent ?? null;
    return (
      <StariumModal
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title="Indicateurs projet"
        description="Santé et signaux de pilotage"
        icon={Target}
        size="md"
        footer={closeFooter}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <HealthBadge health={p.computedHealth} merged={state.badgeMerged} />
            <ProjectPortfolioBadges signals={p.signals} merged={state.badgeMerged} />
          </div>
          <dl>
            <DetailRow label="Avancement (dérivé / manuel)">
              {p.derivedProgressPercent != null ? `${p.derivedProgressPercent} %` : '—'}
              {' / '}
              {p.progressPercent != null ? `${p.progressPercent} %` : '—'}
            </DetailRow>
            <DetailRow label="Tâches ouvertes">{p.openTasksCount ?? '—'}</DetailRow>
            <DetailRow label="Risques ouverts">{p.openRisksCount ?? '—'}</DetailRow>
            <DetailRow label="Jalons en retard">{p.delayedMilestonesCount ?? '—'}</DetailRow>
            {av != null ? (
              <DetailRow label="Avancement affiché">{`${av} %`}</DetailRow>
            ) : null}
          </dl>
        </div>
      </StariumModal>
    );
  }

  if (state.kind === 'since-last') {
    const titles = {
      tasks: 'Tâches terminées depuis le dernier point',
      risks: 'Risques ouverts',
      milestones: 'Jalons en dérive',
    } as const;
    const icons = { tasks: CalendarClock, risks: Flag, milestones: Target } as const;
    const Icon = icons[state.variant];

    return (
      <StariumModal
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title={titles[state.variant]}
        description="Depuis la clôture du point précédent"
        icon={Icon}
        size="lg"
        footer={closeFooter}
      >
        {state.variant === 'tasks' ? (
          state.tasks?.length ? (
            <ul className="space-y-2">
              {state.tasks.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-foreground">{t.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {TASK_STATUS_LABEL[t.status] ?? t.status}
                    {t.actualEndDate ? ` · fin ${formatDateOnly(t.actualEndDate)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune tâche terminée sur la période.</p>
          )
        ) : null}
        {state.variant === 'risks' ? (
          state.risks?.length ? (
            <ul className="space-y-2">
              {state.risks.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-foreground">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {riskCriticalityLabel(r.criticalityLevel)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun risque ouvert.</p>
          )
        ) : null}
        {state.variant === 'milestones' ? (
          state.milestones?.length ? (
            <ul className="space-y-2">
              {state.milestones.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-foreground">{m.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Cible {formatDateOnly(m.targetDate)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun jalon en dérive.</p>
          )
        ) : null}
      </StariumModal>
    );
  }

  if (state.kind === 'progress') {
    const achieved = state.milestones.filter((m) => m.status === 'ACHIEVED');
    const planned = state.milestones.filter((m) => m.status === 'PLANNED');
    const delayed = state.milestones.filter((m) => m.status === 'DELAYED');
    const p = state.project;

    return (
      <StariumModal
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title="Avancement projet"
        description="Jalons et pourcentages"
        icon={Target}
        size="lg"
        footer={closeFooter}
      >
        <dl className="mb-4">
          <DetailRow label="Avancement manuel / dérivé">
            {p.progressPercent != null ? `${p.progressPercent} %` : '—'}
            {' / '}
            {p.derivedProgressPercent != null ? `${p.derivedProgressPercent} %` : '—'}
          </DetailRow>
        </dl>
        {(
          [
            ['Atteints', achieved],
            ['Prochains', planned],
            ['En dérive', delayed],
          ] as const
        ).map(([label, items]) => (
          <div key={label} className="mb-4 last:mb-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label} ({items.length})
            </p>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-1.5">
                {items.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-md border border-border/60 px-2.5 py-2 text-sm text-foreground"
                  >
                    {m.name}
                    {m.targetDate ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        · {formatDateOnly(m.targetDate)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </StariumModal>
    );
  }

  return null;
}
