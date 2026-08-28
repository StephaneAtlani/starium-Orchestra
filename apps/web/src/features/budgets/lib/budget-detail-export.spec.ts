import { describe, expect, it } from 'vitest';
import {
  budgetDetailCsvFilename,
  buildBudgetDetailCsvContent,
} from './budget-detail-export';
import type {
  BudgetEnvelope,
  BudgetLine,
} from '../types/budget-management.types';

function makeEnvelope(overrides: Partial<BudgetEnvelope> = {}): BudgetEnvelope {
  return {
    id: 'env-cuid-should-not-appear',
    clientId: 'client-1',
    budgetId: 'budget-1',
    name: 'Infrastructure',
    code: 'INFRA',
    description: null,
    type: 'RUN',
    status: 'ACTIVE',
    parentId: null,
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeLine(overrides: Partial<BudgetLine> = {}): BudgetLine {
  return {
    id: 'line-cuid-should-not-appear',
    clientId: 'client-1',
    budgetId: 'budget-1',
    envelopeId: 'env-cuid-should-not-appear',
    name: 'Hébergement',
    code: 'HOST',
    description: null,
    expenseType: 'OPEX',
    generalLedgerAccountId: null,
    analyticalLedgerAccountId: null,
    allocationScope: 'LINE',
    initialAmount: 12000,
    forecastAmount: 11000,
    committedAmount: 4000,
    consumedAmount: 2500,
    remainingAmount: 5500,
    currency: 'EUR',
    taxRate: 20,
    initialAmountTtc: 14400,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildBudgetDetailCsvContent', () => {
  it('expose les en-têtes du vocabulaire unique', () => {
    const csv = buildBudgetDetailCsvContent({ envelopes: [], lines: [] });
    const headers = csv.split('\n')[0];
    expect(headers).toContain('Budget HT');
    expect(headers).toContain('Atterrissage HT');
    expect(headers).toContain('Engagé HT');
    expect(headers).toContain('Consommé HT');
    expect(headers).toContain('Restant HT');
    expect(headers).not.toContain('Total planifié');
  });

  it('produit une ligne enveloppe suivie de ses lignes', () => {
    const csv = buildBudgetDetailCsvContent({
      envelopes: [makeEnvelope()],
      lines: [makeLine()],
    });
    const rows = csv.split('\n');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain('"Enveloppe"');
    expect(rows[1]).toContain('"Infrastructure"');
    expect(rows[2]).toContain('"Ligne"');
    expect(rows[2]).toContain('"Hébergement"');
  });

  it('agrège les montants de l’enveloppe depuis ses lignes', () => {
    const csv = buildBudgetDetailCsvContent({
      envelopes: [makeEnvelope()],
      lines: [makeLine(), makeLine({ id: 'line-2', initialAmount: 8000 })],
    });
    const envelopeRow = csv.split('\n')[1]!;
    expect(envelopeRow).toContain('"20000,00"');
  });

  it('n’exporte aucun identifiant technique', () => {
    const csv = buildBudgetDetailCsvContent({
      envelopes: [makeEnvelope()],
      lines: [makeLine()],
    });
    expect(csv).not.toContain('cuid-should-not-appear');
    expect(csv).not.toContain('client-1');
  });

  it('échappe les guillemets et les séparateurs', () => {
    const csv = buildBudgetDetailCsvContent({
      envelopes: [makeEnvelope({ name: 'Infra "core"; prod' })],
      lines: [],
    });
    expect(csv).toContain('"Infra ""core""; prod"');
  });

  it('laisse le TTC vide quand une ligne n’a pas de montant TTC', () => {
    const csv = buildBudgetDetailCsvContent({
      envelopes: [makeEnvelope()],
      lines: [makeLine({ initialAmountTtc: null })],
    });
    const envelopeRow = csv.split('\n')[1]!;
    expect(envelopeRow.endsWith(';""')).toBe(true);
  });
});

describe('budgetDetailCsvFilename', () => {
  it('génère un nom de fichier lisible sans accent', () => {
    expect(budgetDetailCsvFilename('Budget SI 2026 — Général')).toBe(
      'budget-budget-si-2026-general.csv',
    );
  });

  it('retombe sur un nom générique si le nom ne produit aucun segment', () => {
    expect(budgetDetailCsvFilename('###')).toBe('budget-budget.csv');
  });
});
