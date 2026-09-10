import type { ProjectReviewAgendaItemApi } from '../types/project.types';

export function sortReviewAgendaItems(
  items: ProjectReviewAgendaItemApi[],
): ProjectReviewAgendaItemApi[] {
  return [...items].sort((a, b) => a.orderIndex - b.orderIndex);
}

export function reviewAgendaConductProgress(items: ProjectReviewAgendaItemApi[]): {
  total: number;
  treated: number;
  currentNumber: number | null;
} {
  const sorted = sortReviewAgendaItems(items);
  const total = sorted.length;
  const treated = sorted.filter((i) => i.status === 'DONE' || i.status === 'SKIPPED').length;
  const inProgressIndex = sorted.findIndex((i) => i.status === 'IN_PROGRESS');
  const currentNumber = inProgressIndex >= 0 ? inProgressIndex + 1 : null;
  return { total, treated, currentNumber };
}

export function pickPreferredAgendaItemId(
  items: ProjectReviewAgendaItemApi[],
): string | null {
  const sorted = sortReviewAgendaItems(items);
  if (sorted.length === 0) return null;
  return (
    sorted.find((i) => i.status === 'IN_PROGRESS')?.id ??
    sorted.find((i) => i.status === 'TODO')?.id ??
    sorted[0].id
  );
}

export function findNextOpenAgendaItemId(
  items: ProjectReviewAgendaItemApi[],
  afterItemId: string,
): string | null {
  const sorted = sortReviewAgendaItems(items);
  const startIndex = sorted.findIndex((i) => i.id === afterItemId);
  if (startIndex < 0) return pickPreferredAgendaItemId(items);

  for (let i = startIndex + 1; i < sorted.length; i += 1) {
    if (sorted[i].status === 'TODO') return sorted[i].id;
  }
  for (let i = 0; i < startIndex; i += 1) {
    if (sorted[i].status === 'TODO') return sorted[i].id;
  }
  return null;
}

/** RFC-PROJ-013-6 — Point suivant autorisé seulement si le point courant est clos. */
export function canAdvanceAgendaPoint(
  status: ProjectReviewAgendaItemApi['status'] | null | undefined,
): boolean {
  return status === 'DONE' || status === 'SKIPPED';
}

export function shouldTickPointTimer(
  status: ProjectReviewAgendaItemApi['status'] | null | undefined,
): boolean {
  return status === 'TODO' || status === 'IN_PROGRESS';
}

export function formatConductElapsed(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** Gate shell Animer (écran 09). */
export function shouldShowAnimateSession(opts: {
  editorPhase: string;
  conductClosedAt: string | null | undefined;
  reviewType: string;
}): boolean {
  return (
    opts.editorPhase === 'conduct' &&
    !opts.conductClosedAt &&
    opts.reviewType !== 'POST_MORTEM'
  );
}
