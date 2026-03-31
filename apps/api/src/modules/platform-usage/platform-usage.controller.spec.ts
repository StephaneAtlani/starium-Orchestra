import { Test } from '@nestjs/testing';
import { PlatformUsageController } from './platform-usage.controller';
import { PlatformUsageService } from './platform-usage.service';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';

describe('PlatformUsageController', () => {
  it('should delegate GET to PlatformUsageService.getOverview', async () => {
    const overview = {
      generatedAt: '2026-01-01T00:00:00.000Z',
      sessions: {
        distinctUsersWithActiveRefresh: 0,
        activeRefreshTokens: 0,
      },
      series: {
        daily: [] as {
          date: string;
          auditLogs: number;
          securityLogs: number;
          newUsers: number;
          authLogins: number;
          authRefreshes: number;
          authDistinctUsers: number;
          authDistinctClients: number;
        }[],
      },
      totals: {
        clients: 0,
        users: 0,
        platformAdmins: 0,
        clientMembershipsActive: 0,
        projects: 0,
        actionPlans: 0,
        budgets: 0,
        budgetLines: 0,
        suppliers: 0,
        purchaseOrders: 0,
        complianceFrameworks: 0,
        resources: 0,
        collaborators: 0,
      },
      activity: { auditLogsLast7Days: 0, securityLogsLast7Days: 0 },
      integrations: { microsoftConnections: 0, directoryConnections: 0 },
    };
    const service = { getOverview: jest.fn().mockResolvedValue(overview) };
    const moduleRef = await Test.createTestingModule({
      controllers: [PlatformUsageController],
      providers: [
        { provide: PlatformUsageService, useValue: service },
        { provide: PlatformAdminGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();

    const controller = moduleRef.get(PlatformUsageController);
    await expect(controller.getOverview()).resolves.toEqual(overview);
    expect(service.getOverview).toHaveBeenCalled();
  });
});
