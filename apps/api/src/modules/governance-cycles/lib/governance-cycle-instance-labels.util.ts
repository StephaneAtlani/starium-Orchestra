/** RFC-003-F — period labels for generated instances (T1, T2, …). */
export function buildGeneratedInstancePeriodLabel(index: number): string {
  return `T${index}`;
}
