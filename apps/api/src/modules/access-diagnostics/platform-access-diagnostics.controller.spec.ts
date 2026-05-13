import { Test, TestingModule } from '@nestjs/testing';
import 'reflect-metadata';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessDiagnosticsService } from './access-diagnostics.service';
import { PlatformAccessDiagnosticsController } from './platform-access-diagnostics.controller';

describe('PlatformAccessDiagnosticsController', () => {
  let controller: PlatformAccessDiagnosticsController;
  let service: jest.Mocked<AccessDiagnosticsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformAccessDiagnosticsController],
      providers: [
        {
          provide: AccessDiagnosticsService,
          useValue: { computeEffectiveRights: jest.fn() },
        },
        { provide: JwtAuthGuard, useValue: { canActivate: jest.fn(() => true) } },
        { provide: PlatformAdminGuard, useValue: { canActivate: jest.fn(() => true) } },
      ],
    }).compile();

    controller = module.get(PlatformAccessDiagnosticsController);
    service = module.get(AccessDiagnosticsService) as jest.Mocked<AccessDiagnosticsService>;
  });

  it('applique JwtAuthGuard + PlatformAdminGuard (sans ActiveClientGuard)', () => {
    const guards: unknown[] =
      Reflect.getMetadata('__guards__', PlatformAccessDiagnosticsController) ?? [];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(PlatformAdminGuard);
    const names = guards
      .map((g) => (typeof g === 'function' ? g.name : ''))
      .filter(Boolean);
    expect(names).not.toContain('ActiveClientGuard');
  });

  it('impose le clientId de route pour le diagnostic plateforme', async () => {
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

    await controller.getEffectiveRights('client-route', {
      userId: 'user-1',
      resourceId: 'resource-1',
      resourceType: 'PROJECT',
      operation: 'read',
    } as any, {} as any);

    expect(service.computeEffectiveRights).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-route',
        userId: 'user-1',
        resourceType: 'PROJECT',
        httpRequest: {},
      }),
    );
  });
});
