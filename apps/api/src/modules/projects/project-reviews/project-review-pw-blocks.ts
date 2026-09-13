/** Marqueur notes ODJ pour les blocs standards atelier Préparer (kit PW). */

export function pwBlockNotesMarker(blockId: string): string {
  return `[pw:${blockId}]`;
}

export function parsePwBlockIdFromNotes(
  notes: string | null | undefined,
): string | null {
  if (!notes) return null;
  const m = /^\[pw:([^\]]+)\]/.exec(notes.trim());
  return m?.[1] ?? null;
}

/** Garde la 1ʳᵉ occurrence de chaque `[pw:…]`, dans l’ordre donné. */
export function dedupeAgendaItemsByPwBlock<
  T extends { id: string; notes?: string | null },
>(items: T[]): { unique: T[]; duplicateIds: string[] } {
  const seen = new Set<string>();
  const unique: T[] = [];
  const duplicateIds: string[] = [];
  for (const item of items) {
    const pw = parsePwBlockIdFromNotes(item.notes);
    if (!pw) {
      unique.push(item);
      continue;
    }
    if (seen.has(pw)) {
      duplicateIds.push(item.id);
      continue;
    }
    seen.add(pw);
    unique.push(item);
  }
  return { unique, duplicateIds };
}
