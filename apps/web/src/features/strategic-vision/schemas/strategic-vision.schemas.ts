import { z } from 'zod';

const requiredTrimmed = (label: string, min = 2, max = 200) =>
  z
    .string()
    .trim()
    .min(min, `${label} est requis.`)
    .max(max, `${label} est trop long.`);

const optionalTrimmed = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Valeur trop longue.`)
    .optional()
    .or(z.literal(''));

export const strategicVisionFormSchema = z.object({
  title: requiredTrimmed('Le titre', 2, 160),
  statement: requiredTrimmed('La vision', 5, 3000),
  horizonLabel: requiredTrimmed("L'horizon", 2, 120),
  isActive: z.boolean(),
});

export const strategicAxisFormSchema = z.object({
  name: requiredTrimmed("Le nom de l'axe", 2, 160),
  description: optionalTrimmed(3000),
});

export const strategicObjectiveFormSchema = z.object({
  axisId: requiredTrimmed("L'axe", 1, 80),
  title: requiredTrimmed("Le titre de l'objectif", 2, 180),
  description: optionalTrimmed(3000),
  ownerLabel: optionalTrimmed(160),
  status: z.enum(['ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'COMPLETED', 'ARCHIVED']),
  deadline: z.string().optional().or(z.literal('')),
  directionId: z.string(),
  ownerOrgUnitId: z.string().nullable().optional(),
});

export function getFirstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Formulaire invalide.';
}
