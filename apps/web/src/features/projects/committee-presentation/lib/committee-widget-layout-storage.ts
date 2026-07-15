import {
  COMMITTEE_WIDGETS_V1,
  type WidgetId,
} from '../widgets/committee-widget-registry';

export const CODIR_WIDGET_LAYOUT_VERSION = 3;
export const CODIR_WIDGET_ALL_PROJECTS_KEY = 'committee-codir-widgets:__all__';

function widgetOrder(): WidgetId[] {
  const widgets = COMMITTEE_WIDGETS_V1;
  const center = widgets
    .filter((w) => (w.presentationColumn ?? 'center') === 'center')
    .map((w) => w.id);
  const pilotage = widgets
    .filter((w) => w.presentationColumn === 'pilotage')
    .map((w) => w.id);
  return [...center, ...pilotage];
}

export function getDefaultHiddenWidgetIds(): WidgetId[] {
  return COMMITTEE_WIDGETS_V1.filter((w) => !w.enabledByDefault).map((w) => w.id);
}

function normalizeHidden(
  raw: Partial<{ hidden?: WidgetId[]; order?: WidgetId[]; centerOrder?: WidgetId[]; pilotageOrder?: WidgetId[] }> | null,
): WidgetId[] {
  const order = widgetOrder();
  const defaultHidden = getDefaultHiddenWidgetIds();
  if (!raw) return defaultHidden;

  const parsedHidden = (raw.hidden ?? []).filter((id) => order.includes(id));
  const known = new Set<WidgetId>([
    ...(raw.hidden ?? []),
    ...(raw.order ?? []),
    ...(raw.centerOrder ?? []),
    ...(raw.pilotageOrder ?? []),
  ]);
  const hidden = new Set<WidgetId>(parsedHidden);
  defaultHidden.forEach((id) => {
    if (!known.has(id)) hidden.add(id);
  });
  return [...hidden];
}

export function loadHiddenWidgetIds(projectId: string): WidgetId[] {
  if (typeof window === 'undefined') return getDefaultHiddenWidgetIds();
  try {
    const raw = localStorage.getItem(`committee-codir-widgets:${projectId}`);
    if (!raw) return getDefaultHiddenWidgetIds();
    return normalizeHidden(JSON.parse(raw) as Parameters<typeof normalizeHidden>[0]);
  } catch {
    return getDefaultHiddenWidgetIds();
  }
}

export function loadPortfolioWidgetLayout(): WidgetId[] {
  if (typeof window === 'undefined') return getDefaultHiddenWidgetIds();
  try {
    const raw = localStorage.getItem(CODIR_WIDGET_ALL_PROJECTS_KEY);
    if (!raw) return getDefaultHiddenWidgetIds();
    return normalizeHidden(JSON.parse(raw) as Parameters<typeof normalizeHidden>[0]);
  } catch {
    return getDefaultHiddenWidgetIds();
  }
}

export function persistWidgetLayout(projectId: string, hidden: WidgetId[]) {
  const payload = JSON.stringify({
    hidden,
    version: CODIR_WIDGET_LAYOUT_VERSION,
  });
  localStorage.setItem(`committee-codir-widgets:${projectId}`, payload);
}

export function persistWidgetLayoutForAllProjects(projectIds: string[], hidden: WidgetId[]) {
  const payload = JSON.stringify({
    hidden,
    version: CODIR_WIDGET_LAYOUT_VERSION,
  });
  localStorage.setItem(CODIR_WIDGET_ALL_PROJECTS_KEY, payload);
  for (const projectId of projectIds) {
    localStorage.setItem(`committee-codir-widgets:${projectId}`, payload);
  }
}
