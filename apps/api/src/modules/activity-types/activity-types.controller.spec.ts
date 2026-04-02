import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator';
import { ActiveClientGuard } from '../../common/guards/active-client.guard';
import { ModuleAccessGuard } from '../../common/guards/module-access.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivityTypesController } from './activity-types.controller';
import { ActivityTypesService } from './activity-types.service';

const passGuard = { canActivate: () => true };

describe('ActivityTypesController', () => {
  const service = {
    list: jest.fn(),
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
  };

  beforeEach(async () => {
    await Test.createTestingModule({
      controllers: [ActivityTypesController],
      providers: [{ provide: ActivityTypesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(passGuard)
      .overrideGuard(ActiveClientGuard)
      .useValue(passGuard)
      .overrideGuard(ModuleAccessGuard)
      .useValue(passGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(passGuard)
      .compile();
    jest.clearAllMocks();
  });

  it('permissions activity_types.* par route', () => {
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, ActivityTypesController.prototype.list),
    ).toEqual(['activity_types.read']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, ActivityTypesController.prototype.create),
    ).toEqual(['activity_types.manage']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, ActivityTypesController.prototype.getById),
    ).toEqual(['activity_types.read']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, ActivityTypesController.prototype.update),
    ).toEqual(['activity_types.manage']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, ActivityTypesController.prototype.archive),
    ).toEqual(['activity_types.manage']);
    expect(
      Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, ActivityTypesController.prototype.restore),
    ).toEqual(['activity_types.manage']);
  });
});
