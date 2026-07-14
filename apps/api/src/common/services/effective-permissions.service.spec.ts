import {
  BASELINE_PERMISSION_CODES,
  EffectivePermissionsService,
} from './effective-permissions.service';

describe('EffectivePermissionsService', () => {
  function buildService(rolePermissionCodes: string[]) {
    const prisma = {
      userRole: {
        findMany: jest.fn().mockResolvedValue([
          {
            role: {
              rolePermissions: rolePermissionCodes.map((code) => ({
                permission: { code },
              })),
            },
          },
        ]),
      },
    } as any;
    return new EffectivePermissionsService(prisma);
  }

  it('ajoute le socle notifications/alertes même sans rôle correspondant', async () => {
    const service = buildService(['projects.read']);

    const codes = await service.resolvePermissionCodesForRequest({
      userId: 'u1',
      clientId: 'c1',
    });

    for (const baseline of BASELINE_PERMISSION_CODES) {
      expect(codes.has(baseline)).toBe(true);
    }
    expect(codes.has('projects.read')).toBe(true);
  });

  it('garantit le socle pour un utilisateur sans aucune permission de rôle', async () => {
    const service = buildService([]);

    const codes = await service.resolvePermissionCodesForRequest({
      userId: 'u2',
      clientId: 'c1',
    });

    expect(codes.has('notifications.read')).toBe(true);
    expect(codes.has('notifications.update')).toBe(true);
    expect(codes.has('alerts.read')).toBe(true);
    // action réservée aux rôles : ne doit pas être injectée par le socle
    expect(codes.has('alerts.update')).toBe(false);
  });
});
