import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from './project-audit.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectDocumentsService } from './project-documents.service';
import { ProjectsService } from './projects.service';

describe('ProjectDocumentsService — RFC-PROJ-DOC-001', () => {
  let service: ProjectDocumentsService;
  let prisma: {
    projectDocument: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditLogs: { create: jest.Mock };
  let projects: { getProjectForScope: jest.Mock };

  const clientId = 'c1';
  const projectId = 'p1';
  const otherProjectId = 'p2';
  const documentId = 'd1';

  function baseDoc(overrides: Record<string, unknown> = {}) {
    return {
      id: documentId,
      clientId,
      projectId,
      name: 'Doc',
      originalFilename: null,
      mimeType: null,
      extension: null,
      sizeBytes: null,
      category: 'GENERAL',
      status: 'ACTIVE',
      storageType: 'STARIUM',
      storageKey: 'k1',
      externalUrl: null,
      description: null,
      tags: null,
      uploadedByUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
      deletedAt: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      projectDocument: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    projects = {
      getProjectForScope: jest.fn().mockResolvedValue({ id: projectId }),
    };
    service = new ProjectDocumentsService(
      prisma as unknown as PrismaService,
      auditLogs as unknown as AuditLogsService,
      projects as unknown as ProjectsService,
    );
  });

  it('list filtre status != DELETED', async () => {
    prisma.projectDocument.findMany.mockResolvedValue([]);
    await service.list(clientId, projectId);
    expect(prisma.projectDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId,
          projectId,
          status: { not: 'DELETED' },
        }),
      }),
    );
  });

  it('getOne rejette si document appartient à un autre projectId (même client)', async () => {
    prisma.projectDocument.findFirst.mockResolvedValue(null);
    await expect(
      service.getOne(clientId, projectId, documentId),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.projectDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: documentId, clientId, projectId }),
      }),
    );
    expect(prisma.projectDocument.findFirst).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ projectId: otherProjectId }),
      }),
    );
  });

  it('create STARIUM ok + audit created', async () => {
    const created = baseDoc({ storageType: 'STARIUM', storageKey: 'k1' });
    prisma.projectDocument.create.mockResolvedValue(created);

    const res = await service.create(
      clientId,
      projectId,
      { name: 'Doc', storageType: 'STARIUM', storageKey: 'k1' },
      { actorUserId: 'u1', meta: {} },
    );

    expect(res).toEqual(created);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_DOCUMENT_CREATED,
        resourceType: PROJECT_AUDIT_RESOURCE_TYPE.PROJECT_DOCUMENT,
      }),
    );
  });

  it('create STARIUM sans storageKey => BadRequest', async () => {
    await expect(
      service.create(
        clientId,
        projectId,
        { name: 'Doc', storageType: 'STARIUM' },
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.projectDocument.create).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  it('create EXTERNAL sans externalUrl => BadRequest', async () => {
    await expect(
      service.create(
        clientId,
        projectId,
        { name: 'Doc', storageType: 'EXTERNAL' },
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.projectDocument.create).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  it('PATCH no-op ne met pas à jour et ne crée pas d’audit', async () => {
    const existing = baseDoc();
    prisma.projectDocument.findFirst.mockResolvedValue(existing);

    const res = await service.update(clientId, projectId, documentId, {}, {
      actorUserId: 'u1',
      meta: {},
    });

    expect(res).toEqual(existing);
    expect(prisma.projectDocument.update).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  it('archive idempotent: déjà ARCHIVED => pas d’audit', async () => {
    const existing = baseDoc({ status: 'ARCHIVED', archivedAt: new Date() });
    prisma.projectDocument.findFirst.mockResolvedValue(existing);
    const res = await service.archive(clientId, projectId, documentId, {
      actorUserId: 'u1',
      meta: {},
    });
    expect(res).toEqual(existing);
    expect(prisma.projectDocument.update).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  it('delete idempotent: déjà DELETED => pas d’audit', async () => {
    const existing = baseDoc({ status: 'DELETED', deletedAt: new Date() });
    prisma.projectDocument.findFirst.mockResolvedValue(existing);
    await service.delete(clientId, projectId, documentId, {
      actorUserId: 'u1',
      meta: {},
    });
    expect(prisma.projectDocument.update).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });
});

