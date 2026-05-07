import 'reflect-metadata';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessDiagnosticsController } from './access-diagnostics.controller';
import { AccessDiagnosticsService } from './access-diagnostics.service';

describe('AccessDiagnosticsController', () => {
  let controller: AccessDiagnosticsController;
  let service: jest.Mocked<AccessDiagnosticsService>;

  beforeEach(() => {
    service = {
      computeEffectiveRights: jest.fn(),
    } as unknown as jest.Mocked<AccessDiagnosticsService>;
    controller = new AccessDiagnosticsController(service);
  });

  it('applique JwtAuthGuard + ActiveClientGuard + ClientAdminGuard', () => {
    const guards: unknown[] =
      Reflect.getMetadata('__guards__', AccessDiagnosticsController) ?? [];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(ActiveClientGuard);
    expect(guards).toContain(ClientAdminGuard);
  });

  it('délègue au service avec le client actif (pas de clientId libre)', async () => {
    service.computeEffectiveRights.mockResolvedValue({
      licenseCheck: { status: 'pass', reasonCode: null, message: 'ok' },
      subscriptionCheck: { status: 'not_applicable', reasonCode: null, message: 'na' },
      moduleActivationCheck: { status: 'pass', reasonCode: null, message: 'ok' },
      moduleVisibilityCheck: { status: 'pass', reasonCode: null, message: 'ok' },
      rbacCheck: { status: 'pass', reasonCode: null, message: 'ok' },
      aclCheck: { status: 'pass', reasonCode: null, message: 'ok' },
      finalDecision: 'allowed',
      denialReasons: [],
      computedAt: new Date().toISOString(),
    });

    await controller.getEffectiveRights('client-active', {
      userId: 'user-1',
      resourceId: 'resource-1',
      resourceType: 'PROJECT',
      operation: 'read',
    } as any);

    expect(service.computeEffectiveRights).toHaveBeenCalledWith({
      clientId: 'client-active',
      userId: 'user-1',
      resourceType: 'PROJECT',
      resourceId: 'resource-1',
      operation: 'read',
    });
  });
});
