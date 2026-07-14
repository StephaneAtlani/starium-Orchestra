import { describe, expect, it } from 'vitest';
import {
  buildEnrichedInstances,
  computeInstanceCompletionRate,
  findNextInstance,
  formatGovernanceRelativeDaysFr,
  getCycleShortLabel,
  partitionInstancesByHorizon,
  sumPendingDecisions,
} from './governance-cycles-cockpit-data';
import type { GovernanceCycleResponseDto } from '../types/governance-cycle.types';
import type { GovernanceCycleInstanceResponseDto } from '../types/governance-cycle-instance.types';

function cycle(partial: Partial<GovernanceCycleResponseDto> & { id: string; name: string }): GovernanceCycleResponseDto {
  return {
    code: null,
    cadence: 'MONTHLY',
    status: 'IN_EXECUTION',
    startDate: null,
    endDate: null,
    description: null,
    sponsorLabel: null,
    objectiveSummary: null,
    decisionSummary: null,
    validatedAt: null,
    closedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    summary: { itemsCount: 0, acceptedItemsCount: 0, deferredItemsCount: 0 },
    ...partial,
  };
}

function instance(
  partial: Partial<GovernanceCycleInstanceResponseDto> & { id: string; cycleId: string },
): GovernanceCycleInstanceResponseDto {
  return {
    periodLabel: null,
    periodStartDate: null,
    periodEndDate: null,
    label: null,
    scheduledDecisionAt: null,
    endsAt: null,
    mode: 'MEETING',
    status: 'PLANNED',
    locationLabel: null,
    meetingUrl: null,
    decisionSummary: null,
    openedAt: null,
    closedAt: null,
    closedByUserId: null,
    agendaCount: 0,
    decidedCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('governance-cycles-cockpit-data', () => {
  it('getCycleShortLabel préfère le code métier', () => {
    expect(getCycleShortLabel(cycle({ id: '1', name: 'Comité de pilotage', code: 'copil' }))).toBe(
      'COPIL',
    );
  });

  it('partitionInstancesByHorizon sépare à venir et passé', () => {
    const cycles = [cycle({ id: 'c1', name: 'CODIR' })];
    const map = new Map([
      [
        'c1',
        [
          instance({
            id: 'i1',
            cycleId: 'c1',
            status: 'PLANNED',
            scheduledDecisionAt: '2026-12-01T10:00:00.000Z',
          }),
          instance({
            id: 'i2',
            cycleId: 'c1',
            status: 'CLOSED',
            scheduledDecisionAt: '2026-01-01T10:00:00.000Z',
          }),
        ],
      ],
    ]);
    const rows = buildEnrichedInstances(cycles, map);
    const { upcoming, past } = partitionInstancesByHorizon(rows);
    expect(upcoming).toHaveLength(1);
    expect(past).toHaveLength(1);
    expect(findNextInstance(rows)?.instance.id).toBe('i1');
  });

  it('sumPendingDecisions agrège les arbitrages', () => {
    expect(
      sumPendingDecisions([
        { toArbitrateCount: 3 } as never,
        { toArbitrateCount: 4 } as never,
        undefined,
      ]),
    ).toEqual({ total: 7, arbitrationsRequired: 2 });
  });

  it('computeInstanceCompletionRate calcule un pourcentage', () => {
    const rows = buildEnrichedInstances(
      [cycle({ id: 'c1', name: 'CODIR' })],
      new Map([
        [
          'c1',
          [
            instance({
              id: 'i1',
              cycleId: 'c1',
              status: 'CLOSED',
              agendaCount: 4,
              decidedCount: 4,
              closedAt: '2026-05-01T00:00:00.000Z',
            }),
            instance({
              id: 'i2',
              cycleId: 'c1',
              status: 'CLOSED',
              agendaCount: 2,
              decidedCount: 1,
              closedAt: '2026-04-01T00:00:00.000Z',
            }),
          ],
        ],
      ]),
    );
    expect(computeInstanceCompletionRate(rows)).toBe(75);
  });

  it('formatGovernanceRelativeDaysFr formate les écarts', () => {
    const from = new Date('2026-05-13T12:00:00.000Z');
    const target = new Date('2026-05-23T12:00:00.000Z');
    expect(formatGovernanceRelativeDaysFr(target, from)).toBe('dans 10 j');
  });
});
