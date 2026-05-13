import 'reflect-metadata';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ClientAdminGuard } from '../../common/guards/client-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessDiagnosticsSelfController } from './access-diagnostics-self.controller';
import { AccessDiagnosticsService } from './access-diagnostics.service';

describe('AccessDiagnosticsSelfController', () => {
  let controller: AccessDiagnosticsSelfController;
  let service: jest.Mocked<AccessDiagnosticsService>;

  beforeEach(() => {
    service = {
      computeMyEffectiveRights: jest.fn(),
    } as unknown as jest.Mocked<AccessDiagnosticsService>;
    controller = new AccessDiagnosticsSelfController(service);
  });

  it('JwtAuthGuard + ActiveClientGuard (sans ClientAdminGuard)', () => {
    const guards: unknown[] =
      Reflect.getMetadata('__guards__', AccessDiagnosticsSelfController) ?? [];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(ActiveClientGuard);
    expect(guards).not.toContain(ClientAdminGuard);
  });

  it('délègue computeMyEffectiveRights avec userId JWT (pas de userId query)', async () => {
    service.computeMyEffectiveRights.mockResolvedValue({
      finalDecision: 'ALLOWED',
      reasonCode: null,
      resourceLabel: 'X',
      controls: [],
      safeMessage: 'ok',
      computedAt: new Date().toISOString(),
    });
    const query = {
      intent: 'READ',
      resourceType: 'PROJECT',
      resourceId: 'caaaaaaaaaaaaaaaaaaaaaaaaa',
    } as any;
    await controller.getMyEffectiveRights('client-1', 'user-1', query, {} as any, {} as any);
    expect(service.computeMyEffectiveRights).toHaveBeenCalledWith({
      clientId: 'client-1',
      userId: 'user-1',
      query,
      meta: {},
      httpRequest: {},
    });
  });
});
