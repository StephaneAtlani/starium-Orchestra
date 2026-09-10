import type { ProjectReviewAgendaItemApi } from '../types/project.types';

export type FinalizeChecklistDecisionLike = {
  agendaItemId: string;
};

export type FinalizeChecklistActionLike = {
  title: string;
  status: string;
  dueDate: string;
  responsibleUserId: string;
  linkedTaskId: string;
};

export type FinalizeChecklistResult = {
  openArbitrationsWithoutVerdictCount: number;
  openActionsWithoutOwnerOrDueCount: number;
  eligibleActionTitles: string[];
  riskNoteTitles: string[];
};

/** Miroir API `mapReviewToListItem` + candidats F4. */
export function buildFinalizeChecklist(input: {
  agendaItems: ProjectReviewAgendaItemApi[];
  decisions: FinalizeChecklistDecisionLike[];
  actions: FinalizeChecklistActionLike[];
}): FinalizeChecklistResult {
  const decisionAgendaIds = new Set(
    input.decisions.map((d) => d.agendaItemId).filter(Boolean),
  );

  const openArbitrationsWithoutVerdictCount = input.agendaItems.filter(
    (item) =>
      item.itemType === 'ARBITRATION' &&
      !(item.decisionSummary?.trim()) &&
      !decisionAgendaIds.has(item.id),
  ).length;

  const openActionsWithoutOwnerOrDueCount = input.actions.filter((a) => {
    if (!a.title.trim()) return false;
    const open = a.status !== 'DONE' && a.status !== 'CANCELLED';
    if (!open) return false;
    return !a.responsibleUserId.trim() || !a.dueDate.trim();
  }).length;

  const eligibleActionTitles = input.actions
    .filter((a) => {
      if (!a.title.trim()) return false;
      if (a.linkedTaskId.trim()) return false;
      if (a.status === 'DONE' || a.status === 'CANCELLED') return false;
      return true;
    })
    .map((a) => a.title.trim());

  const riskSeen = new Set<string>();
  const riskNoteTitles: string[] = [];
  for (const item of input.agendaItems) {
    const notes = item.notes ?? '';
    for (const raw of notes.split(/\r?\n/)) {
      const m = /^Risque\s*:\s*(.+)$/i.exec(raw.trim());
      if (!m?.[1]) continue;
      const title = m[1].trim().slice(0, 200);
      if (!title) continue;
      const key = title.toLowerCase();
      if (riskSeen.has(key)) continue;
      riskSeen.add(key);
      riskNoteTitles.push(title);
    }
  }

  return {
    openArbitrationsWithoutVerdictCount,
    openActionsWithoutOwnerOrDueCount,
    eligibleActionTitles,
    riskNoteTitles,
  };
}
