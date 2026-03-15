import { z } from 'zod';

/** Enums alignés backend (BudgetExerciseStatus). */
const BUDGET_EXERCISE_STATUS = ['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'] as const;

export const budgetExerciseFormSchema = z
  .object({
    name: z.string().min(1, 'Nom requis').max(255),
    code: z.string().max(64).optional().or(z.literal('')),
    startDate: z.string().min(1, 'Date de début requise'),
    endDate: z.string().min(1, 'Date de fin requise'),
    status: z.enum(BUDGET_EXERCISE_STATUS).optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.endDate) >= new Date(data.startDate);
    },
    { message: 'La date de fin doit être postérieure ou égale à la date de début', path: ['endDate'] },
  );

export type BudgetExerciseFormValues = z.infer<typeof budgetExerciseFormSchema>;
