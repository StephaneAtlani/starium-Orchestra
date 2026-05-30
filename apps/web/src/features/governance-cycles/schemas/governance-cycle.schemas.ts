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
    .max(max, 'Valeur trop longue.')
    .optional()
    .or(z.literal(''));

const cycleStatusEnum = z.enum([
  'DRAFT',
  'PREPARING',
  'TO_ARBITRATE',
  'ARBITRATED',
  'IN_EXECUTION',
  'CLOSED',
  'ARCHIVED',
]);

const cycleCadenceEnum = z.enum([
  'MONTHLY',
  'QUARTERLY',
  'SEMESTERLY',
  'YEARLY',
  'ONE_SHOT',
  'CONTINUOUS',
  'CUSTOM',
]);

const itemSourceTypeEnum = z.enum(['PROJECT', 'BUDGET', 'MANUAL']);

const itemDecisionStatusEnum = z.enum([
  'CANDIDATE',
  'TO_ARBITRATE',
  'ACCEPTED',
  'DEFERRED',
  'REJECTED',
  'NEEDS_INFORMATION',
  'ACCEPTED_WITH_RESERVE',
]);

const scoreField = z
  .number()
  .int('Le score doit être un entier.')
  .min(1, 'Score minimum : 1.')
  .max(5, 'Score maximum : 5.');

const optionalScoreField = scoreField.nullable().optional();

const decimalAmountField = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Montant invalide (ex. 125000.50).')
  .optional()
  .or(z.literal(''));

export const createGovernanceCycleSchema = z.object({
  name: requiredTrimmed('Le nom', 2, 160),
  code: optionalTrimmed(64),
  description: optionalTrimmed(4000),
  cadence: cycleCadenceEnum,
  status: cycleStatusEnum.optional(),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  sponsorLabel: optionalTrimmed(160),
  objectiveSummary: optionalTrimmed(4000),
  decisionSummary: optionalTrimmed(4000),
});

export const updateGovernanceCycleSchema = createGovernanceCycleSchema.partial();

export const createGovernanceCycleItemSchema = z
  .object({
    sourceType: itemSourceTypeEnum,
    title: optionalTrimmed(200),
    description: optionalTrimmed(4000),
    projectId: z.string().optional(),
    budgetId: z.string().optional(),
    estimatedBudgetAmount: decimalAmountField,
    estimatedCapacityDays: decimalAmountField,
    valueScore: optionalScoreField,
    riskScore: optionalScoreField,
    budgetScore: optionalScoreField,
    capacityScore: optionalScoreField,
    alignmentScore: optionalScoreField,
  })
  .superRefine((data, ctx) => {
    if (data.sourceType === 'MANUAL' && !data.title?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le titre est requis pour un élément manuel.',
        path: ['title'],
      });
    }
    if (data.sourceType === 'PROJECT' && !data.projectId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sélectionnez un projet.',
        path: ['projectId'],
      });
    }
    if (data.sourceType === 'BUDGET' && !data.budgetId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sélectionnez un budget.',
        path: ['budgetId'],
      });
    }
  });

/** Édition item — jamais decisionStatus / decisionReason. */
export const patchGovernanceCycleItemEditionSchema = z
  .object({
    title: optionalTrimmed(200),
    description: optionalTrimmed(4000),
    estimatedBudgetAmount: decimalAmountField.or(z.null()),
    estimatedCapacityDays: decimalAmountField.or(z.null()),
    valueScore: optionalScoreField,
    riskScore: optionalScoreField,
    budgetScore: optionalScoreField,
    capacityScore: optionalScoreField,
    alignmentScore: optionalScoreField,
  })
  .strict();

/** Arbitrage item — decisionStatus / decisionReason uniquement. */
export const patchGovernanceCycleItemArbitrationSchema = z
  .object({
    decisionStatus: itemDecisionStatusEnum,
    decisionReason: optionalTrimmed(2000).or(z.null()),
  })
  .strict();

export type CreateGovernanceCycleFormValues = z.infer<typeof createGovernanceCycleSchema>;
export type UpdateGovernanceCycleFormValues = z.infer<typeof updateGovernanceCycleSchema>;
export type CreateGovernanceCycleItemFormValues = z.infer<typeof createGovernanceCycleItemSchema>;
export type PatchGovernanceCycleItemEditionFormValues = z.infer<
  typeof patchGovernanceCycleItemEditionSchema
>;
export type PatchGovernanceCycleItemArbitrationFormValues = z.infer<
  typeof patchGovernanceCycleItemArbitrationSchema
>;

export function getFirstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Formulaire invalide.';
}

/** Vérifie qu’un objet arbitrage ne contient pas de clés édition (test unitaire). */
export const EDITION_PATCH_KEYS = [
  'title',
  'description',
  'estimatedBudgetAmount',
  'estimatedCapacityDays',
  'valueScore',
  'riskScore',
  'budgetScore',
  'capacityScore',
  'alignmentScore',
] as const;

export const ARBITRATION_PATCH_KEYS = ['decisionStatus', 'decisionReason'] as const;
