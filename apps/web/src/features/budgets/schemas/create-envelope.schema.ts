import { z } from 'zod';

export const createEnvelopeSchema = z.object({
  budgetId: z.string().min(1, 'Budget requis'),
  name: z.string().min(1, 'Nom requis').max(255),
  code: z.string().max(64).optional(),
  description: z.string().optional(),
  type: z.enum(['RUN', 'BUILD', 'TRANSVERSE']),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED']).default('DRAFT'),
  parentId: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type CreateEnvelopeInput = z.infer<typeof createEnvelopeSchema>;
