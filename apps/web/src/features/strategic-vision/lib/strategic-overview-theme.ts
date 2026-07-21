import type { StrategicAxisIconColor } from '../components/strategic-axis-icons';

/** Palette et thèmes — vue d’ensemble vision stratégique (mockup cockpit) */

export const STRATEGIC_OVERVIEW_GOLD_ICON =
  'bg-[color:var(--brand-gold-100)] text-[color:var(--brand-gold)]';

/** Pastilles icônes — grille KPI vue d’ensemble stratégique */
export const STRATEGIC_KPI_ICON = {
  alignment:
    'bg-[color:var(--state-success-bg)] text-[color:var(--state-success)]',
  objectivesAtRisk:
    'bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning)]',
  unaligned: 'bg-[color:var(--state-info-bg)] text-[color:var(--state-info)]',
  drift: 'bg-[color:var(--purple-bg)] text-[color:var(--purple)]',
} as const;

export const STRATEGIC_OVERVIEW_ICON_SIZE = 'size-5 [stroke-width:1.75]';

export const STRATEGIC_OVERVIEW_DONUT_STROKE = 'var(--teal)';
export const STRATEGIC_OVERVIEW_DONUT_TRACK = 'var(--neutral-200)';

const AXIS_THEME_CYCLE = ['green', 'blue', 'amber', 'violet'] as const;

export type AxisThemeKey = (typeof AXIS_THEME_CYCLE)[number];

export type AxisThemeStyles = {
  iconShell: string;
  barClass: string;
  pctText: string;
};

const AXIS_THEMES: Record<AxisThemeKey, AxisThemeStyles> = {
  green: {
    iconShell:
      'flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--state-success-bg)] text-[color:var(--state-success)]',
    barClass: 'bg-[color:var(--state-success)]',
    pctText: 'text-[color:var(--state-success)]',
  },
  blue: {
    iconShell:
      'flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--state-info-bg)] text-[color:var(--state-info)]',
    barClass: 'bg-[color:var(--state-info)]',
    pctText: 'text-[color:var(--state-info)]',
  },
  amber: {
    iconShell:
      'flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--state-warning-bg)] text-[color:var(--state-warning)]',
    barClass: 'bg-[color:var(--state-warning)]',
    pctText: 'text-[color:var(--state-warning)]',
  },
  violet: {
    iconShell:
      'flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--purple-bg)] text-[color:var(--purple)]',
    barClass: 'bg-[color:var(--purple)]',
    pctText: 'text-[color:var(--purple)]',
  },
};

function colorToTheme(color: StrategicAxisIconColor, index: number): AxisThemeKey {
  switch (color) {
    case 'green':
      return 'green';
    case 'blue':
      return 'blue';
    case 'amber':
    case 'red':
      return 'amber';
    case 'violet':
      return 'violet';
    case 'primary':
      return 'amber';
    default:
      return AXIS_THEME_CYCLE[index % AXIS_THEME_CYCLE.length];
  }
}

export function getAxisTheme(
  color: StrategicAxisIconColor,
  index: number,
): AxisThemeStyles {
  return AXIS_THEMES[colorToTheme(color, index)];
}
