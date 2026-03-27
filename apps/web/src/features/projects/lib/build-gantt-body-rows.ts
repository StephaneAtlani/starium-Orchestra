import type { ProjectGanttPayload } from '../api/projects.api';
import type { ProjectMilestoneApi, ProjectTaskApi } from '../types/project.types';

/** Option de phase (tri côté appelant : sortOrder puis nom). */
export type GanttPhaseOption = { id: string; name: string; sortOrder: number };

/** Champs jalon nécessaires au corps Gantt (sidebar + frise alignées). */
export type MilestoneForGanttBody = Pick<
  ProjectMilestoneApi,
  'id' | 'name' | 'targetDate' | 'linkedTaskId' | 'phaseId' | 'sortOrder' | 'status'
>;

export type GanttBodyRow =
  | { kind: 'phaseHeader'; phaseId: string | null; name: string }
  | { kind: 'task'; row: ProjectTaskApi }
  | { kind: 'milestone'; ms: MilestoneForGanttBody };

/**
 * Corps Gantt unifié : en-têtes de phase, jalons (avec tâche liée éventuelle avant le reste),
 * puis tâches restantes — même logique que la grille gauche pour aligner la frise.
 */
export function buildGanttBodyRows(
  phaseOptions: GanttPhaseOption[],
  displayedRows: ProjectTaskApi[],
  visibleMilestoneItems: MilestoneForGanttBody[],
): GanttBodyRow[] {
  const ungKey = '__ungrouped__';

  const tasksByKey = new Map<string, ProjectTaskApi[]>();
  for (const t of displayedRows) {
    const key = t.phaseId ?? ungKey;
    const list = tasksByKey.get(key) ?? [];
    list.push(t);
    tasksByKey.set(key, list);
  }

  const milestonesByKey = new Map<string, MilestoneForGanttBody[]>();
  for (const m of visibleMilestoneItems) {
    const key = m.phaseId ?? ungKey;
    const list = milestonesByKey.get(key) ?? [];
    list.push(m);
    milestonesByKey.set(key, list);
  }

  const displayedTaskRowById = new Map<string, ProjectTaskApi>();
  for (const t of displayedRows) displayedTaskRowById.set(t.id, t);

  const shownTaskIds = new Set<string>();

  const out: GanttBodyRow[] = [];

  const addPhaseHeaderIfNeeded = (phaseId: string | null, name: string) => {
    out.push({ kind: 'phaseHeader', phaseId, name });
  };

  for (const phase of phaseOptions) {
    const tList = tasksByKey.get(phase.id) ?? [];
    const mList = milestonesByKey.get(phase.id) ?? [];
    if (tList.length === 0 && mList.length === 0) continue;

    addPhaseHeaderIfNeeded(phase.id, phase.name);

    for (const ms of mList) {
      out.push({ kind: 'milestone', ms });
      if (ms.linkedTaskId) {
        const linkedRow = displayedTaskRowById.get(ms.linkedTaskId);
        const samePhase = (linkedRow?.phaseId ?? null) === (ms.phaseId ?? null);
        if (linkedRow && samePhase && !shownTaskIds.has(linkedRow.id)) {
          out.push({ kind: 'task', row: linkedRow });
          shownTaskIds.add(linkedRow.id);
        }
      }
    }

    for (const row of tList) {
      if (shownTaskIds.has(row.id)) continue;
      out.push({ kind: 'task', row });
    }
  }

  const ungTasks = tasksByKey.get(ungKey) ?? [];
  const ungMilestones = milestonesByKey.get(ungKey) ?? [];
  if (ungTasks.length > 0 || ungMilestones.length > 0) {
    addPhaseHeaderIfNeeded(null, 'Sans libellé de phase');

    for (const ms of ungMilestones) {
      out.push({ kind: 'milestone', ms });
      if (ms.linkedTaskId) {
        const linkedRow = displayedTaskRowById.get(ms.linkedTaskId);
        const samePhase = (linkedRow?.phaseId ?? null) === (ms.phaseId ?? null);
        if (linkedRow && samePhase && !shownTaskIds.has(linkedRow.id)) {
          out.push({ kind: 'task', row: linkedRow });
          shownTaskIds.add(linkedRow.id);
        }
      }
    }

    for (const row of ungTasks) {
      if (shownTaskIds.has(row.id)) continue;
      out.push({ kind: 'task', row });
    }
  }

  return out;
}

/**
 * Tâches dans l’ordre d’affichage cohérent avec le payload Gantt (phases triées, puis sans phase),
 * fusionnées avec `payload.tasks` pour les champs les plus complets.
 */
export function orderedTasksFromGanttPayload(payload: ProjectGanttPayload): ProjectTaskApi[] {
  const byId = new Map<string, ProjectTaskApi>();
  for (const t of payload.tasks) {
    byId.set(t.id, t as ProjectTaskApi);
  }

  const out: ProjectTaskApi[] = [];
  const pushed = new Set<string>();

  const pushMerged = (t: ProjectTaskApi) => {
    if (pushed.has(t.id)) return;
    const full = byId.get(t.id);
    const merged = { ...full, ...t } as ProjectTaskApi;
    byId.set(t.id, merged);
    out.push(merged);
    pushed.add(t.id);
  };

  const phases = [...payload.phases].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
  for (const p of phases) {
    for (const t of p.tasks) {
      pushMerged(t as ProjectTaskApi);
    }
  }
  for (const t of payload.ungroupedTasks) {
    pushMerged(t as ProjectTaskApi);
  }

  return out;
}
