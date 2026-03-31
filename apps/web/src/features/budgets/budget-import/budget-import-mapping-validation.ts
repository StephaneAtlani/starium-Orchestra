import type { BudgetImportSourceType } from '../types/budget-imports.types';
import type { BudgetImportOptionsConfig, MappingConfig } from '../types/budget-imports.types';
import type { BudgetImportConfigBlockId } from './budget-import-config-types';

/** Comment l’enveloppe cible est déterminée (UI + validation ; pas un champ API). */
export type EnvelopeImportMode = 'from_file_columns' | 'single_envelope';

export type MappingValidationResult =
  | { ok: true }
  | { ok: false; message: string; block?: BudgetImportConfigBlockId };

export function inferEnvelopeImportModeFromMapping(mapping: MappingConfig): EnvelopeImportMode {
  const f = mapping.fields ?? {};
  const hasCol = !!(
    f.envelopeCode?.trim() ||
    f.envelopeId?.trim() ||
    (f as Record<string, string | undefined>).envelope?.trim()
  );
  return hasCol ? 'from_file_columns' : 'single_envelope';
}

/**
 * Identité de ligne budgétaire : `name` ou `label` (fallback si `name` vide).
 */
export function hasBudgetLineIdentity(fields: MappingConfig['fields']): boolean {
  const t = (v: string | undefined) => (v ?? '').trim();
  const f = fields ?? {};
  return !!(t(f.name) || t((f as Record<string, string>).label));
}

export type ValidateMappingContext = {
  sourceType: BudgetImportSourceType;
  /** Onglet Excel effectif ; requis si XLSX. */
  activeSheetName?: string;
  ordersSectionEnabled: boolean;
  invoicesSectionEnabled: boolean;
};

/**
 * Réhydratation des switches sections (règles plan : `onlyAmountAlone` → les deux false).
 */
export function deriveOrdersInvoicesSectionSwitches(
  fields: MappingConfig['fields'],
): { ordersSectionEnabled: boolean; invoicesSectionEnabled: boolean } {
  const f = fields ?? {};
  const trim = (v: string | undefined) => (v ?? '').trim();
  const onlyAmountAlone =
    !!trim(f.amount) &&
    !trim(f.committedAmount) &&
    !trim(f.initialAmount) &&
    !trim(f.consumedAmount);
  if (onlyAmountAlone) {
    return { ordersSectionEnabled: false, invoicesSectionEnabled: false };
  }
  return {
    ordersSectionEnabled: !!(trim(f.committedAmount) || trim(f.initialAmount) || trim(f.amount)),
    invoicesSectionEnabled: !!(trim(f.consumedAmount) || trim(f.initialAmount) || trim(f.amount)),
  };
}

/**
 * Validation locale avant preview (RFC-018 §13).
 */
export function validateMappingForPreview(
  mapping: MappingConfig,
  options: BudgetImportOptionsConfig | undefined,
  budgetDefaultCurrency: string,
  envelopeImportMode: EnvelopeImportMode = 'from_file_columns',
  ctx?: ValidateMappingContext,
): MappingValidationResult {
  const fields = mapping.fields ?? {};
  const trim = (v: string | undefined) => (v ?? '').trim();

  const sourceType = ctx?.sourceType ?? 'CSV';
  const ordersOn = ctx?.ordersSectionEnabled ?? false;
  const invoicesOn = ctx?.invoicesSectionEnabled ?? false;

  if (sourceType === 'XLSX') {
    const sheet = trim(ctx?.activeSheetName);
    if (!sheet) {
      return {
        ok: false,
        message: 'Choisissez l’onglet Excel à importer avant de prévisualiser.',
        block: 'file_sheet',
      };
    }
  }

  if (!hasBudgetLineIdentity(fields)) {
    return {
      ok: false,
      message: 'Indiquez la colonne qui définit le libellé de ligne budgétaire (libellé ou second libellé).',
      block: 'budget_line',
    };
  }

  const hasEnvelopeCol = !!(
    trim(fields.envelopeCode) ||
    trim(fields.envelope) ||
    trim(fields.envelopeId)
  );
  const hasDefaultEnv = !!trim(options?.defaultEnvelopeId);

  if (envelopeImportMode === 'single_envelope') {
    if (hasEnvelopeCol) {
      return {
        ok: false,
        message:
          'Mode « une enveloppe pour tout l’import » : retirez le mapping des colonnes enveloppe ou passez en mode « colonne du fichier ».',
        block: 'envelope',
      };
    }
    if (!hasDefaultEnv) {
      return {
        ok: false,
        message: 'Choisissez l’enveloppe dans laquelle importer toutes les lignes.',
        block: 'envelope',
      };
    }
  } else {
    if (!hasEnvelopeCol && !hasDefaultEnv) {
      return {
        ok: false,
        message:
          'Mappez au moins une colonne enveloppe (code ou ID), ou renseignez une enveloppe par défaut pour les lignes sans code.',
        block: 'envelope',
      };
    }
  }

  if (ordersOn) {
    if (!trim(fields.committedAmount)) {
      return {
        ok: false,
        message: 'Section commande activée : mappez la colonne « montant engagé / facturé (commande) ».',
        block: 'orders',
      };
    }
    if (!trim(fields.initialAmount) && !trim(fields.amount)) {
      return {
        ok: false,
        message: 'Section commande activée : mappez un montant initial ou le montant de ligne.',
        block: 'orders',
      };
    }
  }

  if (invoicesOn) {
    if (!trim(fields.consumedAmount)) {
      return {
        ok: false,
        message: 'Section facture activée : mappez la colonne « montant consommé ».',
        block: 'invoices',
      };
    }
    if (!trim(fields.initialAmount) && !trim(fields.amount)) {
      return {
        ok: false,
        message: 'Section facture activée : mappez un montant initial ou le montant de ligne.',
        block: 'invoices',
      };
    }
  }

  const hasAmount = !!(
    trim(fields.amount) ||
    trim(fields.initialAmount) ||
    trim(fields.committedAmount) ||
    trim(fields.consumedAmount)
  );
  if (!hasAmount) {
    return {
      ok: false,
      message:
        'Mappez au moins une colonne de montant (montant, montant initial, engagé/facturé ou consommé).',
      block: 'budget_line',
    };
  }

  const hasCurrencyCol = !!trim(fields.currency);
  const hasDefaultCurrency = !!trim(options?.defaultCurrency ?? budgetDefaultCurrency);
  if (!hasCurrencyCol && !hasDefaultCurrency) {
    return {
      ok: false,
      message: 'Mappez une colonne devise ou renseignez la devise par défaut.',
      block: 'options',
    };
  }

  const m = mapping.matching;
  if (m?.strategy === 'COMPOSITE') {
    const keys = m.keys ?? [];
    if (keys.length === 0) {
      return {
        ok: false,
        message: 'En mode composite, ajoutez au moins une clé dans matching.keys.',
        block: 'options',
      };
    }
    const seen = new Set<string>();
    for (const k of keys) {
      if (seen.has(k)) {
        return { ok: false, message: `Clé composite dupliquée : ${k}.`, block: 'options' };
      }
      seen.add(k);
      if (!trim(fields[k])) {
        return {
          ok: false,
          message: `La clé composite « ${k} » doit être mappée à une colonne.`,
          block: 'options',
        };
      }
    }
  }

  return { ok: true };
}
