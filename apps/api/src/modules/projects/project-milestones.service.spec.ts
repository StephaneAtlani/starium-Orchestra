import { NotFoundException } from '@nestjs/common';
import { ProjectMilestoneStatus } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectMilestonesService } from './project-milestones.service';
import { ProjectsService } from './projects.service';

describe('ProjectMilestonesService — labels (milestoneLabelIds)', () => {
  let service: ProjectMilestonesService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };
  let projects: {
    getProjectForScope: jest.Mock;
    assertClientUser: jest.Mock;
  };

  const clientId = 'c1';
  const projectId = 'p1';
  const milestoneId = 'm1';

  function baseMilestone(overrides: Record<string, unknown> = {}) {
    return {
      id: milestoneId,
      clientId,
      projectId,
      name: 'Jalon',
      code: null,
      description: null,
      ownerUserId: null,
      targetDate: null,
      achievedDate: null,
      status: ProjectMilestoneStatus.PLANNED,
      linkedTaskId: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      projectMilestone: {
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
        update: jest.fn(),
      },
      projectMilestoneLabel: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    projects = {
      getProjectForScope: jest.fn().mockResolvedValue({ id: projectId }),
      assertClientUser: jest.fn().mockResolvedValue(undefined),
    };

    service = new ProjectMilestonesService(
      prisma,
      auditLogs as unknown as AuditLogsService,
      projects as unknown as ProjectsService,
    );
  });

  it('update : remplace labels (milestoneLabelIds) via purge + create assignations', async () => {
    const existing = baseMilestone();
    const updated = { ...existing };

    prisma.projectMilestone.findFirst.mockResolvedValue(existing);
    prisma.projectMilestone.update.mockResolvedValue(updated);
    prisma.projectMilestone.findFirstOrThrow.mockResolvedValue({
      ...updated,
      labelAssignments: [{ labelId: 'l1' }, { labelId: 'l2' }],
    });

    prisma.projectMilestoneLabel.findMany.mockResolvedValue([
      { id: 'l1' },
      { id: 'l2' },
    ]);

    const txMock = {
      projectMilestoneLabelAssignment: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        create: jest.fn().mockResolvedValue(undefined),
      },
    };

    prisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

    await service.update(
      clientId,
      projectId,
      milestoneId,
      { milestoneLabelIds: ['l1', 'l2', 'l1'] } as any,
      { actorUserId: 'u1', meta: {} },
      'u1',
    );

    expect(prisma.projectMilestoneLabel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId, projectId, id: { in: ['l1', 'l2'] } },
      }),
    );

    expect(txMock.projectMilestoneLabelAssignment.deleteMany).toHaveBeenCalledWith(
      { where: { clientId, projectId, projectMilestoneId: milestoneId } },
    );
    expect(txMock.projectMilestoneLabelAssignment.create).toHaveBeenCalledTimes(2);

    expect(txMock.projectMilestoneLabelAssignment.create).toHaveBeenNthCalledWith(
      1,
      {
        data: {
          clientId,
          projectId,
          projectMilestoneId: milestoneId,
          labelId: 'l1',
        },
      },
    );
    expect(txMock.projectMilestoneLabelAssignment.create).toHaveBeenNthCalledWith(
      2,
      {
        data: {
          clientId,
          projectId,
          projectMilestoneId: milestoneId,
          labelId: 'l2',
        },
      },
    );
  });

  it('update : milestone absent => NotFoundException', async () => {
    prisma.projectMilestone.findFirst.mockResolvedValue(null);

    await expect(
      service.update(
        clientId,
        projectId,
        milestoneId,
        { name: 'x' } as any,
        { actorUserId: 'u1', meta: {} },
        'u1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

