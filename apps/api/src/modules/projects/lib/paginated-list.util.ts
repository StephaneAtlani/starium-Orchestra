/** RFC-PROJ-011 — pagination listes tasks / activities / milestones */
export function normalizeListPagination(
  offset?: number,
  limit?: number,
): { limit: number; offset: number } {
  const lim = Math.min(100, Math.max(1, limit ?? 20));
  const off = Math.max(0, offset ?? 0);
  return { limit: lim, offset: off };
}
