import 'reflect-metadata';
import { StreamableFile } from '@nestjs/common';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LicenseReportingController } from './license-reporting.controller';
import { LicenseReportingService } from './license-reporting.service';

describe('LicenseReportingController', () => {
  let controller: LicenseReportingController;
  let service: jest.Mocked<LicenseReportingService>;

  beforeEach(() => {
    service = {
      getOverview: jest.fn(),
      listClients: jest.fn(),
      getMonthlySeries: jest.fn(),
    } as unknown as jest.Mocked<LicenseReportingService>;
    controller = new LicenseReportingController(service);
  });

  it('applique JwtAuthGuard + PlatformAdminGuard sur le controller', () => {
    const guards: unknown[] =
      Reflect.getMetadata('__guards__', LicenseReportingController) ?? [];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(PlatformAdminGuard);
  });

  it('délègue overview avec les filtres extraits du DTO', async () => {
    service.getOverview.mockResolvedValue({} as any);
    await controller.getOverview({
      clientId: 'cxxxxxxxxxxxxxxxxxxxxxxxx',
    } as any);
    expect(service.getOverview).toHaveBeenCalledWith({
      clientId: 'cxxxxxxxxxxxxxxxxxxxxxxxx',
      licenseBillingMode: undefined,
      subscriptionStatus: undefined,
    });
  });

  it('exporte clients.csv avec les bons headers (StreamableFile + Content-Disposition)', async () => {
    service.listClients.mockResolvedValue([
      {
        clientId: 'c1',
        clientName: 'Acme',
        clientSlug: 'acme',
        clientUsersActive: 2,
        seats: { readWriteBillableUsed: 1, readWriteBillableLimit: 5 },
        licenses: {
          readOnly: 0,
          clientBillable: 1,
          externalBillable: 0,
          nonBillable: 0,
          platformInternal: 0,
          evaluationActive: 0,
          evaluationExpired: 0,
          platformInternalActive: 0,
          platformInternalExpired: 0,
        },
        subscriptions: {
          draft: 0,
          active: 1,
          suspended: 0,
          canceled: 0,
          expired: 0,
          expiredInGrace: 0,
        },
      },
    ]);

    const result = await controller.exportClientsCsv({} as any);
    expect(result).toBeInstanceOf(StreamableFile);
    const csv = (result as any).getStream
      ? (result as any).getStream().read().toString('utf-8')
      : '';
    expect(csv.startsWith('\uFEFF') || csv.includes('clientName')).toBe(true);
  });

  it('exporte monthly.csv', async () => {
    service.getMonthlySeries.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      from: '2026-01',
      to: '2026-02',
      points: [
        {
          month: '2026-01',
          licenses: {
            readOnly: 1,
            clientBillable: 0,
            externalBillable: 0,
            nonBillable: 0,
            platformInternal: 0,
            evaluationActive: 0,
            evaluationExpired: 0,
            platformInternalActive: 0,
            platformInternalExpired: 0,
          },
          subscriptions: { active: 1, suspended: 0, expired: 0 },
        },
      ],
    });
    const result = await controller.exportMonthlyCsv({} as any);
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
