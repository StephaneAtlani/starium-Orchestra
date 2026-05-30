import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GovernanceCyclesPage } from './governance-cycles-page';

vi.mock('@/components/layout/page-container', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: React.ReactNode }) =>
    React.createElement('h1', null, title),
}));

vi.mock('@/components/feedback/loading-state', () => ({
  LoadingState: () => React.createElement('div', null, 'loading'),
}));

vi.mock('@/components/feedback/empty-state', () => ({
  EmptyState: ({ title }: { title: string }) => React.createElement('div', null, title),
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

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/components/ui/input', () => ({
  Input: () => React.createElement('input', null),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) =>
    React.createElement('label', null, children),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  SelectTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  SelectItem: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) =>
    React.createElement('table', null, children),
  TableHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('thead', null, children),
  TableBody: ({ children }: { children: React.ReactNode }) =>
    React.createElement('tbody', null, children),
  TableRow: ({ children }: { children: React.ReactNode }) =>
    React.createElement('tr', null, children),
  TableHead: ({ children }: { children: React.ReactNode }) =>
    React.createElement('th', null, children),
  TableCell: ({ children }: { children: React.ReactNode }) =>
    React.createElement('td', null, children),
}));

vi.mock('@/components/PermissionGate', () => ({
  PermissionGate: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    has: () => true,
    isSuccess: true,
  }),
}));

vi.mock('../hooks/use-governance-cycles', () => ({
  useGovernanceCyclesListQuery: () => ({
    data: {
      items: [
        {
          id: 'cycle-hidden-id',
          name: 'CODIR T2 2026',
          code: 'CODIR-T2',
          cadence: 'QUARTERLY',
          status: 'DRAFT',
          startDate: null,
          endDate: null,
          summary: { itemsCount: 3, acceptedItemsCount: 1, deferredItemsCount: 0 },
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    },
    isLoading: false,
    isError: false,
  }),
  useGovernanceCycleSummariesForIdsQuery: () => [],
  useArchiveGovernanceCycleMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('./governance-cycle-form-dialog', () => ({
  GovernanceCycleFormDialog: () => null,
}));

vi.mock('./governance-cycle-status-badge', () => ({
  GovernanceCycleStatusBadge: () => React.createElement('span', null, 'Brouillon'),
}));

describe('GovernanceCyclesPage render', () => {
  it('affiche le nom metier et pas un UUID seul en colonne principale', () => {
    const html = renderToStaticMarkup(React.createElement(GovernanceCyclesPage));
    expect(html).toContain('CODIR T2 2026');
    expect(html).toContain('CODIR-T2');
    expect(html).not.toMatch(/>\s*cycle-hidden-id\s*</);
    expect(html).toContain('Synthèse de la page affichée');
  });
});
