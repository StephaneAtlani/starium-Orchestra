export type OccasionTypeScope = 'global' | 'client';

export interface BudgetSnapshotOccasionTypeItem {
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
