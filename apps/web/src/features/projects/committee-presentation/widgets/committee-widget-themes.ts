export type WidgetTheme = 'execution' | 'governance' | 'ownership';

export const WIDGET_THEME_ORDER: WidgetTheme[] = [
  'execution',
  'governance',
  'ownership',
];

export const WIDGET_THEME_LABEL: Record<WidgetTheme, string> = {
  execution: 'Execution',
  governance: 'Gouvernance',
  ownership: 'Ownership',
};
