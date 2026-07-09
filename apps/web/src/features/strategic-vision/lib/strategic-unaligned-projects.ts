import type { StrategicVisionAlertDto } from '../types/strategic-vision.types';

import type {
  StrategicVisionKpisByDirectionResponseDto,
  StrategicVisionKpisResponseDto,
} from '../types/strategic-vision.types';

export function resolveCockpitUnalignedProjectsCount(
  directionFilter: string,
  kpis: StrategicVisionKpisResponseDto | undefined,
  kpisByDirection: StrategicVisionKpisByDirectionResponseDto | undefined,
): number {
  if (directionFilter === 'ALL') {
    return kpis?.unalignedProjectsCount ?? kpisByDirection?.global.unalignedProjectsCount ?? 0;
  }
  if (directionFilter === 'UNASSIGNED') {
    return (
      kpisByDirection?.rows.find((row) => row.directionId == null)?.unalignedProjectsCount ?? 0
    );
  }
  return (
    kpisByDirection?.rows.find((row) => row.directionId === directionFilter)
      ?.unalignedProjectsCount ?? 0
  );
}

const UNALIGNED_PROJECT_ALERT_PREFIX = 'strategic-project-unaligned:';

export function parseStrategicAlertProjectId(alertId: string): string | null {
  if (!alertId.startsWith(UNALIGNED_PROJECT_ALERT_PREFIX)) {
    return null;
  }
  const projectId = alertId.slice(UNALIGNED_PROJECT_ALERT_PREFIX.length).trim();
  return projectId.length > 0 ? projectId : null;
}

export type UnalignedProjectListItem = {
  projectId: string;
  label: string;
};

export function extractUnalignedProjectListItems(
  alerts: StrategicVisionAlertDto[] | undefined,
): UnalignedProjectListItem[] {
  if (!alerts?.length) {
    return [];
  }

  return alerts
    .filter((alert) => alert.type === 'PROJECT_UNALIGNED')
    .map((alert) => {
      const projectId = parseStrategicAlertProjectId(alert.id);
      if (!projectId) {
        return null;
      }
      return {
        projectId,
        label: alert.targetLabel.trim() || 'Projet sans libellé',
      };
    })
    .filter((item): item is UnalignedProjectListItem => item !== null)
    .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
}
