import { STARIUM_APP_WORKSPACE_DOM_ID } from '@/components/shell/app-shell';

export function getWorkspaceFullscreenTarget(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById(STARIUM_APP_WORKSPACE_DOM_ID);
}

/** Bascule plein écran sur #starium-app-workspace ; erreurs navigateur ignorées. */
export async function toggleWorkspaceFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) await document.exitFullscreen();
      return;
    }
    const target = getWorkspaceFullscreenTarget();
    if (target?.requestFullscreen) await target.requestFullscreen();
  } catch {
    /* refus utilisateur, iframe, politique navigateur */
  }
}
