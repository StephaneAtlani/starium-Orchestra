import { z } from 'zod';

export const createBudgetSchema = z.object({
  exerciseId: z.string().min(1, 'Exercice requis'),
  name: z.string().min(1, 'Nom requis').max(255),
  code: z.string().max(64).optional(),
  description: z.string().optional(),
  currency: z.string().min(1, 'Devise requise').max(8),
  status: z.enum(['DRAFT', 'ACTIVE', 'LOCKED', 'ARCHIVED']).optional(),
  ownerUserId: z.string().optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
