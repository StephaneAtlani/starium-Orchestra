import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const MIXED_PATCH_MESSAGE =
  'Cannot mix edition fields (title, description, estimatedBudgetAmount, estimatedCapacityDays, valueScore, riskScore, budgetScore, capacityScore, alignmentScore) with arbitration fields (decisionStatus, decisionReason) in a single request';

export const PATCH_MIXED_EDITION_ARBITRATION_MESSAGE = MIXED_PATCH_MESSAGE;

export function parseOptionalDecimalString(
  value: string | null | undefined,
  fieldLabel: string,
  maxDecimalPlaces: number,
): Prisma.Decimal | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  try {
    const dec = new Prisma.Decimal(value.trim());
    if (!dec.isFinite()) {
      throw new Error('not finite');
    }
    if (dec.decimalPlaces() > maxDecimalPlaces) {
      throw new BadRequestException(
        `${fieldLabel} must have at most ${maxDecimalPlaces} decimal places`,
      );
    }
    return dec.toDecimalPlaces(maxDecimalPlaces);
  } catch (e) {
    if (e instanceof BadRequestException) throw e;
    throw new BadRequestException(`Invalid ${fieldLabel}`);
  }
}

export function serializeDecimal(
  value: Prisma.Decimal | null | undefined,
): string | null {
  if (value == null) return null;
  return new Prisma.Decimal(value).toDecimalPlaces(2).toFixed(2);
}
