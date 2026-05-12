import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientUserStatus,
  Prisma,
  ResourceAclPermission,
  ResourceAclSubjectType,
} from '@prisma/client';
import { AccessControlService } from './access-control.service';

const RID_PROJECT = 'c111111111111111111111111';
const RID_OTHER = 'c222222222222222222222222';

describe('AccessControlService', () => {
  const clientId = 'client-acl';
  const userId = 'user-u1';

  let service: AccessControlService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };

  beforeEach(() => {
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      resourceAcl: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      clientUser: { findFirst: jest.fn() },
      accessGroup: { findMany: jest.fn(), findFirst: jest.fn() },
      accessGroupMember: { findMany: jest.fn() },
      user: { findMany: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: any) => Promise<unknown>) => {
        const tx = {
          resourceAcl: {
            deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return fn(tx);
      }),
    };
    const diagnostics = {
      hasEffectiveAdminSuccessorAfterSimulation: jest.fn().mockResolvedValue(true),
    };
    service = new AccessControlService(prisma as any, auditLogs as any, diagnostics as any);
  });

  it('parseResourceTypeFromRoute normalise uppercase et whitelist', () => {
    expect(service.parseResourceTypeFromRoute('project')).toBe('PROJECT');
    expect(service.parseResourceTypeFromRoute('DOCUMENT')).toBe('DOCUMENT');
  });

  it('parseResourceTypeFromRoute refuse hors whitelist', () => {
    expect(() => service.parseResourceTypeFromRoute('UNKNOWN')).toThrow(
      BadRequestException,
    );
  });

  it('parseResourceIdFromRoute refuse vide ou non CUID', () => {
    expect(() => service.parseResourceIdFromRoute('')).toThrow(
      BadRequestException,
    );
    expect(() => service.parseResourceIdFromRoute('not-a-cuid')).toThrow(
      BadRequestException,
    );
    expect(service.parseResourceIdFromRoute(RID_PROJECT)).toBe(RID_PROJECT);
  });

  it('replaceEntries refuse tableau vide', async () => {
    await expect(
      service.replaceEntries(clientId, 'PROJECT', RID_PROJECT, []),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('replaceEntries refuse doublons sujet dans le body', async () => {
    const entries = [
      {
        subjectType: ResourceAclSubjectType.USER,
        subjectId: userId,
        permission: ResourceAclPermission.READ,
      },
      {
        subjectType: ResourceAclSubjectType.USER,
        subjectId: userId,
        permission: ResourceAclPermission.WRITE,
      },
    ];
    await expect(
      service.replaceEntries(clientId, 'PROJECT', RID_PROJECT, entries as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('replaceEntries avec sujet USER invalide ne lance pas la transaction', async () => {
    prisma.clientUser.findFirst.mockResolvedValue(null);
    const entries = [
      {
        subjectType: ResourceAclSubjectType.USER,
        subjectId: userId,
        permission: ResourceAclPermission.READ,
      },
    ];
    await expect(
      service.replaceEntries(clientId, 'PROJECT', RID_PROJECT, entries as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('replaceEntries valide exécute transaction deleteMany + createMany', async () => {
    prisma.clientUser.findFirst.mockResolvedValue({ id: 'cu1' });
    prisma.resourceAcl.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'e-new',
          clientId,
          resourceType: 'PROJECT',
          resourceId: RID_PROJECT,
          subjectType: ResourceAclSubjectType.USER,
          subjectId: userId,
          permission: ResourceAclPermission.WRITE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: userId,
        email: 'a@b.c',
        firstName: 'A',
        lastName: 'B',
      },
    ]);
    prisma.accessGroup.findMany.mockResolvedValue([]);

    const txResourceAcl = {
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<void>) =>
      fn({ resourceAcl: txResourceAcl }),
    );

    const result = await service.replaceEntries(
      clientId,
      'PROJECT',
      RID_PROJECT,
      [
        {
          subjectType: ResourceAclSubjectType.USER,
          subjectId: userId,
          permission: ResourceAclPermission.WRITE,
        },
      ] as any,
      { actorUserId: 'admin' },
    );

    expect(txResourceAcl.deleteMany).toHaveBeenCalledWith({
      where: {
        clientId,
        resourceType: 'PROJECT',
        resourceId: RID_PROJECT,
      },
    });
    expect(txResourceAcl.createMany).toHaveBeenCalled();
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'resource_acl.replaced' }),
    );
    expect(result.restricted).toBe(true);
    expect(result.entries).toHaveLength(1);
  });

  it('removeEntry refuse si resourceId URL ne correspond pas à la ligne', async () => {
    prisma.resourceAcl.findFirst.mockResolvedValue(null);

    await expect(
      service.removeEntry(clientId, 'PROJECT', RID_OTHER, 'entry-xyz'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.resourceAcl.delete).not.toHaveBeenCalled();
  });

  it('removeEntry supprime lorsque tous les critères matchent', async () => {
    prisma.resourceAcl.findFirst.mockResolvedValue({
      id: 'entry-xyz',
      clientId,
      resourceType: 'PROJECT',
      resourceId: RID_PROJECT,
      subjectType: ResourceAclSubjectType.USER,
      subjectId: userId,
      permission: ResourceAclPermission.READ,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    });
    prisma.resourceAcl.findMany.mockResolvedValueOnce([
      {
        id: 'entry-xyz',
        clientId,
        resourceType: 'PROJECT',
        resourceId: RID_PROJECT,
        subjectType: ResourceAclSubjectType.USER,
        subjectId: userId,
        permission: ResourceAclPermission.READ,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      },
    ]);
    prisma.resourceAcl.count.mockResolvedValueOnce(2);

    await service.removeEntry(
      clientId,
      'PROJECT',
      RID_PROJECT,
      'entry-xyz',
      { actorUserId: 'admin' },
    );

    expect(prisma.resourceAcl.delete).toHaveBeenCalledWith({
      where: { id: 'entry-xyz' },
    });
    expect(prisma.resourceAcl.count).toHaveBeenCalledWith({
      where: { clientId, resourceType: 'PROJECT', resourceId: RID_PROJECT },
    });
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'resource_acl.entry_deleted',
        newValue: expect.objectContaining({
          removedEntryId: 'entry-xyz',
          remainingEntryCount: 2,
          restrictedAfter: true,
        }),
      }),
    );
  });

  it('addEntry mappe P2002 en ConflictException', async () => {
    prisma.clientUser.findFirst.mockResolvedValue({ id: 'cu' });
    const err = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    prisma.resourceAcl.create.mockRejectedValue(err);

    await expect(
      service.addEntry(clientId, 'PROJECT', RID_PROJECT, {
        subjectType: ResourceAclSubjectType.USER,
        subjectId: userId,
        permission: ResourceAclPermission.READ,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('mode non restreint : canRead / canWrite / canAdmin retournent true', async () => {
    prisma.resourceAcl.count.mockResolvedValue(0);

    await expect(
      service.canReadResource({
        clientId,
        userId,
        resourceTypeNormalized: 'PROJECT',
        resourceId: RID_PROJECT,
      }),
    ).resolves.toBe(true);
    await expect(
      service.canWriteResource({
        clientId,
        userId,
        resourceTypeNormalized: 'PROJECT',
        resourceId: RID_PROJECT,
      }),
    ).resolves.toBe(true);
    await expect(
      service.canAdminResource({
        clientId,
        userId,
        resourceTypeNormalized: 'PROJECT',
        resourceId: RID_PROJECT,
      }),
    ).resolves.toBe(true);
  });

  it('mode restreint sans entrée applicable : utilisateur CLIENT_ADMIN inclus reste refusé', async () => {
    prisma.resourceAcl.count.mockResolvedValue(3);
    prisma.accessGroupMember.findMany.mockResolvedValue([]);
    prisma.resourceAcl.findMany.mockResolvedValue([]);

    await expect(
      service.canReadResource({
        clientId,
        userId,
        resourceTypeNormalized: 'PROJECT',
        resourceId: RID_PROJECT,
      }),
    ).resolves.toBe(false);
  });

  it('WRITE permet READ ; READ ne permet pas WRITE', async () => {
    prisma.resourceAcl.count.mockResolvedValue(1);
    prisma.accessGroupMember.findMany.mockResolvedValue([]);
    prisma.resourceAcl.findMany.mockResolvedValue([
      { permission: ResourceAclPermission.WRITE },
    ]);

    await expect(
      service.canReadResource({
        clientId,
        userId,
        resourceTypeNormalized: 'PROJECT',
        resourceId: RID_PROJECT,
      }),
    ).resolves.toBe(true);

    prisma.resourceAcl.findMany.mockResolvedValue([
      { permission: ResourceAclPermission.READ },
    ]);
    await expect(
      service.canWriteResource({
        clientId,
        userId,
        resourceTypeNormalized: 'PROJECT',
        resourceId: RID_PROJECT,
      }),
    ).resolves.toBe(false);

    prisma.resourceAcl.findMany.mockResolvedValue([
      { permission: ResourceAclPermission.READ },
    ]);
    await expect(
      service.canAdminResource({
        clientId,
        userId,
        resourceTypeNormalized: 'PROJECT',
        resourceId: RID_PROJECT,
      }),
    ).resolves.toBe(false);

    prisma.resourceAcl.findMany.mockResolvedValue([
      { permission: ResourceAclPermission.ADMIN },
    ]);
    await expect(
      service.canWriteResource({
        clientId,
        userId,
        resourceTypeNormalized: 'PROJECT',
        resourceId: RID_PROJECT,
      }),
    ).resolves.toBe(true);
    await expect(
      service.canReadResource({
        clientId,
        userId,
        resourceTypeNormalized: 'PROJECT',
        resourceId: RID_PROJECT,
      }),
    ).resolves.toBe(true);
  });

  it('assertSubjectInClient USER exige ClientUser ACTIVE', async () => {
    prisma.clientUser.findFirst.mockResolvedValue(null);

    await expect(
      service.assertSubjectInClient(
        clientId,
        ResourceAclSubjectType.USER,
        userId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.clientUser.findFirst).toHaveBeenCalledWith({
      where: {
        clientId,
        userId,
        status: ClientUserStatus.ACTIVE,
      },
    });
  });

  it('assertSubjectInClient GROUP exige AccessGroup même client', async () => {
    prisma.accessGroup.findFirst.mockResolvedValue(null);

    await expect(
      service.assertSubjectInClient(
        clientId,
        ResourceAclSubjectType.GROUP,
        'g1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('filterReadableResourceIds filtre en batch sans N+1', async () => {
    prisma.accessGroupMember.findMany.mockResolvedValue([{ groupId: 'g-1' }]);
    prisma.resourceAcl.findMany.mockResolvedValue([
      {
        resourceId: RID_PROJECT,
        subjectType: ResourceAclSubjectType.USER,
        subjectId: userId,
        permission: ResourceAclPermission.READ,
      },
      {
        resourceId: RID_OTHER,
        subjectType: ResourceAclSubjectType.USER,
        subjectId: 'another-user',
        permission: ResourceAclPermission.ADMIN,
      },
    ]);

    const readable = await service.filterReadableResourceIds({
      clientId,
      userId,
      resourceTypeNormalized: 'PROJECT',
      resourceIds: [RID_PROJECT, RID_OTHER],
      operation: 'read',
    });

    expect(readable).toEqual([RID_PROJECT]);
    expect(prisma.accessGroupMember.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.resourceAcl.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.resourceAcl.count).not.toHaveBeenCalled();
  });
});
