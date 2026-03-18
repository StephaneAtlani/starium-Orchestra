import { z } from 'zod';

export const createInvoiceSchema = z.object({
  eventDate: z.string().min(1, 'Date requise'),
  label: z.string().min(1, 'Libellé requis').max(255),
  inputMode: z.enum(['HT', 'TTC']),
  amountInput: z.number().min(0, 'Le montant doit être >= 0'),
  description: z.string().optional().or(z.literal('')),
});

export type CreateInvoiceValues = z.infer<typeof createInvoiceSchema>;

