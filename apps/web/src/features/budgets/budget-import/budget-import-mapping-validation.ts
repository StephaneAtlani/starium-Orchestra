import type { BudgetImportOptionsConfig, MappingConfig } from '../types/budget-imports.types';

export type MappingValidationResult = { ok: true } | { ok: false; message: string };

/** Comment l’enveloppe cible est déterminée (UI + validation ; pas un champ API). */
export type EnvelopeImportMode = 'from_file_columns' | 'single_envelope';

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
 * Validation locale avant preview (alignée plan RFC-018).
 */
export function validateMappingForPreview(
  mapping: MappingConfig,
  options: BudgetImportOptionsConfig | undefined,
  budgetDefaultCurrency: string,
  envelopeImportMode: EnvelopeImportMode = 'from_file_columns',
): MappingValidationResult {
  const fields = mapping.fields ?? {};
  const trim = (v: string | undefined) => (v ?? '').trim();

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
      };
    }
    if (!hasDefaultEnv) {
      return {
        ok: false,
        message: 'Choisissez l’enveloppe dans laquelle importer toutes les lignes.',
      };
    }
  } else {
    if (!hasEnvelopeCol && !hasDefaultEnv) {
      return {
        ok: false,
        message:
          'Mappez au moins une colonne enveloppe (code ou ID), ou renseignez une enveloppe par défaut pour les lignes sans code.',
      };
    }
  }

  const hasCurrencyCol = !!trim(fields.currency);
  const hasDefaultCurrency = !!trim(options?.defaultCurrency ?? budgetDefaultCurrency);
  if (!hasCurrencyCol && !hasDefaultCurrency) {
    return {
      ok: false,
      message: 'Mappez une colonne devise ou renseignez la devise par défaut.',
    };
  }

  const m = mapping.matching;
  if (m?.strategy === 'COMPOSITE') {
    const keys = m.keys ?? [];
    if (keys.length === 0) {
      return { ok: false, message: 'En mode composite, ajoutez au moins une clé dans matching.keys.' };
    }
    const seen = new Set<string>();
    for (const k of keys) {
      if (seen.has(k)) {
        return { ok: false, message: `Clé composite dupliquée : ${k}.` };
      }
      seen.add(k);
      if (!trim(fields[k])) {
        return { ok: false, message: `La clé composite « ${k} » doit être mappée à une colonne.` };
      }
    }
  }

  return { ok: true };
}
