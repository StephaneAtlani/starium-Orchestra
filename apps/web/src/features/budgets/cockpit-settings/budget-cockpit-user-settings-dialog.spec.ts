import { describe, expect, it } from 'vitest';

import { computeUserOverridesPayload } from './budget-cockpit-user-settings-dialog';
import type { BudgetCockpitWidgetPayload } from '@/features/budgets/types/budget-dashboard.types';

function kpiWidget(
  id: string,
  opts: { isActive: boolean; position: number },
): BudgetCockpitWidgetPayload {
  return {
    id,
    type: 'KPI',
    position: opts.position,
    title: 'Indicateurs clés',
    size: 'full',
    isActive: opts.isActive,
    settings: null,
    data: null,
  };
}

describe('computeUserOverridesPayload', () => {
  it('renvoie [] si aucun changement isActive/position', () => {
    const initial = [kpiWidget('w1', { isActive: true, position: 0 })];
    const draft = [kpiWidget('w1', { isActive: true, position: 0 })];

    expect(computeUserOverridesPayload({ initialWidgets: initial, draftWidgets: draft })).toEqual(
      [],
    );
  });

  it('renvoie seulement les widgets dont isActive/position a changé', () => {
    const initial = [
      kpiWidget('w1', { isActive: true, position: 0 }),
      kpiWidget('w2', { isActive: true, position: 1 }),
    ];
    const draft = [
      kpiWidget('w1', { isActive: false, position: 0 }),
      kpiWidget('w2', { isActive: true, position: 1 }),
    ];

    expect(
      computeUserOverridesPayload({ initialWidgets: initial, draftWidgets: draft }),
    ).toEqual([
      { widgetId: 'w1', isActive: false, position: 0 },
    ]);
  });

  it('gère le changement de position', () => {
    const initial = [
      kpiWidget('w1', { isActive: true, position: 0 }),
      kpiWidget('w2', { isActive: true, position: 1 }),
    ];
    const draft = [
      kpiWidget('w1', { isActive: true, position: 1 }),
      kpiWidget('w2', { isActive: true, position: 0 }),
    ];

    expect(
      computeUserOverridesPayload({ initialWidgets: initial, draftWidgets: draft }),
    ).toEqual([
      { widgetId: 'w1', isActive: true, position: 1 },
      { widgetId: 'w2', isActive: true, position: 0 },
    ]);
  });
});

