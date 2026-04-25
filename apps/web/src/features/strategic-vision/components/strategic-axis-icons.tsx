'use client';

import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BriefcaseBusiness,
  Landmark,
  Layers,
  Rocket,
  Settings,
  Shield,
  Target,
  TrendingUp,
  Workflow,
} from 'lucide-react';

export const STRATEGIC_AXIS_ICONS = {
  target: Target,
  shield: Shield,
  rocket: Rocket,
  trendingUp: TrendingUp,
  settings: Settings,
  layers: Layers,
  briefcase: BriefcaseBusiness,
  barChart: BarChart3,
  governance: Landmark,
  workflow: Workflow,
} satisfies Record<string, LucideIcon>;

export type StrategicAxisIconKey = keyof typeof STRATEGIC_AXIS_ICONS;
export type StrategicAxisIconColor =
  | 'auto'
  | 'primary'
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'violet';

export const STRATEGIC_AXIS_ICON_OPTIONS: Array<{
  value: StrategicAxisIconKey;
  label: string;
}> = [
  { value: 'target', label: 'Cible' },
  { value: 'shield', label: 'Sécurité' },
  { value: 'rocket', label: 'Transformation' },
  { value: 'trendingUp', label: 'Croissance' },
  { value: 'settings', label: 'Opérations' },
  { value: 'layers', label: 'Architecture' },
  { value: 'briefcase', label: 'Business' },
  { value: 'barChart', label: 'Performance' },
  { value: 'governance', label: 'Gouvernance' },
  { value: 'workflow', label: 'Processus' },
];

export function isStrategicAxisIconKey(value: string): value is StrategicAxisIconKey {
  return value in STRATEGIC_AXIS_ICONS;
}

export const STRATEGIC_AXIS_COLOR_OPTIONS: Array<{
  value: StrategicAxisIconColor;
  label: string;
}> = [
  { value: 'auto', label: 'Auto' },
  { value: 'primary', label: 'Primary' },
  { value: 'blue', label: 'Bleu' },
  { value: 'green', label: 'Vert' },
  { value: 'amber', label: 'Ambre' },
  { value: 'red', label: 'Rouge' },
  { value: 'violet', label: 'Violet' },
];

export function isStrategicAxisIconColor(value: string): value is StrategicAxisIconColor {
  return STRATEGIC_AXIS_COLOR_OPTIONS.some((option) => option.value === value);
}

export function strategicAxisIconColorClass(color: StrategicAxisIconColor): string {
  switch (color) {
    case 'auto':
      return 'text-foreground';
    case 'primary':
      return 'text-primary';
    case 'blue':
      return 'text-blue-500';
    case 'green':
      return 'text-emerald-500';
    case 'amber':
      return 'text-amber-500';
    case 'red':
      return 'text-red-500';
    case 'violet':
      return 'text-violet-500';
    default:
      return 'text-foreground';
  }
}
