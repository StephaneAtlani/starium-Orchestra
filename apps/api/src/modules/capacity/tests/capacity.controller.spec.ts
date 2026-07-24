import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRE_PERMISSIONS_KEY } from '../../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CapacityController } from '../capacity.controller';

describe('CapacityController — guards & permissions (RFC-CAPA-001)', () => {
  it('chaîne JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, CapacityController) as unknown[];
    expect(guards).toEqual([
      JwtAuthGuard,
      ActiveClientGuard,
      ModuleAccessGuard,
      PermissionsGuard,
    ]);
  });

  it('capacity.read sur listMonthly et dashboards', () => {
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, CapacityController.prototype.listMonthly),
    ).toEqual(['capacity.read']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        CapacityController.prototype.dashboardResources,
      ),
    ).toEqual(['capacity.read']);
  });

  it('capacity.settings.manage sur put/generate monthly', () => {
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, CapacityController.prototype.putMonthly),
    ).toEqual(['capacity.settings.manage']);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSIONS_KEY,
        CapacityController.prototype.generateMonthly,
      ),
    ).toEqual(['capacity.settings.manage']);
  });

  it('capacity.members.manage sur put member / primary work team', () => {
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, CapacityController.prototype.putMemberMonthly),
    ).toEqual(['capacity.members.manage']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, CapacityController.prototype.patchPrimary),
    ).toEqual(['capacity.members.manage']);
  });

  it('capacity.allocations.manage sur create/update/delete', () => {
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, CapacityController.prototype.createAllocation),
    ).toEqual(['capacity.allocations.manage']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, CapacityController.prototype.updateAllocation),
    ).toEqual(['capacity.allocations.manage']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, CapacityController.prototype.deleteAllocation),
    ).toEqual(['capacity.allocations.manage']);
  });
});
