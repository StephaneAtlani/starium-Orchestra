/** Allowlist couleurs éditeur procédures — miroir API `procedure-content.util.ts`. */

export const PROCEDURE_TEXT_COLOR_OPTIONS = [
  { token: 'ink', label: 'Encre', cssVar: 'var(--brand-ink)' },
  { token: 'muted', label: 'Atténué', cssVar: 'var(--color-text-muted)' },
  { token: 'brand', label: 'Or marque', cssVar: 'var(--brand-gold-700)' },
  { token: 'danger', label: 'Danger', cssVar: 'var(--state-danger)' },
  { token: 'success', label: 'Succès', cssVar: 'var(--state-success)' },
  { token: 'warning', label: 'Avertissement', cssVar: 'var(--state-warning)' },
  { token: 'info', label: 'Info', cssVar: 'var(--state-info)' },
] as const;

export const PROCEDURE_HIGHLIGHT_COLOR_OPTIONS = [
  {
    token: 'brandSoft',
    label: 'Surlignage or',
    cssVar: 'var(--brand-gold-100)',
  },
  {
    token: 'dangerSoft',
    label: 'Surlignage danger',
    cssVar: 'var(--state-danger-bg)',
  },
  {
    token: 'successSoft',
    label: 'Surlignage succès',
    cssVar: 'var(--state-success-bg)',
  },
  {
    token: 'warningSoft',
    label: 'Surlignage avertissement',
    cssVar: 'var(--state-warning-bg)',
  },
  {
    token: 'infoSoft',
    label: 'Surlignage info',
    cssVar: 'var(--state-info-bg)',
  },
] as const;

export type ProcedureTextColorToken =
  (typeof PROCEDURE_TEXT_COLOR_OPTIONS)[number]['token'];
export type ProcedureHighlightColorToken =
  (typeof PROCEDURE_HIGHLIGHT_COLOR_OPTIONS)[number]['token'];

export const PROCEDURE_TEXT_COLOR_CSS: Record<string, string> = Object.fromEntries(
  PROCEDURE_TEXT_COLOR_OPTIONS.map((o) => [o.token, o.cssVar]),
);

export const PROCEDURE_HIGHLIGHT_COLOR_CSS: Record<string, string> =
  Object.fromEntries(
    PROCEDURE_HIGHLIGHT_COLOR_OPTIONS.map((o) => [o.token, o.cssVar]),
  );
