import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ClientScopedRisksService } from './client-scoped-risks.service';
import { ProjectsService } from './projects.service';
import { RiskTaxonomyService } from '../risk-taxonomy/risk-taxonomy.service';

describe('ClientScopedRisksService — codes R-xxx', () => {
  let service: ClientScopedRisksService;
  let prisma: { projectRisk: { findMany: jest.Mock } };

  beforeEach(() => {
    prisma = {
      projectRisk: {
        findMany: jest.fn(),
      },
    };
    service = new ClientScopedRisksService(
      prisma as never,
      {} as unknown as AuditLogsService,
      {} as unknown as ProjectsService,
      {} as unknown as RiskTaxonomyService,
    );
  });

  it('nextRiskCode(null) : séquence par client (risques hors projet)', async () => {
    prisma.projectRisk.findMany.mockResolvedValue([{ code: 'R-001' }, { code: 'R-003' }]);
    const code = await service.nextRiskCode('c1', null);
    expect(code).toBe('R-004');
    expect(prisma.projectRisk.findMany).toHaveBeenCalledWith({
      where: { clientId: 'c1', projectId: null },
      select: { code: true },
    });
  });

  it('nextRiskCode(projectId) : séquence par projet', async () => {
    prisma.projectRisk.findMany.mockResolvedValue([{ code: 'R-001' }]);
    const code = await service.nextRiskCode('c1', 'p1');
    expect(code).toBe('R-002');
    expect(prisma.projectRisk.findMany).toHaveBeenCalledWith({
      where: { clientId: 'c1', projectId: 'p1' },
      select: { code: true },
    });
  });
});
