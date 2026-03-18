export function rangeLabel(offset: number, limit: number, total: number): string {
  if (!Number.isFinite(total) || total <= 0) return '0 sur 0';
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.max(1, limit);
  const start = safeOffset + 1;
  const end = Math.min(safeOffset + safeLimit, total);
  return `${start}–${end} sur ${total}`;
}

