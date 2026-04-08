import { z } from 'zod';

export const createBudgetSchema = z.object({
  exerciseId: z.string().min(1, 'Exercice requis'),
  name: z.string().min(1, 'Nom requis').max(255),
  code: z.string().max(64).optional(),
  description: z.string().optional(),
  currency: z.string().min(1, 'Devise requise').max(8),
  status: z
    .enum([
      'DRAFT',
      'SUBMITTED',
      'REVISED',
      'VALIDATED',
      'LOCKED',
      'ARCHIVED',
    ])
    .optional(),
  /** Utilisateur membre du client actif (API valide le rattachement). */
  ownerUserId: z.string().min(1, 'Sélectionnez un membre comme responsable du budget'),
  taxMode: z.enum(['HT', 'TTC']).optional(),
  defaultTaxRate: z
    .string()
    .regex(/^(0|[0-9]{1,3})(\.[0-9]{1,2})?$/, 'TVA invalide')
    .optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
