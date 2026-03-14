import { randomBytes } from 'crypto';

const SUFFIX_LENGTH = 6;

/**
 * Génère un suffixe court unique (hex).
 */
export function generateCodeSuffix(): string {
  return randomBytes(SUFFIX_LENGTH).toString('hex');
}

/**
 * Génère un code d'exercice unique : EX-YYYY-suffix
 */
export function generateBudgetExerciseCode(startDate: Date): string {
  const year = startDate.getFullYear();
  return `EX-${year}-${generateCodeSuffix()}`;
}

/**
 * Génère un code budget : BUD-suffix
 */
export function generateBudgetCode(): string {
  return `BUD-${generateCodeSuffix()}`;
}

/**
 * Génère un code enveloppe : ENV-suffix
 */
export function generateEnvelopeCode(): string {
  return `ENV-${generateCodeSuffix()}`;
}

/**
 * Génère un code ligne budgétaire : BL-suffix
 */
export function generateBudgetLineCode(): string {
  return `BL-${generateCodeSuffix()}`;
}
