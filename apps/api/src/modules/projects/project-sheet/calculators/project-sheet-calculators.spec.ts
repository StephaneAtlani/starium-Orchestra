import { Prisma } from '@prisma/client';
import {
  computePriorityScore,
  computeRoi,
  roiFactor,
  riskPenaltyFromLevel,
} from './project-sheet-calculators';

describe('project-sheet-calculators', () => {
  describe('computeRoi', () => {
    it('null si coût null ou 0', () => {
      expect(computeRoi(null, new Prisma.Decimal(100))).toBeNull();
      expect(computeRoi(new Prisma.Decimal(0), new Prisma.Decimal(100))).toBeNull();
    });

    it('(gain - coût) / coût', () => {
      const r = computeRoi(new Prisma.Decimal(50000), new Prisma.Decimal(120000));
      expect(r).not.toBeNull();
      expect(r!.toNumber()).toBeCloseTo(1.4, 5);
    });
  });

  describe('riskPenaltyFromLevel', () => {
    it('LOW/MEDIUM/HIGH', () => {
      expect(riskPenaltyFromLevel('LOW')).toBe(0);
      expect(riskPenaltyFromLevel('MEDIUM')).toBe(1);
      expect(riskPenaltyFromLevel('HIGH')).toBe(2);
      expect(riskPenaltyFromLevel(null)).toBe(0);
    });
  });

  describe('roiFactor', () => {
    it('null → 0', () => {
      expect(roiFactor(null)).toBe(0);
    });

    it('seuils', () => {
      expect(roiFactor(new Prisma.Decimal(2))).toBe(2);
      expect(roiFactor(new Prisma.Decimal(0.5))).toBe(1);
      expect(roiFactor(new Prisma.Decimal(-1))).toBe(-2);
      expect(roiFactor(new Prisma.Decimal(0))).toBe(0);
    });
  });

  describe('computePriorityScore', () => {
    it('null si un score manquant', () => {
      expect(
        computePriorityScore(4, null, 3, 'LOW', new Prisma.Decimal(1)),
      ).toBeNull();
    });

    it('formule MVP', () => {
      const ps = computePriorityScore(4, 5, 3, 'MEDIUM', new Prisma.Decimal(1.4));
      expect(ps).not.toBeNull();
      // 4*0.4+5*0.3+3*0.2 - 1 (MEDIUM) + 2 (ROI>1) = 4.7
      expect(ps!.toNumber()).toBeCloseTo(4.7, 2);
    });
  });
});
