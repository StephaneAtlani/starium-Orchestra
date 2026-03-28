import { NotFoundException } from '@nestjs/common';
import { ProjectTaskStatus } from '@prisma/client';
import { ActionPlansService } from './action-plans.service';
import { ProjectsService } from './projects.service';

describe('ActionPlansService', () => {
  let service: ActionPlansService;
  let prisma: {
    actionPlan: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    projectTask: { findMany: jest.Mock };
  };
  let projects: { assertClientUser: jest.Mock };

  beforeEach(() => {
    prisma = {
      actionPlan: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      projectTask: {
        findMany: jest.fn(),
      },
    };
    projects = {
      assertClientUser: jest.fn().mockResolvedValue(undefined),
    };
    service = new ActionPlansService(
      prisma as never,
      projects as unknown as ProjectsService,
    );
  });

  it('getForScope lève NotFound si plan absent', async () => {
    prisma.actionPlan.findFirst.mockResolvedValue(null);
    await expect(service.getForScope('c1', 'ap1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('recalculateProgress : DONE / actifs (hors CANCELLED), 0 si aucune tâche active', async () => {
    prisma.actionPlan.findFirst.mockResolvedValue({ id: 'ap1' });
    prisma.projectTask.findMany.mockResolvedValue([
      { status: ProjectTaskStatus.DONE },
      { status: ProjectTaskStatus.TODO },
      { status: ProjectTaskStatus.CANCELLED },
    ]);
    prisma.actionPlan.update.mockResolvedValue({});

    await service.recalculateProgress('c1', 'ap1');

    expect(prisma.actionPlan.update).toHaveBeenCalledWith({
      where: { id: 'ap1' },
      data: { progressPercent: 50 },
    });
  });

  it('recalculateProgress : 100% si toutes les tâches actives sont DONE', async () => {
    prisma.actionPlan.findFirst.mockResolvedValue({ id: 'ap1' });
    prisma.projectTask.findMany.mockResolvedValue([
      { status: ProjectTaskStatus.DONE },
      { status: ProjectTaskStatus.DONE },
    ]);
    prisma.actionPlan.update.mockResolvedValue({});

    await service.recalculateProgress('c1', 'ap1');

    expect(prisma.actionPlan.update).toHaveBeenCalledWith({
      where: { id: 'ap1' },
      data: { progressPercent: 100 },
    });
  });

  it('touchProgressForPlans déduplique les ids', async () => {
    prisma.actionPlan.findFirst.mockResolvedValue({ id: 'ap1' });
    prisma.projectTask.findMany.mockResolvedValue([{ status: ProjectTaskStatus.DONE }]);
    prisma.actionPlan.update.mockResolvedValue({});

    await service.touchProgressForPlans('c1', ['ap1', 'ap1', undefined, null]);

    expect(prisma.actionPlan.update).toHaveBeenCalledTimes(1);
  });
});
