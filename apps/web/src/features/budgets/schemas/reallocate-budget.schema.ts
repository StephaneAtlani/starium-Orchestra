import { z } from 'zod';

export const reallocateBudgetSchema = z.object({
  sourceLineId: z.string().min(1, 'Ligne source requise'),
  targetLineId: z.string().min(1, 'Ligne cible requise'),
  amount: z.number().min(0.01, 'Montant strictement positif'),
  reason: z.string().max(500).optional(),
});

export type ReallocateBudgetInput = z.infer<typeof reallocateBudgetSchema>;
