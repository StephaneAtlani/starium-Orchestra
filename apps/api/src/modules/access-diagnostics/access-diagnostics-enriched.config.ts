/**
 * RFC-ACL-019 — activation du diagnostic enrichi (alignement moteur RFC-018).
 * Parsing strict : seules `true` et `1` activent ; toute autre valeur ou absence → désactivé.
 */
export function parseAccessDiagnosticsEnrichedFlag(raw?: string | null): boolean {
  if (raw == null || raw === '') {
    return false;
  }
  const s = String(raw).trim().toLowerCase();
  return s === 'true' || s === '1';
}
