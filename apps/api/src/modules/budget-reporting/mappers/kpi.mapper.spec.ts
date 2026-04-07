import {
  aggregateLinesToKpi,
  lineToReportItem,
  groupLinesByEnvelopeType,
} from './kpi.mapper';

describe('KPI mapper', () => {
  describe('aggregateLinesToKpi', () => {
    it('calcule totaux et ratios à partir des lignes', () => {
      const lines = [
        {
          initialAmount: 100,
          revisedAmount: 120,
          forecastAmount: 110,
          committedAmount: 80,
          consumedAmount: 60,
          remainingAmount: 60,
        },
        {
          initialAmount: 50,
          revisedAmount: 80,
          forecastAmount: 90,
          committedAmount: 70,
          consumedAmount: 50,
          remainingAmount: 30,
        },
      ];
      const kpi = aggregateLinesToKpi(lines, 'EUR');
      expect(kpi.totalInitialAmount).toBe(150);
      expect(kpi.totalRevisedAmount).toBe(200);
      expect(kpi.totalConsumedAmount).toBe(110);
      expect(kpi.consumptionRate).toBe(110 / 200);
      expect(kpi.commitmentRate).toBe(150 / 200);
      expect(kpi.forecastRate).toBe(200 / 200);
      expect(kpi.varianceAmount).toBe(200 - 110);
      expect(kpi.forecastGapAmount).toBe(200 - 200);
      expect(kpi.lineCount).toBe(2);
      expect(kpi.currency).toBe('EUR');
    });

    it('retourne tous les ratios à 0 si totalRevisedAmount = 0', () => {
      const lines = [
        {
          initialAmount: 0,
          revisedAmount: 0,
          forecastAmount: 10,
          committedAmount: 5,
          consumedAmount: 0,
          remainingAmount: 0,
        },
      ];
      const kpi = aggregateLinesToKpi(lines, 'EUR');
      expect(kpi.totalRevisedAmount).toBe(0);
      expect(kpi.consumptionRate).toBe(0);
      expect(kpi.commitmentRate).toBe(0);
      expect(kpi.forecastRate).toBe(0);
      expect(typeof kpi.consumptionRate).toBe('number');
      expect(typeof kpi.commitmentRate).toBe('number');
      expect(typeof kpi.forecastRate).toBe('number');
    });

    it('calcule les compteurs d’alertes (overConsumed, overCommitted, negativeRemaining)', () => {
      const lines = [
        { initialAmount: 100, revisedAmount: 100, forecastAmount: 100, committedAmount: 120, consumedAmount: 90, remainingAmount: 10 },
        { initialAmount: 50, revisedAmount: 50, forecastAmount: 50, committedAmount: 30, consumedAmount: 60, remainingAmount: -10 },
        { initialAmount: 80, revisedAmount: 80, forecastAmount: 80, committedAmount: 80, consumedAmount: 80, remainingAmount: 0 },
      ];
      const kpi = aggregateLinesToKpi(lines, 'EUR');
      expect(kpi.overConsumedLineCount).toBe(1);
      expect(kpi.overCommittedLineCount).toBe(1);
      expect(kpi.negativeRemainingLineCount).toBe(1);
    });

    it('liste vide retourne KPI à zéro avec currency fournie', () => {
      const kpi = aggregateLinesToKpi([], 'USD', {
        budgetCount: 2,
        envelopeCount: 5,
      });
      expect(kpi.lineCount).toBe(0);
      expect(kpi.totalRevisedAmount).toBe(0);
      expect(kpi.consumptionRate).toBe(0);
      expect(kpi.commitmentRate).toBe(0);
      expect(kpi.forecastRate).toBe(0);
      expect(kpi.currency).toBe('USD');
      expect(kpi.budgetCount).toBe(2);
      expect(kpi.envelopeCount).toBe(5);
    });
  });

  describe('lineToReportItem', () => {
    it('calcule ratios et indicateurs d’alerte par ligne', () => {
      const item = lineToReportItem({
        id: 'l1',
        code: 'L1',
        name: 'Line 1',
        description: null,
        expenseType: 'OPEX',
        status: 'VALIDATED',
        currency: 'EUR',
        initialAmount: 100,
        revisedAmount: 100,
        forecastAmount: 90,
        committedAmount: 80,
        consumedAmount: 120,
        remainingAmount: -20,
      });
      expect(item.consumptionRate).toBe(120 / 100);
      expect(item.commitmentRate).toBe(80 / 100);
      expect(item.forecastRate).toBe(90 / 100);
      expect(item.overConsumed).toBe(true);
      expect(item.overCommitted).toBe(false);
      expect(item.negativeRemaining).toBe(true);
    });

    it('revisedAmount = 0 => tous les ratios = 0', () => {
      const item = lineToReportItem({
        id: 'l1',
        code: 'L1',
        name: 'Line 1',
        description: null,
        expenseType: 'OPEX',
        status: 'DRAFT',
        currency: 'EUR',
        initialAmount: 0,
        revisedAmount: 0,
        forecastAmount: 10,
        committedAmount: 5,
        consumedAmount: 0,
        remainingAmount: 0,
      });
      expect(item.consumptionRate).toBe(0);
      expect(item.commitmentRate).toBe(0);
      expect(item.forecastRate).toBe(0);
    });
  });

  describe('groupLinesByEnvelopeType', () => {
    it('groupe les lignes par type d’enveloppe et agrège', () => {
      const lines = [
        { envelopeType: 'RUN', initialAmount: 100, revisedAmount: 100, forecastAmount: 100, committedAmount: 50, consumedAmount: 40, remainingAmount: 60 },
        { envelopeType: 'RUN', initialAmount: 50, revisedAmount: 50, forecastAmount: 50, committedAmount: 20, consumedAmount: 10, remainingAmount: 40 },
        { envelopeType: 'BUILD', initialAmount: 200, revisedAmount: 200, forecastAmount: 180, committedAmount: 100, consumedAmount: 80, remainingAmount: 120 },
      ];
      const result = groupLinesByEnvelopeType(lines);
      expect(result).toHaveLength(2);
      const run = result.find((r) => r.type === 'RUN');
      const build = result.find((r) => r.type === 'BUILD');
      expect(run?.lineCount).toBe(2);
      expect(run?.totalRevisedAmount).toBe(150);
      expect(build?.lineCount).toBe(1);
      expect(build?.totalRevisedAmount).toBe(200);
    });
  });
});
