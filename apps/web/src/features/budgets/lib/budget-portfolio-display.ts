import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  CircleDollarSign,
  FolderKanban,
  Megaphone,
  Server,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { firstDisplayLabel } from '@/lib/display-label';
import type { BudgetListItemWithKpi } from '../types/budget-reporting.types';

export type BudgetExpenseMixLabel = 'CAPEX' | 'OPEX' | 'Mixte';

type IconPaletteEntry = {
  icon: LucideIcon;
  /** Token CSS couleur (jamais de hex en feature). */
  color: string;
};

const ICON_PALETTE: IconPaletteEntry[] = [
  { icon: Server, color: 'var(--state-info)' },
  { icon: CircleDollarSign, color: 'var(--brand-gold)' },
  { icon: Users, color: 'var(--state-info)' },
  { icon: Megaphone, color: 'var(--state-success)' },
  { icon: Building2, color: 'var(--neutral-900)' },
  { icon: TrendingUp, color: 'var(--state-warning)' },
  { icon: FolderKanban, color: 'var(--state-danger)' },
  { icon: Wallet, color: 'var(--brand-gold)' },
];

const KEYWORD_ICONS: { pattern: RegExp; entry: IconPaletteEntry }[] = [
  { pattern: /\b(dsi|it|cyber|data|tech|infra|si)\b/i, entry: ICON_PALETTE[0] },
  { pattern: /\b(daf|financ|compta)\b/i, entry: ICON_PALETTE[1] },
  { pattern: /\b(rh|humain|people|talent)\b/i, entry: ICON_PALETTE[2] },
  { pattern: /\b(market|comm|marque)\b/i, entry: ICON_PALETTE[3] },
  {
    pattern: /\b(fonctionnement|run|support|ops|exploit)\b/i,
    entry: ICON_PALETTE[4],
  },
  { pattern: /\b(invest|capex|build)\b/i, entry: ICON_PALETTE[5] },
  { pattern: /\b(projet|project|pmo)\b/i, entry: ICON_PALETTE[6] },
];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

function resolveIconEntry(row: BudgetListItemWithKpi): IconPaletteEntry {
  const haystack = [
    row.budget.name,
    row.budget.code,
    row.budget.description,
    row.budget.ownerOrgUnitSummary?.name,
    row.budget.ownerOrgUnitSummary?.code,
  ]
    .filter(Boolean)
    .join(' ');

  for (const rule of KEYWORD_ICONS) {
    if (rule.pattern.test(haystack)) return rule.entry;
  }

  if (row.budget.expenseMix === 'CAPEX') return ICON_PALETTE[5];
  if (row.budget.expenseMix === 'OPEX') return ICON_PALETTE[4];

  return ICON_PALETTE[hashSeed(row.budget.name || row.budget.code || 'budget') % ICON_PALETTE.length];
}

export function budgetPortfolioIcon(row: BudgetListItemWithKpi): LucideIcon {
  return resolveIconEntry(row).icon;
}

export function budgetPortfolioIconPresentation(row: BudgetListItemWithKpi): {
  className: string;
  style: CSSProperties;
} {
  const { color } = resolveIconEntry(row);
  return {
    className: 'flex size-9 shrink-0 items-center justify-center rounded-lg',
    style: {
      backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
      color,
    },
  };
}

/** Sous-titre métier sous le nom (direction > description > code). */
export function budgetPortfolioSubtitle(row: BudgetListItemWithKpi): string {
  return firstDisplayLabel(
    [
      row.budget.ownerOrgUnitSummary?.name,
      row.budget.description,
      row.budget.code,
    ],
    'Budget',
  );
}

export function budgetExpenseMixLabel(
  mix: BudgetListItemWithKpi['budget']['expenseMix'],
): BudgetExpenseMixLabel | null {
  if (mix === 'CAPEX') return 'CAPEX';
  if (mix === 'OPEX') return 'OPEX';
  if (mix === 'MIXTE') return 'Mixte';
  return null;
}

/**
 * Tone barre d’exécution mockup portefeuille :
 * &lt;75 % ok, 75–89 % warn, ≥90 % danger.
 */
export function budgetExecutionTone(rate: number | null | undefined) {
  if (rate == null || !Number.isFinite(rate)) return 'muted' as const;
  if (rate >= 0.9) return 'danger' as const;
  if (rate >= 0.75) return 'warn' as const;
  return 'ok' as const;
}
