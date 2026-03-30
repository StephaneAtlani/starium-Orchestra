/** Couleur d’affichage pour un écart (diff) — RFC-FE-BUD-030 §7.3 */
export function comparisonDiffClass(v: number): string {
  if (v > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (v < 0) return 'text-red-600 dark:text-red-400';
  return '';
}
