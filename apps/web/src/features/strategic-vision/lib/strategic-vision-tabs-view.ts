import type {
  StrategicAxisDto,
  StrategicAxisWithObjectivesDto,
  StrategicObjectiveDto,
  StrategicObjectiveStatus,
  StrategicVisionDto,
} from '../types/strategic-vision.types';
import {
  isStrategicAxisIconColor,
  isStrategicAxisIconKey,
  type StrategicAxisIconColor,
} from '../components/strategic-axis-icons';

export type ObjectiveStatusCounts = Record<StrategicObjectiveStatus, number>;

export const EMPTY_STATUS_COUNTS: ObjectiveStatusCounts = {
  ON_TRACK: 0,
  AT_RISK: 0,
  OFF_TRACK: 0,
  COMPLETED: 0,
  ARCHIVED: 0,
};

export function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function getActiveVision(visions: StrategicVisionDto[]): StrategicVisionDto | null {
  if (visions.length === 0) return null;
  return visions.find((vision) => vision.isActive) ?? visions[0];
}

export function getAxesFromVision(vision: StrategicVisionDto | null): StrategicAxisDto[] {
  if (!vision) return [];
  return vision.axes.map((axis: StrategicAxisWithObjectivesDto) => ({
    id: axis.id,
    clientId: axis.clientId,
    visionId: axis.visionId,
    name: axis.name,
    description: axis.description,
    orderIndex: axis.orderIndex,
    createdAt: axis.createdAt,
    updatedAt: axis.updatedAt,
    objectives: axis.objectives,
  }));
}

export function buildAxisNameMap(axes: StrategicAxisDto[]): Map<string, string> {
  return new Map(axes.map((axis) => [axis.id, splitAxisLogoAndTitle(axis.name).title]));
}

export function buildObjectiveStatusCounts(
  objectives: StrategicObjectiveDto[],
): ObjectiveStatusCounts {
  const counts: ObjectiveStatusCounts = { ...EMPTY_STATUS_COUNTS };
  for (const objective of objectives) {
    counts[objective.status] += 1;
  }
  return counts;
}

export function isObjectiveOverdue(
  objective: StrategicObjectiveDto,
  now: Date = new Date(),
): boolean {
  if (!objective.deadline) return false;
  if (objective.status === 'COMPLETED' || objective.status === 'ARCHIVED') return false;
  const deadline = new Date(objective.deadline);
  if (Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() < now.getTime();
}

export function buildCriticalObjectives(
  objectives: StrategicObjectiveDto[],
  now: Date = new Date(),
): StrategicObjectiveDto[] {
  return objectives.filter(
    (objective) =>
      objective.status === 'AT_RISK' ||
      objective.status === 'OFF_TRACK' ||
      isObjectiveOverdue(objective, now),
  );
}

export function buildObjectivesByAxis(
  objectives: StrategicObjectiveDto[],
): Map<string, StrategicObjectiveDto[]> {
  const groups = new Map<string, StrategicObjectiveDto[]>();
  for (const objective of objectives) {
    const existing = groups.get(objective.axisId) ?? [];
    existing.push(objective);
    groups.set(objective.axisId, existing);
  }
  return groups;
}

export function splitAxisLogoAndTitle(name: string): {
  logo: string | null;
  title: string;
  color: StrategicAxisIconColor;
} {
  const trimmed = name.trim();
  const tokenMatch = trimmed.match(
    /^\[icon:([a-z0-9_-]+)(?:;color:([a-z0-9_-]+))?\]\s+(.+)$/i,
  );
  if (tokenMatch) {
    const iconCandidate = tokenMatch[1];
    const colorCandidate = tokenMatch[2] ?? 'auto';
    const title = tokenMatch[3].trim();
    if (isStrategicAxisIconKey(iconCandidate) && title.length > 0) {
      return {
        logo: iconCandidate,
        title,
        color: isStrategicAxisIconColor(colorCandidate) ? colorCandidate : 'auto',
      };
    }
  }

  const firstSpace = trimmed.indexOf(' ');
  if (firstSpace <= 0) return { logo: null, title: trimmed, color: 'auto' };

  const firstToken = trimmed.slice(0, firstSpace);
  const rest = trimmed.slice(firstSpace + 1).trim();
  if (!rest) return { logo: null, title: trimmed, color: 'auto' };

  // UTF-8 logo support (emoji/symbol token at start)
  if (/[^\u0000-\u007F]/.test(firstToken)) {
    return { logo: firstToken, title: rest, color: 'auto' };
  }
  return { logo: null, title: trimmed, color: 'auto' };
}

export function buildAxisNameWithLogo(params: {
  logo?: string | null;
  title: string;
  color?: StrategicAxisIconColor;
}): string {
  const title = params.title.trim();
  const logo = (params.logo ?? '').trim();
  const color = params.color ?? 'auto';
  if (!logo) return title;
  if (isStrategicAxisIconKey(logo)) {
    return `[icon:${logo};color:${color}] ${title}`;
  }
  return title;
}
