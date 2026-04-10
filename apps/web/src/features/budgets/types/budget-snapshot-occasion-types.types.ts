export type OccasionTypeScope = 'global' | 'client';

export interface BudgetSnapshotOccasionTypeDto {
  id: string;
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  scope: OccasionTypeScope;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetSnapshotOccasionTypeInput {
  code: string;
  label: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateBudgetSnapshotOccasionTypeInput {
  code?: string;
  label?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}
