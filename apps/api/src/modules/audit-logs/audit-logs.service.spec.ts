import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsService', () => {
  it('listForClient propage resourceId vers findMany', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { auditLog: { findMany } };
    const service = new AuditLogsService(prisma as any);

    await service.listForClient({
      clientId: 'client-1',
      query: {
        resourceType: 'project',
        resourceId: 'proj-42',
      } as any,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'client-1',
          resourceType: { in: ['project', 'Project'] },
          resourceId: 'proj-42',
        }),
      }),
    );
  });

  it('listForClient combine resourceType et resourceId et action (RFC + legacy)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { auditLog: { findMany } };
    const service = new AuditLogsService(prisma as any);

    await service.listForClient({
      clientId: 'c1',
      query: {
        resourceType: 'project_task',
        resourceId: 'task-7',
        action: 'project_task.updated',
      } as any,
    });

    const arg = findMany.mock.calls[0][0];
    expect(arg.where).toEqual(
      expect.objectContaining({
        clientId: 'c1',
        resourceType: { in: ['project_task', 'ProjectTask'] },
        resourceId: 'task-7',
        action: { in: ['project_task.updated', 'project_task.update'] },
      }),
    );
  });

  it('listForClient filtre action project.created inclut project.create (legacy)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { auditLog: { findMany } };
    const service = new AuditLogsService(prisma as any);

    await service.listForClient({
      clientId: 'c1',
      query: { action: 'project.created' } as any,
    });

    const arg = findMany.mock.calls[0][0];
    expect(arg.where).toEqual(
      expect.objectContaining({
        clientId: 'c1',
        action: { in: ['project.created', 'project.create'] },
      }),
    );
  });

  it('create avec tx propage l’erreur (rollback transactionnel)', async () => {
    const auditCreate = jest.fn().mockRejectedValue(new Error('audit fail'));
    const prisma = {
      auditLog: {
        create: auditCreate,
      },
    };
    const service = new AuditLogsService(prisma as any);

    await expect(
      service.create({ clientId: 'c1', action: 'x', resourceType: 'y' } as any, prisma as any),
    ).rejects.toThrow('audit fail');
  });

  it('create sans tx avale l’erreur (pas de throw)', async () => {
    const auditCreate = jest.fn().mockRejectedValue(new Error('audit fail'));
    const prisma = {
      auditLog: {
        create: auditCreate,
      },
    };
    const service = new AuditLogsService(prisma as any);

    await expect(
      service.create({ clientId: 'c1', action: 'x', resourceType: 'y' } as any),
    ).resolves.toBeUndefined();
  });

  it('listForClient combine licence canonique + legacy (evaluation_granted)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { auditLog: { findMany } };
    const service = new AuditLogsService(prisma as any);

    await service.listForClient({
      clientId: 'c1',
      query: {
        action: 'client_user.license.evaluation_granted',
      } as any,
    });

    const arg = findMany.mock.calls[0][0];
    expect(arg.where.action.in).toContain('evaluation_granted');
    expect(arg.where.action.in).toContain('client_user.license.evaluation_granted');
  });

  it('listForPlatform propage resourceId et alias resourceType', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { auditLog: { findMany } };
    const service = new AuditLogsService(prisma as any);

    await service.listForPlatform({
      resourceId: 'rid-9',
      resourceType: 'project',
    } as any);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          resourceId: 'rid-9',
          resourceType: { in: ['project', 'Project'] },
        }),
      }),
    );
  });
});
