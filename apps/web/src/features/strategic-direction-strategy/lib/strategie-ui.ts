/** Helpers UI schéma directeur / consolidé (classes `.stg-*`). */

export const STG_TONE_STYLE: Record<string, { c: string; bg: string }> = {
  info: { c: 'var(--state-info)', bg: 'var(--state-info-bg)' },
  gold: { c: 'var(--brand-gold-700)', bg: 'var(--brand-gold-050)' },
  purple: { c: 'var(--purple)', bg: 'var(--purple-bg)' },
  teal: { c: 'var(--teal)', bg: 'var(--teal-bg)' },
  success: { c: 'var(--state-success)', bg: 'var(--state-success-bg)' },
  danger: { c: 'var(--state-danger)', bg: 'var(--state-danger-bg)' },
};

export function stgTone(t: string | null | undefined) {
  return STG_TONE_STYLE[t ?? 'info'] ?? STG_TONE_STYLE.info;
}

export function formatEurCents(cents: number | null | undefined): string {
  if (cents == null || cents === 0) return '—';
  const n = cents / 100;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} M€`;
  if (n >= 1000) return `${Math.round(n / 1000)} k€`;
  return `${Math.round(n)} €`;
}

export function formatReviewDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const months = [
    'janv',
    'févr',
    'mars',
    'avr',
    'mai',
    'juin',
    'juil',
    'août',
    'sept',
    'oct',
    'nov',
    'déc',
  ];
  return `${d.getDate()} ${months[d.getMonth()]}. ${d.getFullYear()}`;
}

export function stgHeat(v: number | null | undefined): {
  bg: string;
  c: string;
  empty: boolean;
  t: string;
} {
  if (v == null || v === 0) return { bg: '', c: '', empty: true, t: '—' };
  if (v >= 75)
    return { bg: 'var(--state-success-bg)', c: 'var(--state-success)', empty: false, t: `${v}%` };
  if (v >= 50)
    return {
      bg: 'var(--brand-gold-050)',
      c: 'var(--brand-gold-700)',
      empty: false,
      t: `${v}%`,
    };
  if (v >= 25)
    return {
      bg: 'var(--state-warning-bg)',
      c: 'var(--state-warning)',
      empty: false,
      t: `${v}%`,
    };
  return { bg: 'var(--state-danger-bg)', c: 'var(--state-danger)', empty: false, t: `${v}%` };
}

export function stgQuarterLabel(monthOffset: number, startYear: number): string {
  const y = startYear + Math.floor(monthOffset / 12);
  const q = Math.floor((monthOffset % 12) / 3) + 1;
  return `T${q} ${y}`;
}

export function stgBarPct(monthOffset: number, totalMonths: number): number {
  if (totalMonths <= 0) return 0;
  return (monthOffset / totalMonths) * 100;
}

export const MATURITY_DIMS = [
  'Ambition',
  'Objectifs',
  'Chantiers',
  'Budget',
  'Risques',
  'Revue',
] as const;

export type MaturityDim = (typeof MATURITY_DIMS)[number];

export function progressFillColor(pct: number): string {
  if (pct >= 70) return 'var(--state-success)';
  if (pct >= 40) return 'var(--brand-gold)';
  return 'var(--state-danger)';
}

export function contribFillColor(pct: number): string {
  if (pct >= 70) return 'var(--state-success)';
  if (pct >= 45) return 'var(--brand-gold)';
  return 'var(--state-danger)';
}

export function overlapSeverityLabel(sev: 'high' | 'mid' | 'low'): string {
  if (sev === 'high') return 'Recouvrement fort';
  if (sev === 'mid') return 'Recouvrement notable';
  return 'Recouvrement limité';
}
