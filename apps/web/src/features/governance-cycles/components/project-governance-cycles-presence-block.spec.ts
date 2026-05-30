import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectGovernanceCyclesPresenceBlock } from './project-governance-cycles-presence-block';

const useGovernanceCyclesByProjectQuery = vi.fn();
const useGovernanceCyclesReadContext = vi.fn();

vi.mock('../api/governance-cycles.queries', () => ({
  useGovernanceCyclesByProjectQuery: (...args: unknown[]) =>
    useGovernanceCyclesByProjectQuery(...args),
  useGovernanceCyclesReadContext: () => useGovernanceCyclesReadContext(),
}));

vi.mock('@/components/feedback/loading-state', () => ({
  LoadingState: () => React.createElement('div', null, 'loading'),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'card' }, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  CardTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('h2', null, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => React.createElement('a', { href }, children),
}));

vi.mock('./governance-cycle-decision-badge', () => ({
  GovernanceCycleDecisionBadge: ({ status }: { status: string }) =>
    React.createElement('span', { 'data-decision': status }, status),
}));

describe('ProjectGovernanceCyclesPresenceBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGovernanceCyclesReadContext.mockReturnValue({
      canRead: true,
      permsSuccess: true,
      readEnabled: true,
    });
    useGovernanceCyclesByProjectQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        items: [
          {
            cycleId: 'cycle-1',
            cycleName: 'Cycle CODIR juin 2026',
            cadence: 'MONTHLY',
            periodLabel: '01 juin 2026 → 30 juin 2026',
            decisionStatus: 'ACCEPTED',
            priorityScore: 4.2,
          },
        ],
      },
    });
  });

  it('ne rend rien sans governance_cycles.read', () => {
    useGovernanceCyclesReadContext.mockReturnValue({
      canRead: false,
      permsSuccess: true,
      readEnabled: false,
    });
    useGovernanceCyclesByProjectQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      data: undefined,
    });

    const html = renderToStaticMarkup(
      React.createElement(ProjectGovernanceCyclesPresenceBlock, {
        projectId: 'proj-1',
      }),
    );

    expect(html).toBe('');
    expect(useGovernanceCyclesByProjectQuery).toHaveBeenCalledWith('proj-1', {
      enabled: false,
    });
  });

  it('affiche le nom du cycle et le libellé Retenu sans UUID visible', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProjectGovernanceCyclesPresenceBlock, {
        projectId: 'proj-1',
      }),
    );

    expect(html).toContain('Présence dans les cycles de pilotage');
    expect(html).toContain('Cycle CODIR juin 2026');
    expect(html).toContain('01 juin 2026 → 30 juin 2026');
    expect(html).toContain('data-decision="ACCEPTED"');
    expect(html).not.toContain('>cycle-1<');
    expect(html).not.toContain('proj-1');
    expect(html).toContain('href="/cycles/cycle-1"');
  });

  it('active la query uniquement avec readEnabled', () => {
    renderToStaticMarkup(
      React.createElement(ProjectGovernanceCyclesPresenceBlock, {
        projectId: 'proj-1',
      }),
    );

    expect(useGovernanceCyclesByProjectQuery).toHaveBeenCalledWith('proj-1', {
      enabled: true,
    });
  });
});
