import { z } from 'zod';

export const collaboratorEditSchema = z.object({
  displayName: z.string().trim().min(2, 'Nom affiché requis').max(200),
  email: z.string().trim().email('Email invalide').max(190).or(z.literal('')),
  jobTitle: z.string().trim().max(200).or(z.literal('')),
  department: z.string().trim().max(200).or(z.literal('')),
  managerId: z.string().trim().max(190).or(z.literal('')),
  internalNotes: z.string().trim().max(5000).or(z.literal('')),
  tagsInput: z.string().trim().max(500).or(z.literal('')),
});

export type CollaboratorEditValues = z.infer<typeof collaboratorEditSchema>;

