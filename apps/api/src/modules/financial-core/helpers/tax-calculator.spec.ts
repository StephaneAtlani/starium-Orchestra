import { Prisma } from '@prisma/client';
import { TaxCalculator } from './tax-calculator';

describe('TaxCalculator', () => {
  it('calcule HT -> TVA -> TTC (taxRate=20)', () => {
    const res = TaxCalculator.fromHtAndTaxRate({
      amountHt: new Prisma.Decimal(100),
      taxRate: new Prisma.Decimal(20),
    });

    expect(Number(res.taxAmount)).toBe(20);
    expect(Number(res.amountTtc)).toBe(120);
    expect(Number(res.amountHt)).toBe(100);
    expect(Number(res.taxRate)).toBe(20);
  });

  it('calcule TTC -> HT (taxRate=20)', () => {
    const res = TaxCalculator.fromTtcAndTaxRate({
      amountTtc: new Prisma.Decimal(120),
      taxRate: new Prisma.Decimal(20),
    });

    expect(Number(res.taxAmount)).toBe(20);
    expect(Number(res.amountHt)).toBe(100);
  });

  it('taxRate=0 est valide', () => {
    const res = TaxCalculator.fromHtAndTaxRate({
      amountHt: new Prisma.Decimal(100.25),
      taxRate: new Prisma.Decimal(0),
    });

    expect(Number(res.taxAmount)).toBe(0);
    expect(Number(res.amountTtc)).toBe(100.25);
  });

  it('combo3 incohérent (amountHt + taxAmount + amountTtc) rejette', () => {
    expect(() =>
      TaxCalculator.fromHtTaxAmountAndAmountTtc({
        amountHt: new Prisma.Decimal(100),
        taxAmount: new Prisma.Decimal(20.01),
        amountTtc: new Prisma.Decimal(120.00),
      }),
    ).toThrow(/Incohérence/);
  });

  it('combo3 incohérent : amountHt=0 avec taxAmount != 0 rejette', () => {
    expect(() =>
      TaxCalculator.fromHtTaxAmountAndAmountTtc({
        amountHt: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(1),
        amountTtc: new Prisma.Decimal(1),
      }),
    ).toThrow(/dérivé impossible/);
  });
});

