import { Prisma } from '@prisma/client';

export type TaxCalcResult = {
  amountHt: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  amountTtc: Prisma.Decimal;
};

function toDecimal2(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2);
}

/**
 * Centralise les calculs fiscaux pour RFC FC-006.
 * - Decimal only : Prisma.Decimal
 * - Jamais de float JS dans les calculs
 */
export class TaxCalculator {
  static fromHtAndTaxRate(params: {
    amountHt: Prisma.Decimal;
    taxRate: Prisma.Decimal;
  }): TaxCalcResult {
    const amountHt = toDecimal2(params.amountHt);
    const taxRate = toDecimal2(params.taxRate);

    const taxAmount = amountHt.mul(taxRate).div(100).toDecimalPlaces(2);
    const amountTtc = amountHt.plus(taxAmount).toDecimalPlaces(2);

    return { amountHt, taxRate, taxAmount, amountTtc };
  }

  static fromTtcAndTaxRate(params: {
    amountTtc: Prisma.Decimal;
    taxRate: Prisma.Decimal;
  }): TaxCalcResult {
    const amountTtc = toDecimal2(params.amountTtc);
    const taxRate = toDecimal2(params.taxRate);

    const multiplier = new Prisma.Decimal(1).plus(taxRate.div(100));
    const amountHt = amountTtc.div(multiplier).toDecimalPlaces(2);
    const taxAmount = amountTtc.minus(amountHt).toDecimalPlaces(2);

    return { amountHt, taxRate, taxAmount, amountTtc };
  }

  static fromHtTaxAmountAndAmountTtc(params: {
    amountHt: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    amountTtc: Prisma.Decimal;
  }): TaxCalcResult {
    const amountHt = toDecimal2(params.amountHt);
    const taxAmount = toDecimal2(params.taxAmount);
    const amountTtc = toDecimal2(params.amountTtc);

    // Validation stricte de cohérence arrondie à 2 décimales
    const expectedAmountTtc = amountHt.plus(taxAmount).toDecimalPlaces(2);
    if (!expectedAmountTtc.eq(amountTtc)) {
      throw new Error(
        'Incohérence : amountTtc ne correspond pas à amountHt + taxAmount (arrondi 2 décimales).',
      );
    }

    let taxRate: Prisma.Decimal;
    if (amountHt.eq(0)) {
      if (!taxAmount.eq(0)) {
        throw new Error(
          'Incohérence : taxRate dérivé impossible (amountHt = 0 mais taxAmount != 0).',
        );
      }
      taxRate = new Prisma.Decimal(0);
    } else {
      taxRate = taxAmount.mul(100).div(amountHt).toDecimalPlaces(2);
    }

    // Recalcule attendu à partir du taxRate dérivé pour vérifier l’arrondi
    const recomputed = TaxCalculator.fromHtAndTaxRate({ amountHt, taxRate });
    if (!recomputed.taxAmount.eq(taxAmount)) {
      throw new Error(
        'Incohérence : taxAmount ne correspond pas au taxRate dérivé (arrondi 2 décimales).',
      );
    }

    return { amountHt, taxRate, taxAmount, amountTtc };
  }
}

