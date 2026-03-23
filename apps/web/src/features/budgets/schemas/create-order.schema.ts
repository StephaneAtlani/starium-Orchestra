import { z } from 'zod';

export const createOrderSchema = z.object({
  supplierName: z.string().min(1, 'Fournisseur requis').max(255),
  reference: z.string().max(128, 'Référence trop longue').optional().or(z.literal('')),
  eventDate: z.string().min(1, 'Date requise'),
  label: z.string().min(1, 'Libellé requis').max(255),
  amountHtInput: z.number().min(0, 'Le montant HT doit être >= 0'),
  amountTtcInput: z.number().min(0, 'Le montant TTC doit être >= 0'),
  taxRateInput: z.number().min(0, 'TVA % doit être >= 0'),
  description: z.string().optional().or(z.literal('')),
});

export type CreateOrderValues = z.input<typeof createOrderSchema>;

