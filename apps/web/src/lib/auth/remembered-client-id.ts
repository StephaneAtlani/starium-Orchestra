/** Objet client courant (session) — peut être retiré au logout. */
export const ACTIVE_CLIENT_STORAGE_KEY = 'starium.activeClient';

/**
 * Dernier client « workspace » choisi (id seul). Conservé après déconnexion pour
 * ré-appliquer le même client au login si l’utilisateur y a encore accès.
 */
export const LAST_SELECTED_CLIENT_ID_KEY = 'starium.lastSelectedClientId';

export function readRememberedClientId(): string | null {
  if (typeof window === 'undefined') return null;
  const last = window.localStorage.getItem(LAST_SELECTED_CLIENT_ID_KEY)?.trim();
  if (last) return last;
  const full = window.localStorage.getItem(ACTIVE_CLIENT_STORAGE_KEY);
  if (!full) return null;
  try {
    const parsed = JSON.parse(full) as { id?: string };
    return parsed?.id?.trim() || null;
  } catch {
    return null;
  }
}
