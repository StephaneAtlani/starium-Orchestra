import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Parse Decimal string ; exige > 0 et au plus 2 décimales. */
export function parsePositiveDays(raw: string, field = 'days'): Prisma.Decimal {
  let d: Prisma.Decimal;
  try {
    d = new Prisma.Decimal(raw);
  } catch {
    throw new BadRequestException(`${field} invalide`);
  }
  if (!d.isFinite() || d.lte(0)) {
    throw new BadRequestException(`${field} doit être > 0`);
  }
  if (d.decimalPlaces() > 2) {
    throw new BadRequestException(`${field} : max 2 décimales`);
  }
  if (d.gt(new Prisma.Decimal('999999.99'))) {
    throw new BadRequestException(`${field} trop grand`);
  }
  return d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** null → hérite ; sinon même règles que parsePositiveDays. */
export function parseOptionalPositiveDays(
  raw: string | null,
  field = 'days',
): Prisma.Decimal | null {
  if (raw === null) return null;
  return parsePositiveDays(raw, field);
}

export function decimalToString(d: Prisma.Decimal): string {
  return d.toFixed(2);
}
