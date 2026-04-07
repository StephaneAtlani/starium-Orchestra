import { z } from 'zod';

export const baseBudgetLineFormSchema = z
  .object({
    budgetId: z.string().min(1, 'Budget requis'),
    envelopeId: z.string().min(1, 'Enveloppe requise'),
    name: z.string().min(1, 'Nom requis').max(255),
    code: z.string().max(64).optional().or(z.literal('')),
    description: z.string().optional().or(z.literal('')),
    expenseType: z.enum(['CAPEX', 'OPEX']),
    generalLedgerAccountId: z.string().optional().or(z.literal('')),
    initialAmount: z.number().min(0, 'Le montant initial doit être ≥ 0'),
    revisedAmount: z
      .union([z.number().min(0, 'Le montant révisé doit être ≥ 0'), z.literal('')])
      .optional(),
    currency: z.string().min(1, 'Devise requise').max(8),
    status: z.string().optional(),
    deferredToExerciseId: z.string().optional().or(z.literal('')),
  })
  .superRefine((val, ctx) => {
    if (val.status === 'DEFERRED' && (!val.deferredToExerciseId || val.deferredToExerciseId.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deferredToExerciseId'],
        message: 'Exercice cible requis pour le statut reporté',
      });
    }
  });

export function buildBudgetLineFormSchema(isBudgetAccountingEnabled: boolean) {
  if (!isBudgetAccountingEnabled) {
    return baseBudgetLineFormSchema;
  }

  return baseBudgetLineFormSchema.superRefine((val, ctx) => {
    if (!val.generalLedgerAccountId || val.generalLedgerAccountId.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['generalLedgerAccountId'],
        message: 'Compte comptable requis',
      });
    }
  });
}

export type BudgetLineFormValues = z.infer<typeof baseBudgetLineFormSchema>;
