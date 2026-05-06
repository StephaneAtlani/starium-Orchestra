import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserStatus, Prisma, ResourceAclSubjectType } from '@prisma/client';
import { AccessGroupsService } from './access-groups.service';

describe('AccessGroupsService', () => {
  const clientId = 'client-a';
  const groupId = 'group-1';
  const userId = 'user-1';

  let service: AccessGroupsService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };

  beforeEach(() => {
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      accessGroup: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      accessGroupMember: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      resourceAcl: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(async (ops: Promise<unknown>[]) => {
        for (const op of ops) await op;
      }),
      clientUser: {
        findFirst: jest.fn(),
      },
    };
    service = new AccessGroupsService(prisma, auditLogs as any);
  });

  const sampleGroup = (overrides: Record<string, unknown> = {}) => ({
    id: groupId,
    clientId,
    name: 'Mon groupe',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
    _count: { members: 2 },
    ...overrides,
  });

  it('createGroup insère un groupe pour le client actif', async () => {
    prisma.accessGroup.create.mockResolvedValue(
      sampleGroup({ name: 'Équipe A', _count: { members: 0 } }),
    );

    const result = await service.createGroup(clientId, { name: ' Équipe A ' });

    expect(result.name).toBe('Équipe A');
    expect(result.memberCount).toBe(0);
    expect(prisma.accessGroup.create).toHaveBeenCalledWith({
      data: { clientId, name: 'Équipe A' },
      include: { _count: { select: { members: true } } },
    });
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'access_group.created',
        resourceType: 'access_group',
        clientId,
      }),
    );
  });

  it('createGroup mappe P2002 en ConflictException', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    prisma.accessGroup.create.mockRejectedValue(err);

    await expect(service.createGroup(clientId, { name: 'Dup' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('getGroupById refuse un groupe qui ne correspond pas au client', async () => {
    prisma.accessGroup.findFirst.mockResolvedValue(null);

    await expect(service.getGroupById(clientId, groupId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('addMember refuse si pas de ClientUser ACTIVE pour ce client', async () => {
    prisma.accessGroup.findFirst.mockResolvedValue({ id: groupId, clientId });
    prisma.clientUser.findFirst.mockResolvedValue(null);

    await expect(service.addMember(clientId, groupId, userId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.accessGroupMember.create).not.toHaveBeenCalled();
  });

  it('addMember accepte si ClientUser ACTIVE', async () => {
    prisma.accessGroup.findFirst.mockResolvedValue({ id: groupId, clientId });
    prisma.clientUser.findFirst.mockResolvedValue({ id: 'cu-1' });
    prisma.accessGroupMember.create.mockResolvedValue({
      id: 'm1',
      userId,
      groupId,
      clientId,
      createdAt: new Date(),
      user: { email: 'a@b.c', firstName: 'A', lastName: 'B' },
    });

    const row = await service.addMember(clientId, groupId, userId);

    expect(row.email).toBe('a@b.c');
    expect(prisma.accessGroupMember.create).toHaveBeenCalledWith({
      data: { groupId, userId, clientId },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });
    expect(prisma.clientUser.findFirst).toHaveBeenCalledWith({
      where: {
        clientId,
        userId,
        status: ClientUserStatus.ACTIVE,
      },
      select: { id: true },
    });
  });

  it('deleteGroup audite puis supprime le groupe et les ResourceAcl GROUP associées', async () => {
    prisma.accessGroup.findFirst.mockResolvedValue({
      id: groupId,
      clientId,
      name: 'À effacer',
    });
    prisma.accessGroup.delete.mockResolvedValue({});

    await service.deleteGroup(clientId, groupId);

    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'access_group.deleted',
        oldValue: expect.objectContaining({ name: 'À effacer' }),
      }),
    );
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.resourceAcl.deleteMany).toHaveBeenCalledWith({
      where: {
        clientId,
        subjectType: ResourceAclSubjectType.GROUP,
        subjectId: groupId,
      },
    });
    expect(prisma.accessGroup.delete).toHaveBeenCalledWith({
      where: { id: groupId },
    });
  });

  it('listMembers filtre par clientId et groupId', async () => {
    prisma.accessGroup.findFirst.mockResolvedValue({ id: groupId, clientId });
    prisma.accessGroupMember.findMany.mockResolvedValue([]);

    await service.listMembers(clientId, groupId);

    expect(prisma.accessGroupMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { groupId, clientId },
      }),
    );
  });
});
