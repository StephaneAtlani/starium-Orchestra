import { z } from 'zod';

export const createEnvelopeSchema = z.object({
  budgetId: z.string().min(1, 'Budget requis'),
  name: z.string().min(1, 'Nom requis').max(255),
  code: z.string().max(64).optional(),
  description: z.string().max(500, '500 caractères maximum').optional(),
  type: z.enum(['RUN', 'BUILD', 'TRANSVERSE']),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED']).default('DRAFT'),
  parentId: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export function buildCreateEnvelopeSchema(options?: { requireJustification?: boolean }) {
  if (!options?.requireJustification) return createEnvelopeSchema;
  return createEnvelopeSchema.superRefine((val, ctx) => {
    if (!val.description?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: 'Justification (PA / CODIR) obligatoire',
      });
    }
  });
}

export type CreateEnvelopeInput = z.input<typeof createEnvelopeSchema>;
