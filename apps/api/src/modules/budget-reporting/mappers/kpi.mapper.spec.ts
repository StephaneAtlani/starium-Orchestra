import { aggregateLinesToKpi, lineToReportItem, groupLinesByEnvelopeType } from './kpi.mapper';

describe('kpi.mapper', () => {
  describe('aggregateLinesToKpi', () => {
    it('agrège les montants et calcule les ratios', () => {
      const kpi = aggregateLinesToKpi(
        [
          {
            initialAmount: 120,
            forecastAmount: 100,
            committedAmount: 40,
            consumedAmount: 30,
            remainingAmount: 50,
          },
          {
            initialAmount: 80,
            forecastAmount: 90,
            committedAmount: 20,
            consumedAmount: 10,
            remainingAmount: 50,
          },
        ],
        'EUR',
      );

      expect(kpi.totalInitialAmount).toBe(200);
      expect(kpi.totalForecastAmount).toBe(190);
      expect(kpi.totalCommittedAmount).toBe(60);
      expect(kpi.totalConsumedAmount).toBe(40);
      expect(kpi.totalRemainingAmount).toBe(100);
      expect(kpi.consumptionRate).toBeCloseTo(0.2);
      expect(kpi.commitmentRate).toBeCloseTo(0.3);
      expect(kpi.forecastRate).toBeCloseTo(0.95);
      expect(kpi.varianceAmount).toBe(160);
      expect(kpi.forecastGapAmount).toBe(-10);
      expect(kpi.lineCount).toBe(2);
      expect(kpi.overConsumedLineCount).toBe(0);
      expect(kpi.overCommittedLineCount).toBe(0);
      expect(kpi.negativeRemainingLineCount).toBe(0);
      expect(kpi.currency).toBe('EUR');
    });

    it('retourne tous les ratios à 0 si total budgétaire = 0', () => {
      const kpi = aggregateLinesToKpi(
        [
          {
            initialAmount: 0,
            forecastAmount: 0,
            committedAmount: 0,
            consumedAmount: 0,
            remainingAmount: 0,
          },
        ],
        'EUR',
      );

      expect(kpi.totalInitialAmount).toBe(0);
      expect(kpi.consumptionRate).toBe(0);
      expect(kpi.commitmentRate).toBe(0);
      expect(kpi.forecastRate).toBe(0);
      expect(kpi.varianceAmount).toBe(0);
      expect(kpi.forecastGapAmount).toBe(0);
    });

    it('compte les lignes en alerte', () => {
      const kpi = aggregateLinesToKpi(
        [
          {
            initialAmount: 100,
            forecastAmount: 100,
            committedAmount: 120,
            consumedAmount: 90,
            remainingAmount: 10,
          },
          {
            initialAmount: 50,
            forecastAmount: 50,
            committedAmount: 30,
            consumedAmount: 60,
            remainingAmount: -10,
          },
          {
            initialAmount: 80,
            forecastAmount: 80,
            committedAmount: 80,
            consumedAmount: 80,
            remainingAmount: 0,
          },
        ],
        'EUR',
      );

      expect(kpi.overConsumedLineCount).toBe(1);
      expect(kpi.overCommittedLineCount).toBe(1);
      expect(kpi.negativeRemainingLineCount).toBe(1);
    });
  });

  describe('lineToReportItem', () => {
    it('calcule les ratios par ligne', () => {
      const item = lineToReportItem({
        id: '1',
        code: 'L1',
        name: 'Line 1',
        description: null,
        expenseType: 'OPEX',
        status: 'ACTIVE',
        currency: 'EUR',
        initialAmount: 100,
        forecastAmount: 80,
        committedAmount: 40,
        consumedAmount: 30,
        remainingAmount: 30,
      });

      expect(item.consumptionRate).toBeCloseTo(0.3);
      expect(item.commitmentRate).toBeCloseTo(0.4);
      expect(item.forecastRate).toBeCloseTo(0.8);
      expect(item.overConsumed).toBe(false);
      expect(item.overCommitted).toBe(false);
      expect(item.negativeRemaining).toBe(false);
    });

    it('initialAmount = 0 => tous les ratios = 0', () => {
      const item = lineToReportItem({
        id: '1',
        code: 'L1',
        name: 'Line 1',
        description: null,
        expenseType: 'OPEX',
        status: 'ACTIVE',
        currency: 'EUR',
        initialAmount: 0,
        forecastAmount: 10,
        committedAmount: 5,
        consumedAmount: 3,
        remainingAmount: 0,
      });

      expect(item.consumptionRate).toBe(0);
      expect(item.commitmentRate).toBe(0);
      expect(item.forecastRate).toBe(0);
    });
  });

  describe('groupLinesByEnvelopeType', () => {
    it('groupe par type', () => {
      const breakdown = groupLinesByEnvelopeType([
        {
          envelopeType: 'RUN',
          initialAmount: 100,
          forecastAmount: 100,
          committedAmount: 50,
          consumedAmount: 40,
          remainingAmount: 60,
        },
        {
          envelopeType: 'RUN',
          initialAmount: 50,
          forecastAmount: 50,
          committedAmount: 20,
          consumedAmount: 10,
          remainingAmount: 40,
        },
        {
          envelopeType: 'BUILD',
          initialAmount: 200,
          forecastAmount: 180,
          committedAmount: 100,
          consumedAmount: 80,
          remainingAmount: 120,
        },
      ]);

      const run = breakdown.find((b) => b.type === 'RUN');
      const build = breakdown.find((b) => b.type === 'BUILD');

      expect(run?.totalInitialAmount).toBe(150);
      expect(build?.totalInitialAmount).toBe(200);
    });
  });
});
