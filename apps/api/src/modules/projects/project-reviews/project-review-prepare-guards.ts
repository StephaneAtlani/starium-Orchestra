/**
 * Contrôles bloquants avant figer l’ODJ — CDC Points projet p.9 / RFC-PROJ-013-10 P2.
 * Miroir FE : apps/web/.../project-review-prepare-guards.ts (messages identiques).
 */

export const PREPARE_LOCK_MSG = {
  emptyTitle: "Une ligne de l'ordre du jour est vide. Complétez-la ou supprimez-la.",
  noParticipant:
    "Convoquez au moins un participant avant de figer l'ordre du jour.",
  noDuration: (n: number) =>
    n === 1
      ? "1 point n'a pas de durée cible."
      : `${n} points n'ont pas de durée cible.`,
  decisionNoOwner: (title: string) =>
    `Le point « ${title} » attend une décision : désignez un porteur.`,
  decisionNoSupport: 'Aucun support rattaché au point de décision.',
  noAgendaItem:
    "Ajoutez au moins un point à l'ordre du jour avant de le figer",
} as const;

const DECISION_LIKE = new Set(['DECISION', 'ARBITRATION']);

export type PrepareLockAgendaItem = {
  id: string;
  title: string | null;
  itemType: string;
  plannedDurationMinutes: number | null;
  ownerUserId: string | null;
};

export type PrepareLockAttachment = {
  agendaItemId: string | null;
};

export function formatDurationMinutesFr(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m}`;
}

export function sumAgendaPlannedMinutes(
  items: Array<{ plannedDurationMinutes: number | null | undefined }>,
): number {
  return items.reduce(
    (acc, item) =>
      acc +
      (typeof item.plannedDurationMinutes === 'number' &&
      item.plannedDurationMinutes > 0
        ? item.plannedDurationMinutes
        : 0),
    0,
  );
}

export function formatDurationOverrunMessage(
  agendaMinutes: number,
  sessionMinutes: number,
): string {
  const delta = Math.max(0, agendaMinutes - sessionMinutes);
  return `${formatDurationMinutesFr(agendaMinutes)} d'ordre du jour pour ${formatDurationMinutesFr(sessionMinutes)} de séance — ${formatDurationMinutesFr(delta)} de trop.`;
}

export type PrepareLockFocusTarget =
  | { kind: 'agenda-title'; itemId: string }
  | { kind: 'agenda-owner'; itemId: string }
  | { kind: 'agenda-duration'; itemId: string }
  | { kind: 'agenda-support'; itemId: string }
  | { kind: 'participants' }
  | { kind: 'duration-overrun' };

export type PrepareLockIssue = {
  message: string;
  focus: PrepareLockFocusTarget;
};

/**
 * Retourne la liste ordonnée des contrôles bloquants (premier = priorité focus).
 */
export function collectPrepareLockIssues(input: {
  agendaItems: PrepareLockAgendaItem[];
  participantCount: number;
  sessionDurationMinutes: number | null | undefined;
  attachments: PrepareLockAttachment[];
}): PrepareLockIssue[] {
  const issues: PrepareLockIssue[] = [];
  const items = input.agendaItems;

  if (items.length < 1) {
    issues.push({
      message: PREPARE_LOCK_MSG.noAgendaItem,
      focus: { kind: 'participants' },
    });
    return issues;
  }

  for (const item of items) {
    if (!item.title?.trim()) {
      issues.push({
        message: PREPARE_LOCK_MSG.emptyTitle,
        focus: { kind: 'agenda-title', itemId: item.id },
      });
    }
  }

  if (input.participantCount < 1) {
    issues.push({
      message: PREPARE_LOCK_MSG.noParticipant,
      focus: { kind: 'participants' },
    });
  }

  const withoutDuration = items.filter(
    (item) =>
      item.title?.trim() &&
      !(
        typeof item.plannedDurationMinutes === 'number' &&
        item.plannedDurationMinutes > 0
      ),
  );
  if (withoutDuration.length > 0) {
    issues.push({
      message: PREPARE_LOCK_MSG.noDuration(withoutDuration.length),
      focus: { kind: 'agenda-duration', itemId: withoutDuration[0]!.id },
    });
  }

  const session = input.sessionDurationMinutes;
  if (typeof session === 'number' && session > 0) {
    const cumul = sumAgendaPlannedMinutes(items);
    if (cumul > session) {
      issues.push({
        message: formatDurationOverrunMessage(cumul, session),
        focus: { kind: 'duration-overrun' },
      });
    }
  }

  const attachedIds = new Set(
    input.attachments
      .map((a) => a.agendaItemId)
      .filter((id): id is string => !!id?.trim()),
  );

  for (const item of items) {
    if (!DECISION_LIKE.has(item.itemType)) continue;
    const label = item.title?.trim() || 'Sans titre';
    if (!item.ownerUserId?.trim()) {
      issues.push({
        message: PREPARE_LOCK_MSG.decisionNoOwner(label),
        focus: { kind: 'agenda-owner', itemId: item.id },
      });
    }
    if (!attachedIds.has(item.id)) {
      issues.push({
        message: PREPARE_LOCK_MSG.decisionNoSupport,
        focus: { kind: 'agenda-support', itemId: item.id },
      });
    }
  }

  return issues;
}

export function firstPrepareLockError(
  input: Parameters<typeof collectPrepareLockIssues>[0],
): string | null {
  return collectPrepareLockIssues(input)[0]?.message ?? null;
}
