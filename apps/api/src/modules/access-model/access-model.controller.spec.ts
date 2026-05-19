import 'reflect-metadata';
import { StreamableFile } from '@nestjs/common';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessModelController } from './access-model.controller';
import { AccessModelService } from './access-model.service';

describe('AccessModelController', () => {
  let controller: AccessModelController;
  let service: jest.Mocked<AccessModelService>;

  beforeEach(() => {
    service = {
      getHealth: jest.fn(),
      listIssues: jest.fn(),
      exportIssuesCsv: jest.fn(),
    } as unknown as jest.Mocked<AccessModelService>;
    controller = new AccessModelController(service);
  });

  it('applique JwtAuthGuard + ActiveClientGuard + PlatformAdminGuard (sans ModuleAccessGuard)', () => {
    const guards: unknown[] =
      Reflect.getMetadata('__guards__', AccessModelController) ?? [];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(ActiveClientGuard);
    expect(guards).toContain(PlatformAdminGuard);
    expect(guards).not.toContain(ModuleAccessGuard);
  });

  it('délègue getHealth au service avec client actif', async () => {
    service.getHealth.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      rollout: [],
      checklist: [],
      kpis: {
        resourcesMissingOwner: { total: 0, byModule: {} },
        membersMissingHumanWithScopedPerms: { total: 0 },
        atypicalAclShares: { total: 0 },
        policyReviewHints: { total: 0 },
      },
    });
    const req = { user: { userId: 'u1' } } as any;
    await controller.getHealth('client-1', req);
    expect(service.getHealth).toHaveBeenCalledWith('client-1', req);
  });

  it('exportIssues pose Content-Type et Content-Disposition dynamiques', async () => {
    const buffer = Buffer.from('\uFEFFcategory,module\n', 'utf-8');
    service.exportIssuesCsv.mockResolvedValue({
      buffer,
      filename: 'access-model-issues-acme-2026-05-18.csv',
      rowCount: 1,
    });
    const req = { user: { userId: 'u1' }, headers: {} } as any;
    const res = {
      setHeader: jest.fn(),
    } as any;
    const file = await controller.exportIssues(
      'client-1',
      { category: 'missing_owner' } as any,
      req,
      res,
    );
    expect(file).toBeInstanceOf(StreamableFile);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="access-model-issues-acme-2026-05-18.csv"',
    );
  });
});
