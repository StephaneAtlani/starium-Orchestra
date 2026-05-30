import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GovernanceCycleArbitrationTable } from './governance-cycle-arbitration-table';

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

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: React.ReactNode }) =>
    React.createElement('button', null, children),
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

vi.mock('@/components/PermissionGate', () => ({
  PermissionGate: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    has: () => true,
  }),
}));

vi.mock('../hooks/use-governance-cycles', () => ({
  useGovernanceCycleItemsQuery: () => ({
    data: {
      items: [
        {
          id: 'item-hidden-id',
          cycleId: 'cycle-1',
          sourceType: 'PROJECT',
          title: 'Projet Alpha',
          description: null,
          decisionStatus: 'CANDIDATE',
          decisionReason: null,
          valueScore: 5,
          riskScore: 2,
          budgetScore: 4,
          capacityScore: 4,
          alignmentScore: 5,
          priorityScore: 42,
          estimatedBudgetAmount: null,
          estimatedCapacityDays: null,
          projectId: 'proj-hidden',
          budgetId: null,
          budgetLineId: null,
          strategicObjectiveId: null,
          riskId: null,
          sourceRef: { id: 'proj-hidden', label: 'PRJ-1 — Projet Alpha' },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      total: 1,
      limit: 100,
      offset: 0,
    },
    isLoading: false,
    isError: false,
  }),
  usePatchGovernanceCycleItemArbitrationMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteGovernanceCycleItemMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('./governance-cycle-decision-badge', () => ({
  GovernanceCycleDecisionBadge: () => React.createElement('span', null, 'Candidat'),
}));

vi.mock('./governance-cycle-item-scores-dialog', () => ({
  GovernanceCycleItemScoresDialog: () => null,
}));

describe('GovernanceCycleArbitrationTable render', () => {
  it('affiche sourceRef.label et priorityScore API sans recalcul visible', () => {
    const html = renderToStaticMarkup(
      React.createElement(GovernanceCycleArbitrationTable, { cycleId: 'cycle-1' }),
    );
    expect(html).toContain('PRJ-1 — Projet Alpha');
    expect(html).toContain('42');
    expect(html).not.toMatch(/>\s*proj-hidden\s*</);
    expect(html).not.toMatch(/>\s*item-hidden-id\s*</);
  });
});
