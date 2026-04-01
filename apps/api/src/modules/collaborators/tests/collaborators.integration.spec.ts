import { Test } from '@nestjs/testing';
import { CollaboratorSource, CollaboratorStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CollaboratorsService } from '../collaborators.service';

describe('Collaborators integration (module-scoped)', () => {
  let service: CollaboratorsService;
  let prisma: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CollaboratorsService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
            collaborator: {
              count: jest.fn().mockResolvedValue(1),
              findMany: jest.fn().mockResolvedValue([]),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            directoryConnection: { findFirst: jest.fn().mockResolvedValue(null) },
            clientUser: { findUnique: jest.fn().mockResolvedValue(null) },
          },
        },
        { provide: AuditLogsService, useValue: { create: jest.fn() } },
      ],
    }).compile();
    service = module.get(CollaboratorsService);
    prisma = module.get(PrismaService);
  });

  it('isole les lectures au client actif', async () => {
    await service.list('client-A', { offset: 0, limit: 20 });
    expect(prisma.collaborator.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: 'client-A' }),
      }),
    );
  });

  it('options managers ne retourne que status ACTIVE', async () => {
    await service.listManagersOptions('client-A', { offset: 0, limit: 20 });
    expect(prisma.collaborator.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'client-A',
          status: CollaboratorStatus.ACTIVE,
        }),
      }),
    );
  });

  it('soft delete synchronisé -> DISABLED_SYNC', async () => {
    prisma.collaborator.findFirst.mockResolvedValue({
      id: 'col-1',
      clientId: 'client-A',
      source: CollaboratorSource.DIRECTORY_SYNC,
      status: CollaboratorStatus.ACTIVE,
    });
    prisma.collaborator.update.mockResolvedValue({
      id: 'col-1',
      displayName: 'User',
      source: CollaboratorSource.DIRECTORY_SYNC,
      status: CollaboratorStatus.DISABLED_SYNC,
      manager: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const out = await service.softDelete('client-A', 'col-1', 'actor-1');
    expect(out.status).toBe(CollaboratorStatus.DISABLED_SYNC);
  });
});
