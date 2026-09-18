import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ProcedureVersionLifecycle } from '@prisma/client';
import { ProcedureAssetsService } from '../procedure-assets.service';

describe('ProcedureAssetsService', () => {
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const storage = {
    putObject: jest.fn().mockResolvedValue({
      bucket: 'local',
      objectKey: 'Procedures/x/y.pdf',
      checksumSha256: 'abc',
    }),
    getObjectStream: jest.fn().mockResolvedValue({
      stream: {} as any,
      contentType: 'application/pdf',
    }),
  };

  function build(prisma: Record<string, unknown>) {
    return new ProcedureAssetsService(
      prisma as any,
      storage as any,
      auditLogs as any,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('upload — refuse MIME hors allowlist', async () => {
    const prisma = {
      procedure: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'p1',
          status: 'DRAFT',
          currentDraftVersionId: 'v1',
        }),
      },
    };
    const service = build(prisma);
    await expect(
      service.upload(
        'c1',
        'p1',
        {
          buffer: Buffer.from('x'),
          mimetype: 'application/zip',
          originalname: 'x.zip',
          size: 1,
        } as Express.Multer.File,
        'u1',
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('upload — happy path + domaine procedures', async () => {
    const created = {
      id: 'a1',
      label: 'Schema',
      mimeType: 'image/png',
      sizeBytes: 10,
      createdAt: new Date(),
    };
    const prisma = {
      procedure: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'p1',
          status: 'DRAFT',
          currentDraftVersionId: 'v1',
        }),
      },
      procedureAsset: {
        create: jest.fn().mockResolvedValue(created),
      },
    };
    const service = build(prisma);
    const result = await service.upload(
      'c1',
      'p1',
      {
        buffer: Buffer.from('png'),
        mimetype: 'image/png',
        originalname: 'Schema.png',
        size: 10,
      } as Express.Multer.File,
      'u1',
      { requestId: 'r1' },
    );
    expect(result.id).toBe('a1');
    expect(storage.putObject).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'procedures', clientId: 'c1' }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'procedure.asset.uploaded' }),
    );
  });

  it('list — 404 si procédure autre client', async () => {
    const prisma = {
      procedure: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    await expect(build(prisma).list('c1', 'p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('delete — bloqué si référencé dans le brouillon', async () => {
    const prisma = {
      procedure: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'p1',
          status: 'DRAFT',
          currentDraftVersionId: 'v1',
        }),
      },
      procedureAsset: {
        findFirst: jest.fn().mockResolvedValue({ id: 'a1', label: 'Img' }),
        delete: jest.fn(),
      },
      procedureVersion: {
        findFirst: jest.fn().mockResolvedValue({
          contentJson: {
            schemaVersion: 2,
            blocks: [
              {
                t: 'img',
                assetId: 'a1',
                alt: 'x',
                cap: '',
              },
            ],
          },
          lifecycle: ProcedureVersionLifecycle.DRAFT,
        }),
      },
    };
    await expect(
      build(prisma).delete('c1', 'p1', 'a1', 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.procedureAsset.delete).not.toHaveBeenCalled();
  });
});
