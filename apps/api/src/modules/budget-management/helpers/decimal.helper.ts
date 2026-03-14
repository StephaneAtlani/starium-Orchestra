import { Prisma } from '@prisma/client';

/**
 * Convertit un number en Prisma.Decimal (pour écriture en base).
 */
export function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

/**
 * Convertit un Prisma.Decimal en number (pour réponse API).
 */
export function fromDecimal(d: Prisma.Decimal | null | undefined): number {
  if (d == null) return 0;
  return Number(d);
}
