export interface BudgetEnvelopeDetail {
  id: string;
  budgetId: string;
  budgetName: string;
  code: string | null;
  name: string;
  description: string | null;
  currency: string;
  initialAmount: number;
  revisedAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
}

export interface BudgetEnvelopeLineItem {
  id: string;
  code: string | null;
  name: string;
  initialAmount: number;
  revisedAmount: number;
  forecastAmount: number;
  committedAmount: number;
  consumedAmount: number;
  remainingAmount: number;
  currency: string;
}

