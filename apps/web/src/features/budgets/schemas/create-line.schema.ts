import { z } from 'zod';

const costCenterSplitSchema = z.object({
  costCenterId: z.string(),
  percentage: z.number().min(0).max(100),
});

export const createLineSchema = z
  .object({
    budgetId: z.string().min(1, 'Budget requis'),
    envelopeId: z.string().min(1, 'Enveloppe requise'),
    name: z.string().min(1, 'Nom requis').max(255),
    code: z.string().max(64).optional(),
    description: z.string().optional(),
    expenseType: z.enum(['CAPEX', 'OPEX']),
    generalLedgerAccountId: z.string().min(1, 'Compte comptable requis'),
    analyticalLedgerAccountId: z.string().nullable().optional(),
    allocationScope: z.enum(['ENTERPRISE', 'ANALYTICAL']).optional(),
    costCenterSplits: z.array(costCenterSplitSchema).optional(),
    initialAmount: z.number().min(0),
    revisedAmount: z.number().min(0).optional(),
    currency: z.string().min(1, 'Devise requise').max(8),
  })
  .refine(
    (data) => {
      if (data.allocationScope === 'ANALYTICAL' && data.costCenterSplits) {
        const sum = data.costCenterSplits.reduce((s, x) => s + x.percentage, 0);
        return Math.abs(sum - 100) < 0.01;
      }
      return true;
    },
    { message: 'La somme des pourcentages doit être 100', path: ['costCenterSplits'] },
  );

export type CreateLineInput = z.infer<typeof createLineSchema>;
