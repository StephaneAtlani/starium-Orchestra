import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  GovernanceCycleInstanceStatus,
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GovernanceCycleInstancesService } from './governance-cycle-instances.service';
import { GovernanceCyclePropagationService } from './governance-cycle-propagation.service';
import { GovernanceCycleReadinessService } from './governance-cycle-readiness.service';
import { GovernanceCyclesService } from './governance-cycles.service';

describe('GovernanceCycleInstancesService', () => {
  let service: GovernanceCycleInstancesService;
  let prisma: {
    governanceCycle: { findFirst: jest.Mock };
    governanceCycleInstance: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    governanceCycleInstanceAgendaItem: {
      deleteMany: jest.Mock;
      create: jest.Mock;
      createMany: jest.Mock;
      findFirst: jest.Mock;
    };
    governanceCycleInstanceDecision: { upsert: jest.Mock };
    governanceCycleItem: { findMany: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let cycles: { getItemById: jest.Mock };
  let readiness: { assertProjectsReadyForClose: jest.Mock };
  let propagation: { applyInTransaction: jest.Mock };

  const baseCycle = {
    id: 'cycle-1',
    clientId: 'client-a',
    status: GovernanceCycleStatus.DRAFT,
    governanceConfig: null,
  };

  const baseInstance = {
    id: 'inst-1',
    clientId: 'client-a',
    cycleId: 'cycle-1',
    periodLabel: 'T1 2026',
    periodStartDate: null,
    periodEndDate: null,
    label: null,
    scheduledDecisionAt: new Date('2026-04-15T14:00:00.000Z'),
    endsAt: null,
    mode: 'MEETING',
    status: GovernanceCycleInstanceStatus.PLANNED,
    locationLabel: null,
    meetingUrl: null,
    decisionSummary: null,
    openedAt: null,
    closedAt: null,
    closedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    agendaItems: [],
    decisions: [],
  };

  beforeEach(() => {
    prisma = {
      governanceCycle: { findFirst: jest.fn().mockResolvedValue(baseCycle) },
      governanceCycleInstance: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      governanceCycleInstanceAgendaItem: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      governanceCycleInstanceDecision: { upsert: jest.fn() },
      governanceCycleItem: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'item-1',
            sourceType: 'PROJECT',
            decisionStatus: 'CANDIDATE',
          },
        ]),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (tx: typeof prisma) => Promise<void>) => fn(prisma)),
    };
    cycles = { getItemById: jest.fn().mockResolvedValue({ id: 'item-1', title: 'P' }) };
    readiness = { assertProjectsReadyForClose: jest.fn().mockResolvedValue(undefined) };
    propagation = { applyInTransaction: jest.fn().mockResolvedValue(undefined) };

    service = new GovernanceCycleInstancesService(
      prisma as unknown as PrismaService,
      { create: jest.fn() } as unknown as AuditLogsService,
      cycles as unknown as GovernanceCyclesService,
      readiness as unknown as GovernanceCycleReadinessService,
      propagation as unknown as GovernanceCyclePropagationService,
    );
  });

  it('createInstance préremplit l’agenda avec les items du cycle', async () => {
    prisma.governanceCycleInstance.create.mockResolvedValue({
      ...baseInstance,
      id: 'inst-new',
      agendaItems: [],
    });
    prisma.governanceCycleInstance.findFirst.mockResolvedValue({
      ...baseInstance,
      id: 'inst-new',
      agendaItems: [{ itemId: 'item-1', sortOrder: 0 }],
    });

    const result = await service.createInstance('client-a', 'cycle-1', {
      periodLabel: 'T2',
      scheduledDecisionAt: '2026-07-01T10:00:00.000Z',
      mode: 'MEETING',
    });

    expect(prisma.governanceCycleInstanceAgendaItem.createMany).toHaveBeenCalled();
    expect(result.agendaCount).toBe(1);
  });

  it('open depuis DRAFT sans date → 400', async () => {
    prisma.governanceCycleInstance.findFirst.mockResolvedValue({
      ...baseInstance,
      status: GovernanceCycleInstanceStatus.DRAFT,
      scheduledDecisionAt: null,
      periodLabel: null,
      agendaItems: [{ itemId: 'item-1' }],
    });
    await expect(
      service.openInstance('client-a', 'cycle-1', 'inst-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('open depuis PLANNED avec agenda → OK', async () => {
    prisma.governanceCycleInstance.findFirst.mockResolvedValue({
      ...baseInstance,
      agendaItems: [{ itemId: 'item-1', sortOrder: 0 }],
    });
    prisma.governanceCycleInstance.update.mockResolvedValue({
      ...baseInstance,
      status: GovernanceCycleInstanceStatus.OPEN,
      agendaItems: [{ itemId: 'item-1' }],
      decisions: [],
    });
    const result = await service.openInstance('client-a', 'cycle-1', 'inst-1');
    expect(result.status).toBe('OPEN');
  });

  it('close double → 409', async () => {
    prisma.governanceCycleInstance.findFirst.mockResolvedValue({
      ...baseInstance,
      status: GovernanceCycleInstanceStatus.CLOSED,
      agendaItems: [],
      decisions: [],
    });
    prisma.$transaction.mockImplementation(async () => {
      throw new ConflictException('Instance is already closed');
    });
    await expect(
      service.closeInstance('client-a', 'cycle-1', 'inst-1', { actorUserId: 'u1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('createInstance DRAFT sans periodLabel', async () => {
    prisma.governanceCycleInstance.create.mockResolvedValue({
      ...baseInstance,
      status: GovernanceCycleInstanceStatus.DRAFT,
      periodLabel: null,
      scheduledDecisionAt: null,
    });
    prisma.governanceCycleInstance.findFirst.mockResolvedValue({
      ...baseInstance,
      status: GovernanceCycleInstanceStatus.DRAFT,
      periodLabel: null,
      scheduledDecisionAt: null,
      agendaItems: [{ itemId: 'item-1', sortOrder: 0 }],
    });
    const result = await service.createInstance('client-a', 'cycle-1', {});
    expect(result.status).toBe('DRAFT');
    expect(prisma.governanceCycleInstanceAgendaItem.createMany).toHaveBeenCalled();
  });
});
