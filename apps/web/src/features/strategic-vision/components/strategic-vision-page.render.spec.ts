import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StrategicVisionPage } from './strategic-vision-page';

vi.mock('@/components/layout/page-container', () => ({
  PageContainer: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  AlertDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('span', null, children),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: React.ReactNode }) =>
    React.createElement('button', null, children),
}));

vi.mock('./strategic-vision-tabs', () => ({
  StrategicVisionTabs: () =>
    React.createElement(
      'div',
      { 'data-testid': 'strategic-tabs-container', 'aria-label': 'Onglets strategic vision' },
      'Vue d’ensemble Vision entreprise Axes stratégiques Objectifs Alignement Alertes Historique',
    ),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    has: () => true,
  }),
}));

vi.mock('../hooks/use-strategic-vision-queries', () => ({
  useStrategicVisionQuery: () => ({
    data: [
      {
        id: 'v1',
        title: 'Vision stratégique 2026',
        statement: 'Désignation stratégique 2026',
        status: 'ACTIVE',
        isActive: true,
        axes: [],
      },
    ],
    isLoading: false,
    isError: false,
  }),
  useStrategicAxesFallbackQuery: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
  useStrategicObjectivesQuery: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
  useStrategicDirectionsQuery: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
  useStrategicKpisQuery: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
  useStrategicKpisByDirectionQuery: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
  useStrategicAlertsQuery: () => ({
    data: { items: [], total: 0 },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

describe('StrategicVisionPage render', () => {
  it('rend le titre, le sous-titre et tous les onglets principaux', () => {
    const html = renderToStaticMarkup(React.createElement(StrategicVisionPage));

    expect(html).toContain('Vision stratégique 2026');
    expect(html).toContain('Désignation stratégique 2026');
    expect(html).toContain('Vue d’ensemble');
    expect(html).toContain('Vision entreprise');
    expect(html).toContain('Axes stratégiques');
    expect(html).toContain('Objectifs');
    expect(html).toContain('Alignement');
    expect(html).toContain('Alertes');
    expect(html).toContain('Historique');
  });

  it('respecte l’ordre structurel header → tabs', () => {
    const html = renderToStaticMarkup(React.createElement(StrategicVisionPage));
    const titleIndex = html.indexOf('Vision stratégique 2026');
    const tabsIndex = html.indexOf('Onglets strategic vision');
    const historyTabIndex = html.indexOf('Historique');

    expect(titleIndex).toBeGreaterThan(-1);
    expect(tabsIndex).toBeGreaterThan(titleIndex);
    expect(historyTabIndex).toBeGreaterThan(tabsIndex);
  });

  it('n’enferme pas les tabs dans un conteneur overflow-hidden', () => {
    const html = renderToStaticMarkup(React.createElement(StrategicVisionPage));
    expect(html).toContain('data-testid="strategic-tabs-container"');
    expect(html).not.toContain('data-testid="strategic-tabs-container" class="overflow-hidden');
  });
});
