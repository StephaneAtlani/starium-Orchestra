import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ModuleVisibilityScopeType, ModuleVisibilityState } from '@prisma/client';
import { ModuleVisibilityService } from './module-visibility.service';

describe('ModuleVisibilityService', () => {
  const clientId = 'client-a';
  const userId = 'user-1';
  const groupId = 'group-1';

  let service: ModuleVisibilityService;
  let prisma: any;
  let auditLogs: { create: jest.Mock };

  beforeEach(() => {
    auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      clientModuleVisibility: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      accessGroupMember: {
        findMany: jest.fn(),
      },
      accessGroup: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      clientUser: {
        findFirst: jest.fn(),
      },
      clientModule: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };
    service = new ModuleVisibilityService(prisma, auditLogs as any);
  });

  describe('computeVisibilityForModule', () => {
    it('USER HIDDEN prime sur group VISIBLE et client VISIBLE', () => {
      const rows = [
        {
          moduleCode: 'budgets',
          scopeType: ModuleVisibilityScopeType.USER,
          scopeId: userId,
          visibility: ModuleVisibilityState.HIDDEN,
        },
        {
          moduleCode: 'budgets',
          scopeType: ModuleVisibilityScopeType.GROUP,
          scopeId: groupId,
          visibility: ModuleVisibilityState.VISIBLE,
        },
        {
          moduleCode: 'budgets',
          scopeType: ModuleVisibilityScopeType.CLIENT,
          scopeId: null,
          visibility: ModuleVisibilityState.VISIBLE,
        },
      ];
      const v = service.computeVisibilityForModule(
        'budgets',
        userId,
        rows,
        new Set([groupId]),
      );
      expect(v).toBe(false);
    });

    it('USER VISIBLE prime sur group HIDDEN et client HIDDEN', () => {
      const rows = [
        {
          moduleCode: 'budgets',
          scopeType: ModuleVisibilityScopeType.USER,
          scopeId: userId,
          visibility: ModuleVisibilityState.VISIBLE,
        },
        {
          moduleCode: 'budgets',
          scopeType: ModuleVisibilityScopeType.GROUP,
          scopeId: groupId,
          visibility: ModuleVisibilityState.HIDDEN,
        },
        {
          moduleCode: 'budgets',
          scopeType: ModuleVisibilityScopeType.CLIENT,
          scopeId: null,
          visibility: ModuleVisibilityState.HIDDEN,
        },
      ];
      const v = service.computeVisibilityForModule(
        'budgets',
        userId,
        rows,
        new Set([groupId]),
      );
      expect(v).toBe(true);
    });

    it('GROUP : VISIBLE l’emporte sur HIDDEN', () => {
      const rows = [
        {
          moduleCode: 'budgets',
          scopeType: ModuleVisibilityScopeType.GROUP,
          scopeId: 'g1',
          visibility: ModuleVisibilityState.HIDDEN,
        },
        {
          moduleCode: 'budgets',
          scopeType: ModuleVisibilityScopeType.GROUP,
          scopeId: 'g2',
          visibility: ModuleVisibilityState.VISIBLE,
        },
      ];
      const v = service.computeVisibilityForModule(
        'budgets',
        userId,
        rows,
        new Set(['g1', 'g2']),
      );
      expect(v).toBe(true);
    });

    it('GROUP HIDDEN seul => masqué', () => {
      const rows = [
        {
          moduleCode: 'budgets',
          scopeType: ModuleVisibilityScopeType.GROUP,
          scopeId: groupId,
          visibility: ModuleVisibilityState.HIDDEN,
        },
      ];
      const v = service.computeVisibilityForModule(
        'budgets',
        userId,
        rows,
        new Set([groupId]),
      );
      expect(v).toBe(false);
    });

    it('CLIENT HIDDEN sans override user/group => masqué', () => {
      const rows = [
        {
          moduleCode: 'budgets',
          scopeType: ModuleVisibilityScopeType.CLIENT,
          scopeId: null,
          visibility: ModuleVisibilityState.HIDDEN,
        },
      ];
      const v = service.computeVisibilityForModule(
        'budgets',
        userId,
        rows,
        new Set(),
      );
      expect(v).toBe(false);
    });

    it('aucune ligne => visible', () => {
      const v = service.computeVisibilityForModule(
        'budgets',
        userId,
        [],
        new Set(),
      );
      expect(v).toBe(true);
    });
  });

  describe('getVisibilityMap', () => {
    it('agrège les lignes et membres de groupes', async () => {
      prisma.clientModuleVisibility.findMany.mockResolvedValue([
        {
          moduleCode: 'budgets',
          scopeType: ModuleVisibilityScopeType.CLIENT,
          scopeId: null,
          visibility: ModuleVisibilityState.HIDDEN,
        },
      ]);
      prisma.accessGroupMember.findMany.mockResolvedValue([]);
      const map = await service.getVisibilityMap(userId, clientId, [
        'budgets',
      ]);
      expect(map.get('budgets')).toBe(false);
    });
  });

  describe('setOverride', () => {
    beforeEach(() => {
      prisma.clientModule.findFirst.mockResolvedValue({ id: 'cm-1' });
    });

    it('GROUP hors client => BadRequest', async () => {
      prisma.accessGroup.findFirst.mockResolvedValue(null);
      await expect(
        service.setOverride(clientId, {
          moduleCode: 'budgets',
          scopeType: ModuleVisibilityScopeType.GROUP,
          scopeId: 'x',
          visibility: ModuleVisibilityState.HIDDEN,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('USER sans ClientUser ACTIVE => BadRequest', async () => {
      prisma.accessGroup.findFirst.mockResolvedValue({ id: groupId });
      prisma.clientUser.findFirst.mockResolvedValue(null);
      await expect(
        service.setOverride(clientId, {
          moduleCode: 'budgets',
          scopeType: ModuleVisibilityScopeType.USER,
          scopeId: userId,
          visibility: ModuleVisibilityState.HIDDEN,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('upsert CLIENT : create puis audit', async () => {
      prisma.clientModuleVisibility.findFirst.mockResolvedValue(null);
      prisma.clientModuleVisibility.create.mockResolvedValue({
        id: 'row-1',
      });
      await service.setOverride(
        clientId,
        {
          moduleCode: 'budgets',
          scopeType: ModuleVisibilityScopeType.CLIENT,
          visibility: ModuleVisibilityState.HIDDEN,
        },
        { actorUserId: 'admin-1' },
      );
      expect(prisma.clientModuleVisibility.create).toHaveBeenCalled();
      expect(auditLogs.create).toHaveBeenCalled();
    });
  });

  describe('removeOverride', () => {
    it('lève NotFound si absent', async () => {
      prisma.clientModuleVisibility.findFirst.mockResolvedValue(null);
      await expect(
        service.removeOverride(
          clientId,
          'budgets',
          ModuleVisibilityScopeType.CLIENT,
          undefined,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
