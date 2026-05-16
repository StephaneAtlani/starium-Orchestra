import 'reflect-metadata';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
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
    } as unknown as jest.Mocked<AccessModelService>;
    controller = new AccessModelController(service);
  });

  it('applique JwtAuthGuard + ActiveClientGuard + PermissionsGuard (sans ModuleAccessGuard)', () => {
    const guards: unknown[] =
      Reflect.getMetadata('__guards__', AccessModelController) ?? [];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(ActiveClientGuard);
    expect(guards).toContain(PermissionsGuard);
    expect(guards).not.toContain(ModuleAccessGuard);
  });

  it('délègue getHealth au service avec client actif', async () => {
    service.getHealth.mockResolvedValue({
      generatedAt: new Date().toISOString(),
      rollout: [],
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
});
