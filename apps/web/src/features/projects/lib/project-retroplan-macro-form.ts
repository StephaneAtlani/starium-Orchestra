export type RetroplanMacroStepRow = {
  name: string;
  daysBeforeEnd: string;
};

/** Jalons macro par défaut — aligné fiche projet / modale rétroplanning. */
export const DEFAULT_RETROPLAN_MACRO_STEPS: RetroplanMacroStepRow[] = [
  { name: 'Livraison / mise en production', daysBeforeEnd: '0' },
  { name: 'Recette utilisateur', daysBeforeEnd: '21' },
  { name: 'Cadrage validé', daysBeforeEnd: '60' },
];

export function cloneDefaultRetroplanMacroSteps(): RetroplanMacroStepRow[] {
  return DEFAULT_RETROPLAN_MACRO_STEPS.map((step) => ({ ...step }));
}

/** Même logique que l'API (date-only → UTC midi, − n jours calendaires). */
export function formatRetroplanComputedTargetDate(
  anchorEndDate: string,
  daysBeforeEndStr: string,
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchorEndDate.trim())) return null;
  const raw = String(daysBeforeEndStr).trim();
  if (raw === '') return null;
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchorEndDate.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const anchor = new Date(Date.UTC(y, mo, d, 12, 0, 0, 0));
  const target = new Date(anchor.getTime() - n * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(target);
}

export function parseRetroplanMacroSteps(
  steps: RetroplanMacroStepRow[],
): { name: string; daysBeforeEnd: number }[] {
  const parsed: { name: string; daysBeforeEnd: number }[] = [];
  for (const step of steps) {
    const name = step.name.trim();
    if (!name) {
      throw new Error('Chaque jalon doit avoir un libellé.');
    }
    const rawDays = String(step.daysBeforeEnd).trim();
    if (rawDays === '') {
      throw new Error(`« ${name} » : renseignez le nombre de jours avant la fin.`);
    }
    const n = Number(rawDays.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      throw new Error(
        `« ${name} » : indiquez un nombre entier de jours avant la fin (≥ 0).`,
      );
    }
    parsed.push({ name, daysBeforeEnd: n });
  }
  if (parsed.length === 0) {
    throw new Error('Ajoutez au moins un jalon ou désactivez le rétroplanning macro.');
  }
  return parsed;
}
