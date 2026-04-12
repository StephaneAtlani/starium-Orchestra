export type ContractKindTypeScope = 'global' | 'client';

export interface ContractKindTypeItem {
  id: string;
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  scope: ContractKindTypeScope;
  createdAt: string;
  updatedAt: string;
}
