import type { ProjectTeamColorToken } from '../types/project.types';

export const PROJECT_TEAM_COLOR_TOKENS: readonly ProjectTeamColorToken[] = [
  'BROWN',
  'BLUE',
  'VIOLET',
  'TEAL',
  'GREEN',
  'RED',
] as const;

/** Liseré gauche carte équipe (RFC-PROJ-023 / maquettes DS). */
export const PROJECT_TEAM_COLOR_BORDER: Record<ProjectTeamColorToken, string> = {
  BROWN: 'border-l-amber-800/80',
  BLUE: 'border-l-sky-600',
  VIOLET: 'border-l-violet-600',
  TEAL: 'border-l-teal-600',
  GREEN: 'border-l-emerald-600',
  RED: 'border-l-red-600',
};

/** Pastille / swatch couleur. */
export const PROJECT_TEAM_COLOR_SWATCH: Record<ProjectTeamColorToken, string> = {
  BROWN: 'bg-amber-800',
  BLUE: 'bg-sky-600',
  VIOLET: 'bg-violet-600',
  TEAL: 'bg-teal-600',
  GREEN: 'bg-emerald-600',
  RED: 'bg-red-600',
};

export const PROJECT_TEAM_COLOR_LABEL: Record<ProjectTeamColorToken, string> = {
  BROWN: 'Brun',
  BLUE: 'Bleu',
  VIOLET: 'Violet',
  TEAL: 'Sarcelle',
  GREEN: 'Vert',
  RED: 'Rouge',
};

export function resolveTeamColorToken(
  token: ProjectTeamColorToken | null | undefined,
): ProjectTeamColorToken {
  return token && PROJECT_TEAM_COLOR_TOKENS.includes(token) ? token : 'BROWN';
}

/** Aligné backend `normalizeFreeIdentityKey`. */
export function freePersonIdentityKey(displayName: string): string {
  const n = displayName.trim().replace(/\s+/g, ' ').toLowerCase();
  return `n:${n.slice(0, 120)}`;
}

export function userIdentityKey(userId: string): string {
  return `u:${userId}`;
}
