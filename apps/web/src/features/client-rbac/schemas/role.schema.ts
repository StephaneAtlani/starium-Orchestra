import { z } from 'zod';

export const roleFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Max 100 caractères'),
  description: z.string().max(500).optional().nullable(),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;
