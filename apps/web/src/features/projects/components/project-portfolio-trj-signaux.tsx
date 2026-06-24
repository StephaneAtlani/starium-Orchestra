'use client';

import { AlertTriangle, Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectListItem, ProjectSignals } from '../types/project.types';

type TrjTone = 'success' | 'warning' | 'danger' | 'info' | 'muted';

const TRJ_TONE_CLASS: Record<TrjTone, string> = {
  success: 'border-emerald-600 text-emerald-700',
  warning: 'border-amber-500 text-amber-700',
  danger: 'border-red-700 text-red-800',
  info: 'border-sky-500 text-sky-700',
  muted: 'border-border/80 text-muted-foreground/55',
};

/** Tâches ouvertes = charge normale (info), pas warning. Warning réservé aux lacunes. */
export function trjToneForTasks(project: ProjectListItem): TrjTone {
  if (project.signals.hasNoTasks) return 'muted';
  if (project.openTasksCount === 0) return 'success';
  return 'info';
}

/** Risques ouverts suivis = OK (success). Warning = registre vide ; danger = risque élevé/critique. */
export function trjToneForRisks(project: ProjectListItem): TrjTone {
  if (project.signals.hasNoRisks) return 'warning';
  if (project.signals.isCritical) return 'danger';
  return 'success';
}

export function trjToneForMilestones(project: ProjectListItem): TrjTone {
  if (project.signals.hasNoMilestones) return 'muted';
  if (project.delayedMilestonesCount === 0) return 'success';
  if (project.delayedMilestonesCount >= 2) return 'danger';
  return 'warning';
}

export type PortfolioSignalIconKind = 'ok' | 'warning' | 'info';

export function resolvePortfolioSignalIconKind(signals: ProjectSignals): PortfolioSignalIconKind {
  if (signals.isLate || signals.isBlocked || signals.isCritical) return 'warning';
  if (
    signals.hasNoOwner ||
    signals.hasNoRisks ||
    signals.hasNoTasks ||
    signals.hasNoMilestones ||
    signals.hasPlanningDrift
  ) {
    return 'info';
  }
  return 'ok';
}

/** Libellé court de l’icône affichée (priorité identique au rendu). */
export function projectPortfolioSignalTip(signals: ProjectSignals): string {
  if (signals.isLate) return 'En retard';
  if (signals.isBlocked) return 'Bloqué';
  if (signals.isCritical) return 'Critique';
  if (signals.hasPlanningDrift) return 'Dérive planning';
  if (signals.hasNoOwner) return 'Sans responsable';
  if (signals.hasNoRisks) return 'Sans étude de risque';
  if (signals.hasNoTasks) return 'Aucune tâche';
  if (signals.hasNoMilestones) return 'Aucun jalon';
  return 'Pilotage conforme';
}

function TrjLetterBadge({
  letter,
  tone,
}: {
  letter: 'T' | 'R' | 'J';
  tone: TrjTone;
}) {
  return (
    <span
      className={cn(
        'starium-trj-badge inline-flex size-[1.375rem] items-center justify-center rounded-full border bg-transparent text-[0.625rem] font-bold leading-none',
        TRJ_TONE_CLASS[tone],
      )}
      aria-hidden
    >
      {letter}
    </span>
  );
}

export function ProjectTrjBadges({ project }: { project: ProjectListItem }) {
  return (
    <span className="inline-flex items-center justify-center gap-1" aria-hidden>
      <TrjLetterBadge letter="T" tone={trjToneForTasks(project)} />
      <TrjLetterBadge letter="R" tone={trjToneForRisks(project)} />
      <TrjLetterBadge letter="J" tone={trjToneForMilestones(project)} />
    </span>
  );
}

export function ProjectPortfolioSignalIcon({ signals }: { signals: ProjectSignals }) {
  const kind = resolvePortfolioSignalIconKind(signals);
  const tip = projectPortfolioSignalTip(signals);

  if (kind === 'ok') {
    return (
      <span
        className="starium-signal-icon starium-signal-icon--ok inline-flex size-7 items-center justify-center rounded-full border-2 border-emerald-600 text-emerald-700"
        aria-label={tip}
      >
        <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }

  if (kind === 'warning') {
    return (
      <span
        className="starium-signal-icon starium-signal-icon--warning inline-flex size-7 items-center justify-center text-amber-600"
        aria-label={tip}
      >
        <AlertTriangle className="size-[1.125rem]" strokeWidth={2} aria-hidden />
      </span>
    );
  }

  return (
    <span
      className="starium-signal-icon starium-signal-icon--info inline-flex size-7 items-center justify-center rounded-full border-2 border-sky-500 text-sky-600"
      aria-label={tip}
    >
      <Info className="size-3.5" strokeWidth={2.5} aria-hidden />
    </span>
  );
}
