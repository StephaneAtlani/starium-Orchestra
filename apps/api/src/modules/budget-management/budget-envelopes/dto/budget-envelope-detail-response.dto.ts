export interface BudgetEnvelopeDetailResponseDto {
  id: string;
  budgetId: string;
  budgetName: string;
  code: string | null;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'LOCKED' | 'ARCHIVED';
  currency: string;
  initialAmount: number;
  revisedAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
}

