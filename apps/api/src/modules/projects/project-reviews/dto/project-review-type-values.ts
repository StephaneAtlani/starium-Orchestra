import type { ProjectReviewType } from '@prisma/client';

/**
 * Valeurs autorisées pour les DTO — alignées sur `enum ProjectReviewType` (schema.prisma).
 * Liste explicite pour class-validator : un `@IsEnum(ProjectReviewType)` peut ne pas inclure
 * une valeur ajoutée au schéma tant que le client Prisma n’a pas été régénéré sur la machine
 * qui exécute l’API.
 */
export const PROJECT_REVIEW_TYPE_VALUES = [
  'COPIL',
  'COPRO',
  'CODIR_REVIEW',
  'RISK_REVIEW',
  'MILESTONE_REVIEW',
  'AD_HOC',
  'POST_MORTEM',
] as const satisfies readonly ProjectReviewType[];
