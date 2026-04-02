import type { SkillReferenceLevel, SkillStatus } from '../types/skill.types';

const SKILL_STATUS_LABEL: Record<SkillStatus, string> = {
  ACTIVE: 'Actif',
  DRAFT: 'Brouillon',
  ARCHIVED: 'Archivé',
};

const REFERENCE_LEVEL_LABEL: Record<SkillReferenceLevel, string> = {
  BEGINNER: 'Débutant',
  INTERMEDIATE: 'Intermédiaire',
  ADVANCED: 'Avancé',
  EXPERT: 'Expert',
};

/** Ordre croissant pour comparaison de niveaux (MVP). */
const LEVEL_ORDER: Record<SkillReferenceLevel, number> = {
  BEGINNER: 0,
  INTERMEDIATE: 1,
  ADVANCED: 2,
  EXPERT: 3,
};

export function skillStatusLabel(status: SkillStatus): string {
  return SKILL_STATUS_LABEL[status] ?? status;
}

export function skillReferenceLevelLabel(level: SkillReferenceLevel): string {
  return REFERENCE_LEVEL_LABEL[level] ?? level;
}

export function isLevelBelow(
  actual: SkillReferenceLevel,
  expected: SkillReferenceLevel,
): boolean {
  return LEVEL_ORDER[actual] < LEVEL_ORDER[expected];
}

/** Source d’association (RFC-TEAM-004) — utilisé pour le sheet collaborateurs par compétence. */
const COLLAB_SOURCE_LABEL: Record<string, string> = {
  SELF_DECLARED: 'Auto-déclaré',
  MANAGER_ASSESSED: 'Évaluation manager',
  HR_REVIEW: 'Revue RH',
  IMPORTED: 'Import',
  OTHER: 'Autre',
};

export function collaboratorSkillSourceLabel(source: string): string {
  return COLLAB_SOURCE_LABEL[source] ?? source;
}
