import { z } from 'zod';

/**
 * Schéma formulaire ligne budgétaire (RFC-FE-015).
 * generalLedgerAccountId obligatoire ; revisedAmount optionnel.
 * Pas d'allocationScope / costCenterSplits en MVP.
 */
export const budgetLineFormSchema = z.object({
  budgetId: z.string().min(1, 'Budget requis'),
  envelopeId: z.string().min(1, 'Enveloppe requise'),
  name: z.string().min(1, 'Nom requis').max(255),
  code: z.string().max(64).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  expenseType: z.enum(['CAPEX', 'OPEX']),
  generalLedgerAccountId: z.string().min(1, 'Compte comptable requis'),
  initialAmount: z.number().min(0, 'Le montant initial doit être ≥ 0'),
  revisedAmount: z.union([z.number().min(0, 'Le montant révisé doit être ≥ 0'), z.literal('')]).optional(),
  currency: z.string().min(1, 'Devise requise').max(8),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'CLOSED']).optional(),
});

export type BudgetLineFormValues = z.infer<typeof budgetLineFormSchema>;
