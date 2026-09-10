import {
  ProjectTaskPriority,
  ProjectTaskStatus,
  type ProjectRiskStatus,
} from '@prisma/client';

export type ActionLikeForTaskPush = {
  id: string;
  title: string;
  description: string | null;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority | null;
  dueDate: Date | null;
  linkedTaskId: string | null;
  responsibleUserId: string | null;
};

export type ActionsPushResult = {
  created: number;
  skippedLinked: number;
};

export type RisksPromoteResult = {
  created: number;
  skippedDuplicate: number;
  skippedNoRiskType: boolean;
};

/** Notes agenda « Risque : … » → titres dédupliqués (case-insensitive). */
export function extractRiskNoteTitles(notes: string | null | undefined): string[] {
  if (!notes?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of notes.split(/\r?\n/)) {
    const m = /^Risque\s*:\s*(.+)$/i.exec(raw.trim());
    if (!m?.[1]) continue;
    const title = m[1].trim().slice(0, 200);
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(title);
  }
  return out;
}

export function actionsEligibleForTaskPush(
  actions: ActionLikeForTaskPush[],
): ActionLikeForTaskPush[] {
  return actions.filter((a) => {
    if (a.linkedTaskId) return false;
    if (!a.title?.trim()) return false;
    if (a.status === ProjectTaskStatus.DONE || a.status === ProjectTaskStatus.CANCELLED) {
      return false;
    }
    return true;
  });
}

export function nextRiskCodeFromExisting(codes: string[]): string {
  let maxN = 0;
  for (const code of codes) {
    const m = /^R-(\d+)$/.exec(code);
    if (m) maxN = Math.max(maxN, parseInt(m[1]!, 10));
  }
  return `R-${String(maxN + 1).padStart(3, '0')}`;
}

export function isDuplicateRiskTitle(
  existingTitles: string[],
  candidate: string,
): boolean {
  const key = candidate.trim().toLowerCase();
  return existingTitles.some((t) => t.trim().toLowerCase() === key);
}

export const PROMOTED_RISK_DEFAULTS = {
  description: 'Consigné en séance — à compléter',
  fearedEvent: 'À préciser',
  threatSource: 'À préciser',
  businessImpact: 'À préciser',
  probability: 2,
  impact: 2,
  status: 'OPEN' as ProjectRiskStatus,
} as const;
