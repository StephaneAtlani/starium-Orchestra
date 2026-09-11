import { BadRequestException } from '@nestjs/common';
import { ProjectReviewStatus, ProjectReviewType } from '@prisma/client';
import { GovernanceCalendarService } from './governance-calendar.service';

describe('GovernanceCalendarService', () => {
  const prisma = {
    projectReview: { findMany: jest.fn() },
    governanceCycleInstance: { findMany: jest.fn() },
  };
  const accessDecision = {
    filterResourceIdsByAccess: jest.fn(),
  };

  const service = new GovernanceCalendarService(
    prisma as never,
    accessDecision as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refuse une fenêtre invalide', async () => {
    await expect(
      service.listCalendarEvents('client-a', 'user-1', {
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-09-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.projectReview.findMany).not.toHaveBeenCalled();
  });

  it('filtre client + projets autorisés et exclut CANCELLED', async () => {
    prisma.projectReview.findMany.mockResolvedValue([
      {
        id: 'rev-1',
        projectId: 'p1',
        reviewDate: new Date('2026-09-10T10:00:00.000Z'),
        reviewType: ProjectReviewType.COPRO,
        title: null,
        project: { id: 'p1', name: 'Alpha' },
      },
      {
        id: 'rev-2',
        projectId: 'p2',
        reviewDate: new Date('2026-09-12T10:00:00.000Z'),
        reviewType: ProjectReviewType.COPIL,
        title: 'COPIL stratégique',
        project: { id: 'p2', name: 'Beta' },
      },
    ]);
    prisma.governanceCycleInstance.findMany.mockResolvedValue([
      {
        id: 'inst-1',
        cycleId: 'cycle-1',
        label: null,
        periodLabel: 'T3',
        scheduledDecisionAt: new Date('2026-09-15T14:00:00.000Z'),
        cycle: { id: 'cycle-1', name: 'CODIR', clientId: 'client-a' },
      },
    ]);
    accessDecision.filterResourceIdsByAccess.mockResolvedValue(['p1']);

    const result = await service.listCalendarEvents('client-a', 'user-1', {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.999Z',
    });

    expect(prisma.projectReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'client-a',
          status: { not: ProjectReviewStatus.CANCELLED },
        }),
      }),
    );
    expect(prisma.governanceCycleInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'client-a',
          cycle: { clientId: 'client-a' },
        }),
      }),
    );
    expect(accessDecision.filterResourceIdsByAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-a',
        userId: 'user-1',
        resourceType: 'PROJECT',
        resourceIds: expect.arrayContaining(['p1', 'p2']),
        intent: 'list',
      }),
    );

    expect(result.items).toHaveLength(2);
    expect(result.items.map((i) => i.id)).toEqual(['rev-1', 'inst-1']);
    expect(result.items[0]).toMatchObject({
      kind: 'PROJECT_REVIEW',
      title: 'Point COPRO — Alpha',
      reviewTypeLabel: 'Point COPRO',
      projectName: 'Alpha',
      href: '/projects/p1/reviews/rev-1',
    });
    expect(result.items[1]).toMatchObject({
      kind: 'CYCLE_INSTANCE',
      title: 'CODIR — T3',
      cycleName: 'CODIR',
      href: '/cycles/cycle-1',
    });
    expect(result.items.every((i) => !i.title.match(/^c[a-z0-9]{20,}$/i))).toBe(
      true,
    );
  });
});
