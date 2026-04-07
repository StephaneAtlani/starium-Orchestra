/**
 * Mappers formulaire ↔ API pour les entités budget (RFC-FE-015).
 * Montants : jamais envoyer "" ; revisedAmount vide → undefined.
 * Dates : string (input) ↔ ISO (API).
 */

import type {
  Budget,
  BudgetEnvelope,
  BudgetExercise,
  BudgetLine,
} from '../types/budget-management.types';
import type { BudgetExerciseFormValues } from '../schemas/budget-exercise-form.schema';
import type { CreateBudgetInput } from '../schemas/create-budget.schema';
import type { CreateEnvelopeInput } from '../schemas/create-envelope.schema';
import type { BudgetLineFormValues } from '../schemas/budget-line-form.schema';
import type {
  CreateExercisePayload,
  UpdateExercisePayload,
  CreateBudgetPayload,
  UpdateBudgetPayload,
  CreateEnvelopePayload,
  UpdateEnvelopePayload,
  CreateLinePayload,
  UpdateLinePayload,
} from '../api/budget-management.api';

function isoToInputDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function inputDateToIso(s: string | undefined): string | undefined {
  if (!s?.trim()) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

// ——— Exercice ———
export function exerciseApiToForm(exercise: BudgetExercise): BudgetExerciseFormValues {
  return {
    name: exercise.name,
    code: exercise.code ?? '',
    startDate: isoToInputDate(exercise.startDate),
    endDate: isoToInputDate(exercise.endDate),
    status: exercise.status as BudgetExerciseFormValues['status'],
  };
}

export function exerciseFormToCreatePayload(
  values: BudgetExerciseFormValues,
): CreateExercisePayload {
  return {
    name: values.name,
    code: values.code || undefined,
    startDate: inputDateToIso(values.startDate) ?? values.startDate,
    endDate: inputDateToIso(values.endDate) ?? values.endDate,
    status: values.status,
  };
}

export function exerciseFormToUpdatePayload(
  values: BudgetExerciseFormValues,
): UpdateExercisePayload {
  return {
    name: values.name,
    code: values.code || undefined,
    startDate: inputDateToIso(values.startDate) ?? values.startDate,
    endDate: inputDateToIso(values.endDate) ?? values.endDate,
    status: values.status,
  };
}

// ——— Budget ———
export function budgetApiToForm(budget: Budget): CreateBudgetInput {
  return {
    exerciseId: budget.exerciseId,
    name: budget.name,
    code: budget.code ?? '',
    description: budget.description ?? '',
    currency: budget.currency,
    status: budget.status as CreateBudgetInput['status'],
    taxMode: budget.taxMode ?? 'HT',
    defaultTaxRate:
      budget.defaultTaxRate === null || budget.defaultTaxRate === undefined
        ? undefined
        : budget.defaultTaxRate.toFixed(2),
  };
}

export function budgetFormToCreatePayload(values: CreateBudgetInput): CreateBudgetPayload {
  return {
    exerciseId: values.exerciseId,
    name: values.name,
    code: values.code || undefined,
    description: values.description || undefined,
    currency: values.currency,
    status: values.status,
    taxMode: values.taxMode,
    defaultTaxRate: values.defaultTaxRate,
  };
}

export function budgetFormToUpdatePayload(values: CreateBudgetInput): UpdateBudgetPayload {
  return {
    name: values.name,
    code: values.code || undefined,
    description: values.description || undefined,
    currency: values.currency,
    status: values.status,
    taxMode: values.taxMode,
    defaultTaxRate: values.defaultTaxRate,
  };
}

// ——— Enveloppe ———
export function envelopeApiToForm(envelope: BudgetEnvelope): CreateEnvelopeInput {
  return {
    budgetId: envelope.budgetId,
    name: envelope.name,
    code: envelope.code ?? '',
    description: envelope.description ?? '',
    type: envelope.type as CreateEnvelopeInput['type'],
    parentId: envelope.parentId ?? undefined,
  };
}

export function envelopeFormToCreatePayload(
  values: CreateEnvelopeInput,
): CreateEnvelopePayload {
  return {
    budgetId: values.budgetId,
    name: values.name,
    code: values.code || undefined,
    description: values.description || undefined,
    type: values.type,
    parentId: values.parentId || undefined,
    sortOrder: values.sortOrder,
  };
}

export function envelopeFormToUpdatePayload(
  values: CreateEnvelopeInput,
): UpdateEnvelopePayload {
  return {
    name: values.name,
    code: values.code || undefined,
    description: values.description || undefined,
    type: values.type,
    parentId: values.parentId || undefined,
    sortOrder: values.sortOrder,
  };
}

// ——— Ligne ———
export function lineApiToForm(
  line: BudgetLine,
  budgetTaxMode: 'HT' | 'TTC' = 'HT',
): BudgetLineFormValues {
  const initialAmount =
    budgetTaxMode === 'TTC' ? line.initialAmountTtc ?? line.initialAmount : line.initialAmount;
  const revisedAmount =
    budgetTaxMode === 'TTC' ? line.revisedAmountTtc ?? line.revisedAmount : line.revisedAmount;

  return {
    budgetId: line.budgetId,
    envelopeId: line.envelopeId,
    name: line.name,
    code: line.code ?? '',
    description: line.description ?? '',
    expenseType: line.expenseType as BudgetLineFormValues['expenseType'],
    generalLedgerAccountId: line.generalLedgerAccountId ?? '',
    initialAmount,
    revisedAmount,
    currency: line.currency,
  };
}

export function lineFormToCreatePayload(values: BudgetLineFormValues): CreateLinePayload {
  const payload: CreateLinePayload = {
    budgetId: values.budgetId,
    envelopeId: values.envelopeId,
    name: values.name,
    code: values.code || undefined,
    description: values.description || undefined,
    expenseType: values.expenseType,
    initialAmount: values.initialAmount,
    revisedAmount:
      values.revisedAmount === '' || values.revisedAmount === undefined
        ? undefined
        : Number(values.revisedAmount),
    currency: values.currency,
    status: values.status,
  };

  if (values.generalLedgerAccountId && values.generalLedgerAccountId.trim().length > 0) {
    payload.generalLedgerAccountId = values.generalLedgerAccountId;
  }

  return payload;
}

export function lineFormToUpdatePayload(values: BudgetLineFormValues): UpdateLinePayload {
  const payload: UpdateLinePayload = {
    name: values.name,
    code: values.code || undefined,
    description: values.description || undefined,
    revisedAmount:
      values.revisedAmount === '' || values.revisedAmount === undefined
        ? undefined
        : Number(values.revisedAmount),
    currency: values.currency,
    status: values.status,
  };

  // Permet explicitement de "vider" le compte comptable (si autorisé côté backend).
  // Note: le backend normalise "" → null.
  payload.generalLedgerAccountId = values.generalLedgerAccountId === '' ? null : values.generalLedgerAccountId;
  return payload;
}
