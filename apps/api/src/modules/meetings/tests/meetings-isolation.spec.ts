import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MeetingsService } from '../meetings.service';

/**
 * RFC-MEET-001 §4.11 — isolation multi-client.
 *
 * Ces tests vérifient le contrat de requêtage du service : **toute** lecture et
 * **toute** écriture porte le `clientId` du contexte authentifié, et un projet
 * n'entre au périmètre d'une réunion qu'après décision d'accès favorable.
 */
describe('MeetingsService — isolation multi-client', () => {
  const CLIENT = 'client-actif';
  const OTHER = 'client-etranger';
  const USER = 'user-1';

  let prisma: any;
  let auditLogs: any;
  let accessDecision: any;
  let templates: any;
  let service: MeetingsService;

  beforeEach(() => {
    prisma = {
      meeting: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
        create: jest.fn(),
      },
      meetingProject: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        createMany: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      meetingAttendee: { findMany: jest.fn().mockResolvedValue([]) },
      meetingSectionInstance: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      project: { findMany: jest.fn().mockResolvedValue([]) },
      governanceCycleInstance: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    accessDecision = { decide: jest.fn().mockResolvedValue({ allowed: true }) };
    templates = { getOrThrow: jest.fn() };

    service = new MeetingsService(prisma, auditLogs, accessDecision, templates);
  });

  it('filtre la liste sur le client actif', async () => {
    await service.list(CLIENT, {});
    const where = prisma.meeting.findMany.mock.calls[0][0].where;
    expect(where.clientId).toBe(CLIENT);
  });

  it('filtre le comptage de la liste sur le même client', async () => {
    await service.list(CLIENT, {});
    expect(prisma.meeting.count.mock.calls[0][0].where.clientId).toBe(CLIENT);
  });

  it('scope le filtre par projet au client actif', async () => {
    await service.list(CLIENT, { projectId: 'p1' });
    const where = prisma.meeting.findMany.mock.calls[0][0].where;
    expect(where.projects.some.clientId).toBe(CLIENT);
    expect(where.projects.some.projectId).toBe('p1');
  });

  it('ne trouve pas une réunion d’un autre client', async () => {
    prisma.meeting.findFirst.mockResolvedValue(null);
    await expect(service.getOrThrow(OTHER, 'meeting-du-client-actif')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.meeting.findFirst.mock.calls[0][0].where.clientId).toBe(OTHER);
  });

  it('refuse d’inscrire un projet absent du client actif', async () => {
    prisma.meeting.findFirst.mockResolvedValue({
      id: 'm1',
      clientId: CLIENT,
      status: 'PREPARING',
      sectionsLockedAt: null,
    });
    prisma.project.findMany.mockResolvedValue([]); // projet hors client

    await expect(
      service.addProjects(CLIENT, USER, 'm1', { projectIds: ['projet-etranger'] }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.project.findMany.mock.calls[0][0].where.clientId).toBe(CLIENT);
    expect(prisma.meetingProject.createMany).not.toHaveBeenCalled();
  });

  it('refuse d’inscrire un projet auquel la personne n’a pas accès', async () => {
    prisma.meeting.findFirst.mockResolvedValue({
      id: 'm1',
      clientId: CLIENT,
      status: 'PREPARING',
      sectionsLockedAt: null,
    });
    prisma.project.findMany.mockResolvedValue([{ id: 'p1' }]);
    accessDecision.decide.mockResolvedValue({ allowed: false });

    await expect(
      service.addProjects(CLIENT, USER, 'm1', { projectIds: ['p1'] }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(accessDecision.decide).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: CLIENT,
        userId: USER,
        resourceType: 'PROJECT',
        resourceId: 'p1',
        intent: 'read',
      }),
    );
    expect(prisma.meetingProject.createMany).not.toHaveBeenCalled();
  });

  it('refuse un rattachement à une instance de cycle d’un autre client', async () => {
    templates.getOrThrow.mockResolvedValue({
      id: 't1',
      sections: [],
      defaultAgenda: [],
      defaultDurationMinutes: 60,
      code: 'CODIR',
      scope: 'PORTFOLIO',
    });
    prisma.governanceCycleInstance.findFirst.mockResolvedValue(null);

    await expect(
      service.create(CLIENT, USER, {
        templateId: 't1',
        title: 'CODIR',
        governanceCycleInstanceId: 'instance-etrangere',
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(
      prisma.governanceCycleInstance.findFirst.mock.calls[0][0].where.clientId,
    ).toBe(CLIENT);
    expect(prisma.meeting.create).not.toHaveBeenCalled();
  });

  it('n’accepte jamais un clientId venu de la requête', async () => {
    templates.getOrThrow.mockResolvedValue({
      id: 't1',
      sections: [],
      defaultAgenda: [],
      defaultDurationMinutes: 60,
      code: 'CODIR',
      scope: 'PORTFOLIO',
    });
    prisma.meeting.create.mockResolvedValue({ id: 'm1' });

    await service.create(CLIENT, USER, {
      templateId: 't1',
      title: 'CODIR',
      // Un appelant malveillant tenterait ceci : la valeur doit être ignorée.
      clientId: OTHER,
    } as any);

    expect(prisma.meeting.create.mock.calls[0][0].data.clientId).toBe(CLIENT);
  });

  it('scope la lecture des présences et des sections au client actif', async () => {
    prisma.meeting.findFirst.mockResolvedValue({
      id: 'm1',
      clientId: CLIENT,
      status: 'IN_PROGRESS',
      quorumRule: null,
      sectionsLockedAt: null,
    });

    await service.getAttendance(CLIENT, 'm1');
    expect(prisma.meetingAttendee.findMany.mock.calls[0][0].where).toEqual({
      clientId: CLIENT,
      meetingId: 'm1',
    });
  });

  it('délie le point projet au lieu de le supprimer quand on retire un projet', async () => {
    prisma.meeting.findFirst.mockResolvedValue({
      id: 'm1',
      clientId: CLIENT,
      status: 'PREPARING',
      sectionsLockedAt: null,
    });
    prisma.meetingProject.findFirst.mockResolvedValue({
      id: 'mp1',
      projectId: 'p1',
      projectReviewId: 'review-1',
    });

    await service.removeProject(CLIENT, USER, 'm1', 'mp1');

    // Seule la ligne de périmètre disparaît : la review garde ses décisions.
    expect(prisma.meetingProject.delete).toHaveBeenCalledWith({
      where: { id: 'mp1' },
    });
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'meeting.project.removed',
        oldValue: expect.objectContaining({ keptProjectReviewId: 'review-1' }),
      }),
    );
  });
});
