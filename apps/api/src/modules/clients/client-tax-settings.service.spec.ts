import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { ClientTaxSettingsService } from './client-tax-settings.service';
import { Prisma } from '@prisma/client';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';

describe('ClientTaxSettingsService', () => {
  const clientId = 'client-1';

  let service: ClientTaxSettingsService;
  let prisma: {
    client: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let auditLogs: { create: jest.Mock };

  beforeEach(async () => {
    prisma = {
      client: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as any;
    auditLogs = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientTaxSettingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();

    service = module.get<ClientTaxSettingsService>(ClientTaxSettingsService);
    jest.clearAllMocks();
  });

  it('getActiveTaxSettings retourne les réglages', async () => {
    prisma.client.findUnique.mockResolvedValue({
      taxDisplayMode: 'HT',
      taxInputMode: 'HT',
      defaultTaxRate: new Prisma.Decimal(20),
    });

    const result = await service.getActiveTaxSettings(clientId);

    expect(prisma.client.findUnique).toHaveBeenCalledWith({
      where: { id: clientId },
      select: {
        taxDisplayMode: true,
        taxInputMode: true,
        defaultTaxRate: true,
      },
    });
    expect(result.taxDisplayMode).toBe('HT');
    expect(result.taxInputMode).toBe('HT');
    expect(Number(result.defaultTaxRate)).toBe(20);
  });

  it('updateActiveTaxSettings met à jour et écrit un audit log', async () => {
    const before = {
      taxDisplayMode: 'HT',
      taxInputMode: 'HT',
      defaultTaxRate: new Prisma.Decimal(10),
    };
    const updated = {
      taxDisplayMode: 'TTC',
      taxInputMode: 'TTC',
      defaultTaxRate: new Prisma.Decimal(20),
    };

    prisma.client.findUnique
      .mockResolvedValueOnce(before) // before
      .mockResolvedValueOnce(before); // doesn't happen, but keep safe

    // update is called once
    prisma.client.update.mockResolvedValue(updated);

    const meta: RequestMeta = {
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      requestId: 'req-1',
    };

    await service.updateActiveTaxSettings(
      clientId,
      {
        taxDisplayMode: 'TTC',
        taxInputMode: 'TTC',
        defaultTaxRate: '20',
      } as any,
      { actorUserId: 'user-1', meta },
    );

    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: clientId },
      data: expect.objectContaining({
        taxDisplayMode: 'TTC',
        taxInputMode: 'TTC',
        defaultTaxRate: expect.any(Object),
      }),
      select: {
        taxDisplayMode: true,
        taxInputMode: true,
        defaultTaxRate: true,
      },
    });

    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining<CreateAuditLogInput>({
        clientId,
        userId: 'user-1',
        action: 'client.tax-settings.updated',
        resourceType: 'client',
        resourceId: clientId,
        newValue: expect.objectContaining({
          taxDisplayMode: 'TTC',
          taxInputMode: 'TTC',
          defaultTaxRate: 20,
        }),
      }),
    );
  });
});

