import type { ProjectListItem, ProjectListPilotageSnapshot } from '../types/project.types';
import { formatProjectDateLong } from './projects-list-display';

/** Snapshot minimal quand l’API liste n’a pas encore `pilotageSnapshot` (cache / déploiement). */
export function buildPilotageSnapshotFallback(
  project: ProjectListItem,
): ProjectListPilotageSnapshot {
  const issues: string[] = [];

  if (project.signals.isLate && project.targetEndDate) {
    issues.push(
      `Échéance projet dépassée (${formatProjectDateLong(project.targetEndDate)})`,
    );
  }
  if (project.signals.isBlocked) {
    issues.push('Projet en pause');
  }
  if (project.delayedMilestonesCount > 0) {
    issues.push(`${project.delayedMilestonesCount} jalon(s) en retard`);
  }
  if (project.signals.hasNoOwner) {
    issues.push('Aucun responsable désigné');
  }
  if (project.signals.hasNoRisks) {
    issues.push('Aucun risque enregistré');
  }
  if (project.signals.hasNoTasks) {
    issues.push('Aucune tâche planifiée');
  }
  if (project.signals.hasNoMilestones) {
    issues.push('Aucun jalon défini');
  }

  const ok: string[] = [];

  if (project.ownerDisplayName) {
    ok.push(`Responsable : ${project.ownerDisplayName}`);
  }
  if (!project.signals.isLate && project.targetEndDate) {
    ok.push(`Échéance projet : ${formatProjectDateLong(project.targetEndDate)}`);
  }
  if (project.delayedMilestonesCount === 0 && !project.signals.hasNoMilestones) {
    ok.push('Aucun jalon en retard');
  }
  if (!project.signals.hasNoRisks) {
    ok.push('Registre des risques alimenté');
  }
  if (project.openRisksCount === 0 && !project.signals.hasNoRisks) {
    ok.push('Aucun risque ouvert');
  }
  if (project.openTasksCount === 0 && !project.signals.hasNoTasks) {
    ok.push('Toutes les tâches sont terminées');
  }
  if (issues.length === 0 && ok.length === 0) {
    ok.push('Pilotage conforme');
  }

  return {
    delayedMilestones: [],
    nextMilestone: null,
    openTasks: [],
    openRisks: [],
    ok,
    issues,
    moreOpenTasks: 0,
    moreOpenRisks: 0,
    moreDelayedMilestones: 0,
  };
}

export function resolveProjectPilotageSnapshot(
  project: ProjectListItem,
  fetched?: ProjectListPilotageSnapshot | null,
): ProjectListPilotageSnapshot {
  if (fetched) return fetched;
  if (project.pilotageSnapshot) return project.pilotageSnapshot;
  return buildPilotageSnapshotFallback(project);
}

export function projectPilotageSnapshotNeedsFetch(project: ProjectListItem): boolean {
  const snap = project.pilotageSnapshot;
  if (!snap) return true;
  const snapshotEmpty =
    snap.issues.length === 0 &&
    snap.ok.length === 0 &&
    snap.openTasks.length === 0 &&
    snap.openRisks.length === 0 &&
    snap.delayedMilestones.length === 0 &&
    snap.nextMilestone == null;
  const hasPilotageData =
    project.openTasksCount > 0 ||
    project.openRisksCount > 0 ||
    project.delayedMilestonesCount > 0 ||
    project.signals.isLate ||
    project.signals.isBlocked;
  return snapshotEmpty && hasPilotageData;
}
