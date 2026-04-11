/**
 * Libellé automatique quand l’utilisateur laisse le champ vide :
 * `BC_<date commande YYYY-MM-DD>_<chrono>` (BC = bon de commande).
 */
export function buildDefaultPurchaseOrderLabel(orderDateInput: string): string {
  const parsed = new Date(orderDateInput);
  const d = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const n =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
      : String(Date.now() % 1_000_000).padStart(6, '0');
  return `BC_${y}-${m}-${day}_${n}`;
}
