import { z } from 'zod';

export const skillFormSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(200),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Catégorie requise'),
  referenceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']),
  status: z.enum(['DRAFT', 'ACTIVE']),
});

export type SkillFormValues = z.infer<typeof skillFormSchema>;

export const skillCategoryFormSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(200),
  description: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export type SkillCategoryFormValues = z.infer<typeof skillCategoryFormSchema>;
