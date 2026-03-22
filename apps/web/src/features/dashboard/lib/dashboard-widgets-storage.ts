import {
  mergeDashboardWidgetsConfig,
  type DashboardWidgetsConfig,
} from '../types/dashboard-widgets.types';

const PREFIX = 'starium.dashboard.widgets';

function storageKey(userId: string, clientId: string): string {
  return `${PREFIX}:${userId}:${clientId}`;
}

export function loadDashboardWidgets(
  userId: string,
  clientId: string,
): DashboardWidgetsConfig {
  if (typeof window === 'undefined') {
    return mergeDashboardWidgetsConfig(null);
  }
  try {
    const raw = window.localStorage.getItem(storageKey(userId, clientId));
    if (!raw) return mergeDashboardWidgetsConfig(null);
    return mergeDashboardWidgetsConfig(JSON.parse(raw) as unknown);
  } catch {
    return mergeDashboardWidgetsConfig(null);
  }
}

export function saveDashboardWidgets(
  userId: string,
  clientId: string,
  config: DashboardWidgetsConfig,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      storageKey(userId, clientId),
      JSON.stringify(config),
    );
  } catch {
    // quota / private mode
  }
}
