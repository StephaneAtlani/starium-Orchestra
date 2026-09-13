import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  PROJECT_AUDIT_ACTION,
  PROJECT_AUDIT_RESOURCE_TYPE,
} from './project-audit.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectDocumentsService } from './project-documents.service';
import { ProjectDocumentContentService } from './project-document-content.service';
import { ProjectsService } from './projects.service';

describe('ProjectDocumentsService — RFC-PROJ-DOC-001 / DOC-002', () => {
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
  let projects: {
    getProjectForScope: jest.Mock;
    assertCanReadProject: jest.Mock;
    assertCanWriteProject: jest.Mock;
    assertCanAdminProject: jest.Mock;
  };
  let content: {
    writeStariumBuffer: jest.Mock;
    openStariumReadStream: jest.Mock;
    readStariumBuffer: jest.Mock;
  };

  const clientId = 'c1';
  const projectId = 'p1';
  const otherProjectId = 'p2';
  const documentId = 'd1';
  const userId = 'u1';

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
      assertCanReadProject: jest.fn().mockResolvedValue(undefined),
      assertCanWriteProject: jest.fn().mockResolvedValue(undefined),
      assertCanAdminProject: jest.fn().mockResolvedValue(undefined),
    };
    content = {
      writeStariumBuffer: jest.fn().mockReturnValue('/tmp/file'),
      openStariumReadStream: jest.fn().mockReturnValue({ pipe: jest.fn() }),
      readStariumBuffer: jest.fn(),
    };
    service = new ProjectDocumentsService(
      prisma as unknown as PrismaService,
      auditLogs as unknown as AuditLogsService,
      projects as unknown as ProjectsService,
      content as unknown as ProjectDocumentContentService,
    );
  });

  it('list filtre status != DELETED', async () => {
    prisma.projectDocument.findMany.mockResolvedValue([]);
    await service.list(clientId, projectId, userId);
    expect(prisma.projectDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId,
          projectId,
          status: { not: 'DELETED' },
        }),
        take: 200,
      }),
    );
  });

  it('list applique search + sort name:asc', async () => {
    prisma.projectDocument.findMany.mockResolvedValue([]);
    await service.list(clientId, projectId, userId, {
      search: 'cdc',
      sort: 'name:asc',
    });
    expect(prisma.projectDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.any(Array),
            }),
          ]),
        }),
        orderBy: [{ name: 'asc' }, { updatedAt: 'desc' }],
      }),
    );
  });

  it('getOne rejette si document appartient à un autre projectId (même client)', async () => {
    prisma.projectDocument.findFirst.mockResolvedValue(null);
    await expect(
      service.getOne(clientId, projectId, documentId, userId),
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
        { actorUserId: userId, meta: {} },
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
        { actorUserId: userId, meta: {} },
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.projectDocument.create).not.toHaveBeenCalled();
    expect(auditLogs.create).not.toHaveBeenCalled();
  });

  it('upload PDF ok écrit disque + crée STARIUM', async () => {
    const created = baseDoc({
      storageType: 'STARIUM',
      mimeType: 'application/pdf',
      extension: 'pdf',
    });
    prisma.projectDocument.create.mockResolvedValue(created);

    const file = {
      buffer: Buffer.from('%PDF-1.4'),
      mimetype: 'application/pdf',
      originalname: 'cdc.pdf',
      size: 8,
    } as Express.Multer.File;

    const res = await service.upload(clientId, projectId, file, {}, {
      actorUserId: userId,
      meta: {},
    });

    expect(content.writeStariumBuffer).toHaveBeenCalledWith(
      clientId,
      projectId,
      expect.stringMatching(/\.pdf$/),
      file.buffer,
    );
    expect(res).toEqual(created);
    expect(projects.assertCanWriteProject).toHaveBeenCalled();
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: PROJECT_AUDIT_ACTION.PROJECT_DOCUMENT_CREATED,
        newValue: expect.objectContaining({ via: 'upload' }),
      }),
    );
  });

  it('upload MIME invalide => 422', async () => {
    const file = {
      buffer: Buffer.from('x'),
      mimetype: 'application/x-msdownload',
      originalname: 'x.exe',
      size: 1,
    } as Express.Multer.File;

    await expect(
      service.upload(clientId, projectId, file, {}, {
        actorUserId: userId,
        meta: {},
      }),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(content.writeStariumBuffer).not.toHaveBeenCalled();
    expect(prisma.projectDocument.create).not.toHaveBeenCalled();
  });

  it('download soft-deleted => 404', async () => {
    prisma.projectDocument.findFirst.mockResolvedValue(null);
    await expect(
      service.getDownloadStream(clientId, projectId, documentId, userId),
    ).rejects.toThrow(NotFoundException);
  });

  it('download EXTERNAL => 422', async () => {
    prisma.projectDocument.findFirst.mockResolvedValue(
      baseDoc({ storageType: 'EXTERNAL', storageKey: null, externalUrl: 'https://x' }),
    );
    await expect(
      service.getDownloadStream(clientId, projectId, documentId, userId),
    ).rejects.toThrow(UnprocessableEntityException);
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

  it('archive utilise assertCanWriteProject', async () => {
    const existing = baseDoc();
    prisma.projectDocument.findFirst.mockResolvedValue(existing);
    prisma.projectDocument.update.mockResolvedValue(
      baseDoc({ status: 'ARCHIVED', archivedAt: new Date() }),
    );
    await service.archive(clientId, projectId, documentId, {
      actorUserId: 'u1',
      meta: {},
    });
    expect(projects.assertCanWriteProject).toHaveBeenCalled();
    expect(projects.assertCanAdminProject).not.toHaveBeenCalled();
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

describe('ProjectDocumentContentService path guards', () => {
  const { ConfigService } = require('@nestjs/config');
  const { ProjectDocumentContentService: Svc } = require('./project-document-content.service');

  it('rejette storageKey avec ..', () => {
    const config = { get: () => '/tmp/starium-docs-test' };
    const svc = new Svc(config as InstanceType<typeof ConfigService>);
    expect(() =>
      svc.resolveAbsolutePath('c1', 'p1', '../escape.pdf'),
    ).toThrow(UnprocessableEntityException);
  });
});
