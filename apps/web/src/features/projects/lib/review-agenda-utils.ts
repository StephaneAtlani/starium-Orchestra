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
