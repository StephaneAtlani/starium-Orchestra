export type ContractKindTypeScope = 'global' | 'client';

export interface ContractKindTypeDto {
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

export interface CreateContractKindTypeInput {
  code: string;
  label: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateContractKindTypeInput {
  code?: string;
  label?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}
