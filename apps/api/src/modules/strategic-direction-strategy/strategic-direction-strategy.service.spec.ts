import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ClientStrategicDirectionStrategyWorkflowSettingsService } from '../clients/client-strategic-direction-strategy-workflow-settings.service';
import { EmailService } from '../email/email.service';
import { StrategicDirectionStrategyService } from './strategic-direction-strategy.service';

describe('StrategicDirectionStrategyService', () => {
  const prisma = {
    $transaction: jest.fn(),
    strategicDirection: { findFirst: jest.fn() },
    strategicVision: { findFirst: jest.fn() },
    strategicAxis: { findMany: jest.fn() },
    strategicObjective: { findMany: jest.fn() },
    strategicDirectionStrategyAxisLink: { findMany: jest.fn(), createMany: jest.fn() },
    strategicDirectionStrategyObjectiveLink: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    strategicDirectionStrategy: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    clientUser: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    notification: { create: jest.fn().mockResolvedValue(undefined) },
  };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const emailService = { queueEmail: jest.fn().mockResolvedValue(undefined) };
  const workflowSettings = {
    getActive: jest.fn().mockResolvedValue({
      stored: {
        allowSubmitterToSelectValidator: true,
        allowSelfValidation: false,
        defaultValidatorUserId: null,
        authorizedValidatorUserIds: [],
        authorizedValidatorRoleIds: [],
      },
    }),
    assertValidatorEligible: jest.fn().mockResolvedValue(undefined),
    listEligibleValidators: jest.fn().mockResolvedValue([]),
  };
  const effectivePermissions = {
    resolvePermissionCodesForRequest: jest.fn().mockResolvedValue(
      new Set([
        'strategic_direction_strategy.create',
        'strategic_direction_strategy.update',
      ]),
    ),
  };
  let service: StrategicDirectionStrategyService;

  beforeEach(() => {
    jest.clearAllMocks();
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set([
        'strategic_direction_strategy.create',
        'strategic_direction_strategy.update',
      ]),
    );
    service = new StrategicDirectionStrategyService(
      prisma as unknown as PrismaService,
      auditLogs as unknown as AuditLogsService,
      workflowSettings as unknown as ClientStrategicDirectionStrategyWorkflowSettingsService,
      emailService as unknown as EmailService,
      effectivePermissions as unknown as import('../../common/services/effective-permissions.service').EffectivePermissionsService,
    );
  });

  const actorCtx = { actorUserId: 'u1' };

  it('create rejette alignedVisionId hors client actif', async () => {
    prisma.strategicDirection.findFirst.mockResolvedValueOnce({ id: 'd1', isActive: true });
    prisma.strategicVision.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.create(
        'c1',
        {
          directionId: 'd1',
          alignedVisionId: 'foreign-v1',
          title: 'Titre',
          ambition: 'Ambition',
          context: 'Contexte',
          horizonLabel: '2028',
        },
        actorCtx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create mappe P2002 vers ConflictException', async () => {
    prisma.strategicDirection.findFirst.mockResolvedValueOnce({ id: 'd1', isActive: true });
    prisma.strategicVision.findFirst.mockResolvedValueOnce({
      id: 'v1',
      title: 'Vision',
      horizonLabel: '2028',
      isActive: true,
    });
    prisma.strategicDirectionStrategy.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create(
        'c1',
        {
          directionId: 'd1',
          alignedVisionId: 'v1',
          title: 'Titre',
          ambition: 'Ambition',
          context: 'Contexte',
          horizonLabel: '2028',
        },
        actorCtx,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('create autorise le sponsor sans permission create', async () => {
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['strategic_direction_strategy.read']),
    );
    prisma.strategicDirection.findFirst
      .mockResolvedValueOnce({ id: 'd1', isActive: true })
      .mockResolvedValueOnce({ sponsorResourceId: 'hr1' });
    prisma.clientUser.findUnique.mockResolvedValueOnce({ resourceId: 'hr1' });
    prisma.strategicVision.findFirst.mockResolvedValueOnce({
      id: 'v1',
      title: 'Vision',
      horizonLabel: '2028',
      isActive: true,
    });
    prisma.strategicDirectionStrategy.create.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      alignedVisionId: 'v1',
      title: 'Titre',
      ambition: 'Ambition',
      context: 'Contexte',
      horizonLabel: '2028',
      status: 'DRAFT',
      direction: {
        id: 'd1',
        code: 'DSI',
        name: 'DSI',
        sponsorResourceId: 'hr1',
        operatingBudgetCents: null,
        sponsorResource: null,
      },
      alignedVision: { id: 'v1', title: 'Vision', horizonLabel: '2028', isActive: true },
      validator: null,
    });

    const created = await service.create(
      'c1',
      {
        directionId: 'd1',
        alignedVisionId: 'v1',
        title: 'Titre',
        ambition: 'Ambition',
        context: 'Contexte',
        horizonLabel: '2028',
      },
      actorCtx,
    );
    expect(created.id).toBe('s1');
  });

  it('create refuse un non-sponsor sans permission create', async () => {
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['strategic_direction_strategy.read']),
    );
    prisma.strategicDirection.findFirst
      .mockResolvedValueOnce({ id: 'd1', isActive: true })
      .mockResolvedValueOnce({ sponsorResourceId: 'hr1' });
    prisma.clientUser.findUnique.mockResolvedValueOnce({ resourceId: 'hr-other' });

    await expect(
      service.create(
        'c1',
        {
          directionId: 'd1',
          alignedVisionId: 'v1',
          title: 'Titre',
          ambition: 'Ambition',
          context: 'Contexte',
          horizonLabel: '2028',
        },
        actorCtx,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('submit rejette alignedVisionId d’un autre client', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      alignedVisionId: 'v1',
      title: 'Titre',
      ambition: 'Ambition',
      context: 'Contexte',
      statement: 'Legacy',
      status: 'DRAFT',
    });
    prisma.strategicDirection.findFirst.mockResolvedValueOnce({ id: 'd1', isActive: true });
    prisma.strategicVision.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.submit('c1', 's1', { alignedVisionId: 'foreign-v1' }, actorCtx),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submit notifie le validateur (cloche + e-mail)', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      alignedVisionId: 'v1',
      title: 'Stratégie DSI 2028',
      ambition: 'Ambition',
      context: 'Contexte',
      statement: 'Legacy',
      status: 'DRAFT',
    });
    prisma.strategicDirection.findFirst.mockResolvedValueOnce({ id: 'd1', isActive: true });
    prisma.strategicVision.findFirst.mockResolvedValueOnce({ id: 'v1' });
    prisma.strategicDirectionStrategy.update.mockResolvedValueOnce({
      id: 's1',
      title: 'Stratégie DSI 2028',
      status: 'SUBMITTED',
      submittedByUserId: 'submitter-1',
      validatorUserId: 'validator-1',
      direction: { id: 'd1', code: 'DSI', name: 'DSI' },
      alignedVision: { id: 'v1', title: 'Vision', horizonLabel: '2028', isActive: true },
      validator: null,
    });
    prisma.user.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === 'validator-1') {
        return {
          id: 'validator-1',
          email: 'validator@test.com',
          firstName: 'Val',
          lastName: 'Idateur',
        };
      }
      if (where.id === 'submitter-1') {
        return {
          id: 'submitter-1',
          email: 'submitter@test.com',
          firstName: 'Sou',
          lastName: 'Metteur',
        };
      }
      return null;
    });

    await service.submit(
      'c1',
      's1',
      { alignedVisionId: 'v1', validatorUserId: 'validator-1' },
      { actorUserId: 'submitter-1' },
    );

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'validator-1',
          entityType: 'strategic_direction_strategy',
          entityId: 's1',
          title: 'Stratégie à valider',
        }),
      }),
    );
    expect(emailService.queueEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: 'validator@test.com',
        templateKey: 'generic_notification',
        title: 'Stratégie à valider',
      }),
    );
  });

  it('review autorise un détenteur de review autre que le validateur désigné', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      status: 'SUBMITTED',
      submittedByUserId: 'submitter-1',
      validatorUserId: 'validator-1',
    });
    prisma.strategicDirectionStrategy.update.mockResolvedValueOnce({
      id: 's1',
      title: 'Stratégie',
      status: 'APPROVED',
      direction: { id: 'd1', code: 'DSI', name: 'DSI' },
      alignedVision: { id: 'v1', title: 'Vision', horizonLabel: '2028', isActive: true },
    });

    const res = await service.review(
      'c1',
      's1',
      { decision: 'APPROVED', reviewInstanceLabel: 'CODIR' },
      { actorUserId: 'gestionnaire-board' },
    );

    expect(res.status).toBe('APPROVED');
    expect(prisma.strategicDirectionStrategy.update).toHaveBeenCalled();
  });

  it('review refuse l’auto-validation par le soumissionnaire', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      status: 'SUBMITTED',
      submittedByUserId: 'gestionnaire-board',
      validatorUserId: 'validator-1',
    });

    await expect(
      service.review(
        'c1',
        's1',
        { decision: 'APPROVED', reviewInstanceLabel: 'CODIR' },
        { actorUserId: 'gestionnaire-board' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.strategicDirectionStrategy.update).not.toHaveBeenCalled();
  });

  it('review autorise l’auto-validation si allowSelfValidation est activé', async () => {
    workflowSettings.getActive.mockResolvedValueOnce({
      stored: {
        allowSubmitterToSelectValidator: true,
        allowSelfValidation: true,
        defaultValidatorUserId: null,
        authorizedValidatorUserIds: [],
        authorizedValidatorRoleIds: [],
      },
    });
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      status: 'SUBMITTED',
      submittedByUserId: 'gestionnaire-board',
      validatorUserId: 'validator-1',
    });
    prisma.strategicDirectionStrategy.update.mockResolvedValueOnce({
      id: 's1',
      title: 'Stratégie',
      status: 'APPROVED',
      direction: { id: 'd1', code: 'DSI', name: 'DSI' },
      alignedVision: { id: 'v1', title: 'Vision', horizonLabel: '2028', isActive: true },
    });

    const res = await service.review(
      'c1',
      's1',
      { decision: 'APPROVED', reviewInstanceLabel: 'CODIR' },
      { actorUserId: 'gestionnaire-board' },
    );

    expect(res.status).toBe('APPROVED');
  });

  it('getLinks lève NotFound si stratégie absente', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce(null);
    await expect(service.getLinks('c1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('replaceStrategyAxes rejette si un axe nest pas sous la vision alignée', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      alignedVisionId: 'v1',
      status: 'DRAFT',
    });
    prisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        strategicDirectionStrategyAxisLink: {
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
        strategicAxis: {
          findMany: jest.fn().mockResolvedValue([{ id: 'ax1' }]),
        },
        strategicDirectionStrategyObjectiveLink: {
          deleteMany: jest.fn(),
        },
      }),
    );

    await expect(
      service.replaceStrategyAxes('c1', 's1', ['ax1', 'ax2'], actorCtx),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replaceStrategyObjectives rejette un objectif dont laxe nest pas parmi les axes liés', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      alignedVisionId: 'v1',
      status: 'DRAFT',
    });
    prisma.strategicDirectionStrategyAxisLink.findMany.mockResolvedValueOnce([
      { strategicAxisId: 'ax-good' },
    ]);
    prisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        strategicDirectionStrategyObjectiveLink: {
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
        strategicObjective: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              {
                id: 'o1',
                axisId: 'ax-other',
                axis: { visionId: 'v1' },
              },
            ]),
        },
      }),
    );

    await expect(
      service.replaceStrategyObjectives('c1', 's1', ['o1'], actorCtx),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('archive passe une stratégie APPROVED à ARCHIVED', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      status: 'APPROVED',
    });
    prisma.strategicDirectionStrategy.update.mockResolvedValueOnce({
      id: 's1',
      status: 'ARCHIVED',
      archivedAt: new Date('2026-01-01'),
      direction: { id: 'd1', code: 'DSI', name: 'DSI' },
      alignedVision: { id: 'v1', title: 'Vision', horizonLabel: '2028', isActive: true },
    });

    await service.archive('c1', 's1', { reason: 'Cycle clôturé' }, actorCtx);
    expect(prisma.strategicDirectionStrategy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ARCHIVED',
        }),
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'strategic_direction_strategy.archived',
      }),
    );
  });

  it('archive rejette hors statut APPROVED', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      status: 'DRAFT',
    });
    await expect(
      service.archive('c1', 's1', { reason: 'N/A' }, actorCtx),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.strategicDirectionStrategy.update).not.toHaveBeenCalled();
  });

  it("update d'une stratégie APPROVED exige un motif d'adaptation", async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      status: 'APPROVED',
    });

    await expect(
      service.update('c1', 's1', { title: 'Nouveau titre' }, actorCtx),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("update d'une stratégie APPROVED archive un snapshot et repasse la stratégie en DRAFT", async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      alignedVisionId: 'v1',
      title: 'Titre actuel',
      ambition: 'Ambition',
      context: 'Contexte',
      statement: 'Statement',
      strategicPriorities: [],
      expectedOutcomes: [],
      kpis: [],
      majorInitiatives: [],
      risks: [],
      horizonLabel: '2028',
      ownerLabel: 'Owner',
      status: 'APPROVED',
      submittedAt: null,
      submittedByUserId: null,
      approvedAt: new Date('2026-01-01'),
      approvedByUserId: 'u1',
      rejectionReason: null,
    });
    prisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        strategicDirectionStrategy: {
          create: jest.fn().mockResolvedValue({ id: 'snap-1' }),
          update: jest.fn().mockResolvedValue({
            id: 's1',
            title: 'Titre adapté',
            ambition: 'Ambition',
            context: 'Contexte',
            statement: 'Statement',
            horizonLabel: '2028',
            ownerLabel: 'Owner',
            status: 'DRAFT',
            direction: { id: 'd1', code: 'DIR', name: 'Direction' },
            alignedVision: { id: 'v1', title: 'Vision', horizonLabel: '2028', isActive: true },
          }),
        },
        strategicDirectionStrategyAxisLink: {
          findMany: jest.fn().mockResolvedValue([{ strategicAxisId: 'ax1' }]),
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        strategicDirectionStrategyObjectiveLink: {
          findMany: jest.fn().mockResolvedValue([{ strategicObjectiveId: 'obj1' }]),
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      }),
    );

    const res = await service.update(
      'c1',
      's1',
      { title: 'Titre adapté', archiveReason: 'Contexte business changé' },
      { actorUserId: 'u2' },
    );

    expect(res.status).toBe('DRAFT');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('update APPROVED avec seul archiveReason crée une nouvelle version (DRAFT)', async () => {
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      alignedVisionId: 'v1',
      title: 'Titre actuel',
      ambition: 'Ambition',
      context: 'Contexte',
      statement: 'Statement',
      strategicPriorities: [],
      expectedOutcomes: [],
      kpis: [],
      majorInitiatives: [],
      risks: [],
      horizonLabel: '2028',
      ownerLabel: 'Owner',
      status: 'APPROVED',
      submittedAt: null,
      submittedByUserId: null,
      approvedAt: new Date('2026-01-01'),
      approvedByUserId: 'u1',
      rejectionReason: null,
    });
    prisma.$transaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        strategicDirectionStrategy: {
          create: jest.fn().mockResolvedValue({ id: 'snap-1' }),
          update: jest.fn().mockResolvedValue({
            id: 's1',
            title: 'Titre actuel',
            ambition: 'Ambition',
            context: 'Contexte',
            statement: 'Statement',
            horizonLabel: '2028',
            ownerLabel: 'Owner',
            status: 'DRAFT',
            direction: { id: 'd1', code: 'DIR', name: 'Direction' },
            alignedVision: { id: 'v1', title: 'Vision', horizonLabel: '2028', isActive: true },
          }),
        },
        strategicDirectionStrategyAxisLink: {
          findMany: jest.fn().mockResolvedValue([]),
          createMany: jest.fn(),
        },
        strategicDirectionStrategyObjectiveLink: {
          findMany: jest.fn().mockResolvedValue([]),
          createMany: jest.fn(),
        },
      }),
    );

    const res = await service.update(
      'c1',
      's1',
      { archiveReason: 'Nouvelle version CODIR' },
      { actorUserId: 'u2' },
    );

    expect(res.status).toBe('DRAFT');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('archive autorise le sponsor sans permission update globale', async () => {
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['strategic_direction_strategy.read']),
    );
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      status: 'APPROVED',
    });
    prisma.strategicDirection.findFirst.mockResolvedValueOnce({
      id: 'd1',
      sponsorResourceId: 'hr-sponsor',
    });
    prisma.clientUser.findUnique.mockResolvedValueOnce({ resourceId: 'hr-sponsor' });
    prisma.strategicDirectionStrategy.update.mockResolvedValueOnce({
      id: 's1',
      status: 'ARCHIVED',
      archivedAt: new Date('2026-01-01'),
      direction: { id: 'd1', code: 'DSI', name: 'DSI' },
      alignedVision: { id: 'v1', title: 'Vision', horizonLabel: '2028', isActive: true },
    });

    await service.archive('c1', 's1', { reason: 'Fin de cycle' }, { actorUserId: 'sponsor-1' });
    expect(prisma.strategicDirectionStrategy.update).toHaveBeenCalled();
  });

  it('archive refuse un non-sponsor sans permission update', async () => {
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['strategic_direction_strategy.read']),
    );
    prisma.strategicDirectionStrategy.findFirst.mockResolvedValueOnce({
      id: 's1',
      clientId: 'c1',
      directionId: 'd1',
      status: 'APPROVED',
    });
    prisma.strategicDirection.findFirst.mockResolvedValueOnce({
      id: 'd1',
      sponsorResourceId: 'hr-sponsor',
    });
    prisma.clientUser.findUnique.mockResolvedValueOnce({ resourceId: 'other-hr' });

    await expect(
      service.archive('c1', 's1', { reason: 'N/A' }, { actorUserId: 'u-other' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.strategicDirectionStrategy.update).not.toHaveBeenCalled();
  });
});
