import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { ProcurementObjectStorageService } from '../s3/procurement-object-storage.service';
import { ProcurementAttachmentsService } from './procurement-attachments.service';
import { MAX_PROCUREMENT_ATTACHMENT_BYTES } from './procurement-attachments.constants';

describe('ProcurementAttachmentsService', () => {
  let service: ProcurementAttachmentsService;
  let prisma: Record<string, jest.Mock>;
  let storage: { putObject: jest.Mock; getObjectStream: jest.Mock };
  let audit: { create: jest.Mock };

  const clientId = 'client-1';
  const poId = 'po-1';
  const userId = 'user-1';

  beforeEach(async () => {
    prisma = {
      purchaseOrder: { findFirst: jest.fn() },
      invoice: { findFirst: jest.fn() },
      procurementAttachment: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    storage = {
      putObject: jest.fn(),
      getObjectStream: jest.fn(),
    };
    audit = { create: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementAttachmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProcurementObjectStorageService, useValue: storage },
        { provide: AuditLogsService, useValue: audit },
      ],
    }).compile();

    service = module.get(ProcurementAttachmentsService);
  });

  function pdfFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
    return {
      fieldname: 'file',
      originalname: 'doc.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('%PDF-1.4'),
      destination: '',
      filename: '',
      path: '',
      stream: null as never,
      ...overrides,
    };
  }

  it('listForPurchaseOrder throws when PO missing', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue(null);

    await expect(
      service.listForPurchaseOrder(clientId, poId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('createForPurchaseOrder rejects oversize file', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue({ id: poId });
    const huge = pdfFile({ size: MAX_PROCUREMENT_ATTACHMENT_BYTES + 1 });

    await expect(
      service.createForPurchaseOrder(clientId, poId, huge, {}, {
        actorUserId: userId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('createForPurchaseOrder rejects disallowed MIME', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue({ id: poId });
    const bad = pdfFile({ mimetype: 'application/zip' });

    await expect(
      service.createForPurchaseOrder(clientId, poId, bad, {}, {
        actorUserId: userId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createForPurchaseOrder persists and audits', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue({ id: poId });
    storage.putObject.mockResolvedValue({
      bucket: 'b',
      objectKey: 'k',
      checksumSha256: null,
    });
    const created = {
      id: 'att-1',
      name: 'doc',
      originalFilename: 'doc.pdf',
      mimeType: 'application/pdf',
      extension: 'pdf',
      sizeBytes: 100,
      category: 'OTHER',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
      uploadedByUser: null,
    };
    prisma.procurementAttachment.create.mockResolvedValue(created);

    const result = await service.createForPurchaseOrder(
      clientId,
      poId,
      pdfFile(),
      { name: 'doc' },
      { actorUserId: userId },
    );

    expect(result.id).toBe('att-1');
    expect(storage.putObject).toHaveBeenCalled();
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'procurement_attachment.uploaded',
        resourceId: 'att-1',
      }),
    );
  });

  it('getDownloadStreamForPurchaseOrder audits access_denied when missing', async () => {
    prisma.procurementAttachment.findFirst.mockResolvedValue(null);

    await expect(
      service.getDownloadStreamForPurchaseOrder(clientId, poId, 'missing', {
        actorUserId: userId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'procurement_attachment.access_denied',
        resourceId: 'missing',
      }),
    );
    expect(storage.getObjectStream).not.toHaveBeenCalled();
  });

  it('getDownloadStreamForPurchaseOrder streams and audits downloaded', async () => {
    prisma.procurementAttachment.findFirst.mockResolvedValue({
      id: 'att-1',
      storageBucket: 'b',
      objectKey: 'k',
      mimeType: 'application/pdf',
      originalFilename: 'x.pdf',
      name: 'x',
      extension: 'pdf',
    });
    const stream = Readable.from(['chunk']);
    storage.getObjectStream.mockResolvedValue({
      stream,
      contentType: 'application/pdf',
    });

    const { contentType, filename } =
      await service.getDownloadStreamForPurchaseOrder(clientId, poId, 'att-1', {
        actorUserId: userId,
      });

    expect(contentType).toBe('application/pdf');
    expect(filename).toBe('x.pdf');
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'procurement_attachment.downloaded',
        resourceId: 'att-1',
      }),
    );
  });
});
