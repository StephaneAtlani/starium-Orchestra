import type { ReactNode } from 'react';
import type { ProjectListItem, ProjectListPilotageSnapshot } from '../types/project.types';
import {
  formatProjectBudget,
  formatProjectDateLong,
  projectBudgetConsumptionPercent,
  projectListProgressPercent,
} from '../lib/projects-list-display';
import { resolveProjectPilotageSnapshot } from '../lib/project-pilotage-snapshot-fallback';

const TOOLTIP_WRAP = 'space-y-1 text-left font-normal normal-case tracking-normal';
const MAX_SIGNAL_LINES = 3;
const MAX_TRJ_NAMES = 2;

function TooltipRoot({ children }: { children: ReactNode }) {
  return <div className={TOOLTIP_WRAP}>{children}</div>;
}

function TooltipLines({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <ul className="list-none space-y-0.5 text-[11px] leading-snug text-background/90">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function TooltipLine({ children }: { children: string }) {
  return <p className="text-[11px] leading-snug text-background/90">{children}</p>;
}

function TooltipSection({
  title,
  lines,
  empty = '—',
}: {
  title: string;
  lines: string[];
  empty?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-background">{title}</p>
      {lines.length === 0 ? (
        <p className="mt-0.5 text-[11px] text-background/80">{empty}</p>
      ) : (
        <ul className="mt-0.5 list-none space-y-0.5 text-[11px] leading-snug text-background/90">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatSnapshotDate(iso: string | undefined): string {
  if (!iso) return '—';
  return formatProjectDateLong(iso);
}

/** En-têtes colonnes. */
export const PROJECTS_TABLE_HEADER_TOOLTIPS = {
  project: 'Nom et catégorie. Cliquer pour ouvrir la fiche.',
  kind: 'Projet structuré ou activité de suivi.',
  health: 'Santé calculée : retards, risques, jalons, blocages.',
  status: 'Statut métier du projet.',
  myRole: 'Votre rôle sur ce projet.',
  owner: 'Chef de projet désigné.',
  progress: 'Avancement %. Vue étendue : saisi (haut) et calculé (bas).',
  dueDate: 'Date de fin visée.',
  budget: 'Budget cible et consommé.',
  responsible: 'Responsable opérationnel.',
  actions: 'Actions rapides.',
  tags: 'Étiquettes du projet.',
} as const;

export function projectsTableSignalsHeaderTooltip(): ReactNode {
  return <TooltipLine>Retards, blocages et lacunes de pilotage.</TooltipLine>;
}

export function projectsTableTrjHeaderTooltip(): ReactNode {
  return <TooltipLine>Synthèse Tâches · Risques · Jalons.</TooltipLine>;
}

/** Signaux : alertes uniquement, ou prochain jalon si tout va bien. */
export function buildProjectSignalsCellTooltip(
  project: ProjectListItem,
  snapshot?: ProjectListPilotageSnapshot,
): ReactNode {
  const snap = snapshot ?? resolveProjectPilotageSnapshot(project);

  if (snap.issues.length > 0) {
    const lines = snap.issues.slice(0, MAX_SIGNAL_LINES);
    if (snap.issues.length > MAX_SIGNAL_LINES) {
      lines.push(`+${snap.issues.length - MAX_SIGNAL_LINES} autre(s)`);
    }
    return (
      <TooltipRoot>
        <TooltipLines lines={lines} />
      </TooltipRoot>
    );
  }

  if (snap.nextMilestone) {
    const milestoneLabel = snap.nextMilestone.targetDate
      ? `Prochain jalon : ${snap.nextMilestone.name} (${formatSnapshotDate(snap.nextMilestone.targetDate)})`
      : `Prochain jalon : ${snap.nextMilestone.name}`;
    return <TooltipLine>{milestoneLabel}</TooltipLine>;
  }

  return <TooltipLine>Pilotage OK</TooltipLine>;
}

function trjNameSuffix(more: number): string {
  return more > 0 ? ` +${more}` : '';
}

/** T·R·J : 1 ligne par dimension, noms limités. */
export function buildProjectTrjCellTooltip(
  project: ProjectListItem,
  snapshot?: ProjectListPilotageSnapshot,
): ReactNode {
  const snap = snapshot ?? resolveProjectPilotageSnapshot(project);
  const lines: string[] = [];

  if (project.signals.hasNoTasks) {
    lines.push('T — aucune tâche planifiée');
  } else if (project.openTasksCount > 0) {
    const names = snap.openTasks
      .slice(0, MAX_TRJ_NAMES)
      .map((t) => t.name)
      .join(', ');
    lines.push(
      `T (${project.openTasksCount})${names ? ` — ${names}${trjNameSuffix(snap.moreOpenTasks)}` : ''}`,
    );
  } else {
    lines.push('T — terminées');
  }

  if (project.signals.hasNoRisks) {
    lines.push('R — registre vide');
  } else if (project.openRisksCount > 0) {
    const names = snap.openRisks
      .slice(0, MAX_TRJ_NAMES)
      .map((r) => r.title)
      .join(', ');
    lines.push(
      `R (${project.openRisksCount})${names ? ` — ${names}${trjNameSuffix(snap.moreOpenRisks)}` : ''}`,
    );
  } else {
    lines.push('R — aucun ouvert');
  }

  if (project.signals.hasNoMilestones) {
    lines.push('J — aucun jalon');
  } else if (project.delayedMilestonesCount > 0) {
    const late = snap.delayedMilestones
      .slice(0, MAX_TRJ_NAMES)
      .map((m) => m.name)
      .join(', ');
    lines.push(
      `J — ${project.delayedMilestonesCount} en retard${late ? ` : ${late}${trjNameSuffix(snap.moreDelayedMilestones)}` : ''}`,
    );
  } else if (snap.nextMilestone) {
    lines.push(
      `J — prochain : ${snap.nextMilestone.name}${
        snap.nextMilestone.targetDate
          ? ` (${formatSnapshotDate(snap.nextMilestone.targetDate)})`
          : ''
      }`,
    );
  } else {
    lines.push('J — à jour');
  }

  return (
    <TooltipRoot>
      <TooltipLines lines={lines} />
    </TooltipRoot>
  );
}

export function buildProjectHealthCellTooltip(
  project: ProjectListItem,
  healthLabel: string,
): ReactNode {
  const snap = resolveProjectPilotageSnapshot(project);
  const lines =
    snap.issues.length > 0
      ? snap.issues.slice(0, 2)
      : [healthLabel];
  return (
    <TooltipRoot>
      <TooltipLines lines={lines} />
    </TooltipRoot>
  );
}

export function buildProjectStatusCellTooltip(
  project: ProjectListItem,
  statusLabel: string,
): ReactNode {
  const lines = [statusLabel];
  if (project.signals.isLate && project.targetEndDate) {
    lines.push(`Échéance dépassée : ${formatProjectDateLong(project.targetEndDate)}`);
  }
  return <TooltipSection title="Statut" lines={lines} />;
}

export function buildProjectProgressCellTooltip(
  project: ProjectListItem,
  extended: boolean,
): ReactNode {
  if (extended) {
    return (
      <TooltipRoot>
        <TooltipSection
          title="Saisi"
          lines={[
            project.progressPercent != null
              ? `${project.progressPercent} %`
              : 'Non renseigné',
          ]}
        />
        <TooltipSection
          title="Calculé (tâches)"
          lines={[
            project.derivedProgressPercent != null
              ? `${project.derivedProgressPercent} %`
              : 'Indisponible',
          ]}
        />
      </TooltipRoot>
    );
  }
  return (
    <TooltipSection
      title="Avancement"
      lines={[`${projectListProgressPercent(project)} %`]}
    />
  );
}

export function buildProjectBudgetCellTooltip(project: ProjectListItem): ReactNode {
  const target = formatProjectBudget(project.targetBudgetAmount);
  const consumed = formatProjectBudget(project.consumedBudgetAmount);
  const lines: string[] = [];
  if (target) lines.push(`Budget : ${target}`);
  if (consumed) lines.push(`Consommé : ${consumed}`);
  const pct = projectBudgetConsumptionPercent(
    project.targetBudgetAmount,
    project.consumedBudgetAmount,
  );
  if (pct != null) lines.push(`${Math.round(pct)} % du budget`);
  return <TooltipSection title="Budget" lines={lines} empty="Budget non renseigné" />;
}

export function buildProjectDueDateCellTooltip(project: ProjectListItem): ReactNode {
  return (
    <TooltipSection
      title="Échéance"
      lines={[formatProjectDateLong(project.targetEndDate)]}
    />
  );
}

export function buildProjectOwnerCellTooltip(project: ProjectListItem): ReactNode {
  return (
    <TooltipSection
      title="Responsable"
      lines={[project.ownerDisplayName ?? 'Non renseigné']}
    />
  );
}

export function buildProjectMyRoleCellTooltip(project: ProjectListItem): ReactNode {
  const roles = project.myRoles ?? (project.myRole ? [project.myRole] : []);
  return (
    <TooltipSection
      title="Mon rôle"
      lines={roles.length > 0 ? roles : ['Aucun rôle']}
    />
  );
}

export function buildProjectTagsCellTooltip(project: ProjectListItem): ReactNode {
  return (
    <TooltipSection
      title="Étiquettes"
      lines={project.tags.map((t) => t.name)}
      empty="Aucune étiquette"
    />
  );
}

export function buildProjectKindCellTooltip(project: ProjectListItem): ReactNode {
  return (
    <TooltipSection
      title="Nature"
      lines={[project.kind === 'ACTIVITY' ? 'Activité' : 'Projet']}
    />
  );
}
