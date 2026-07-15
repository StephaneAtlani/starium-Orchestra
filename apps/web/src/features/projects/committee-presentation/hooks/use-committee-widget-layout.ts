'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  COMMITTEE_WIDGETS_V1,
  type WidgetId,
} from '../widgets/committee-widget-registry';
import {
  getDefaultHiddenWidgetIds,
  loadHiddenWidgetIds,
  persistWidgetLayout,
} from '../lib/committee-widget-layout-storage';

const MAX_SLIDE_WIDGETS = 6;

export function useCommitteeWidgetLayout(projectId: string) {
  const widgets = COMMITTEE_WIDGETS_V1;
  const widgetOrder = useMemo(() => {
    const center = widgets
      .filter((w) => (w.presentationColumn ?? 'center') === 'center')
      .map((w) => w.id);
    const pilotage = widgets
      .filter((w) => w.presentationColumn === 'pilotage')
      .map((w) => w.id);
    return [...center, ...pilotage];
  }, [widgets]);

  const defaultHidden = useMemo(() => getDefaultHiddenWidgetIds(), []);
  const [hiddenWidgets, setHiddenWidgets] = useState<WidgetId[]>(defaultHidden);

  useEffect(() => {
    if (!projectId) {
      setHiddenWidgets(defaultHidden);
      return;
    }
    setHiddenWidgets(loadHiddenWidgetIds(projectId));
  }, [defaultHidden, projectId]);

  const saveLayout = () => {
    if (!projectId) return;
    persistWidgetLayout(projectId, hiddenWidgets);
  };

  const toggleWidget = (id: WidgetId) => {
    setHiddenWidgets((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const visibleWidgetIds = widgetOrder.filter((id) => !hiddenWidgets.includes(id));
  const slideWidgetIds = visibleWidgetIds.slice(0, MAX_SLIDE_WIDGETS);

  return {
    widgets,
    hiddenWidgets,
    setHiddenWidgets,
    toggleWidget,
    saveLayout,
    visibleWidgetIds,
    slideWidgetIds,
  };
}
